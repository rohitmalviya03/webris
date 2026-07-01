import { useRef, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit2, Trash2, FileText, X, Save, Upload,
  FileDown, Loader2, ClipboardPaste, CheckCircle, Circle,
  Sparkles, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import Modal from '../../../components/common/Modal'

interface Template {
  id: number
  templateName: string
  studyDescription: string | null
  modality: string | null
  clinicalHistoryTemplate: string | null
  findingsTemplate: string | null
  impressionTemplate: string | null
  conclusionTemplate: string | null
  recommendationsTemplate: string | null
  docxTemplateUrl: string | null
  isActive: boolean
}

const MODALITIES = ['CT', 'MRI', 'XRAY', 'USG', 'PET', 'MAMMOGRAPHY', 'FLUOROSCOPY']

const emptyForm = {
  templateName: '',
  studyDescription: '',
  modality: '',
  clinicalHistoryTemplate: '',
  findingsTemplate: '',
  impressionTemplate: '',
  conclusionTemplate: '',
  recommendationsTemplate: '',
}

// ─── Parser ──────────────────────────────────────────────────────────────────

interface ParsedSections {
  clinicalHistoryTemplate: string
  findingsTemplate: string
  impressionTemplate: string
  conclusionTemplate: string
  recommendationsTemplate: string
}

const SECTION_PATTERNS: Array<{ field: keyof ParsedSections; patterns: RegExp[] }> = [
  {
    field: 'clinicalHistoryTemplate',
    patterns: [
      /^(?:clinical\s+)?(?:history|indication|clinical\s+indication|referral\s+reason)\s*[:\-–]/im,
    ],
  },
  {
    field: 'findingsTemplate',
    patterns: [
      /^(?:findings|observations?|technique\s+(?:and\s+)?findings?|scan\s+findings?|report|details?)\s*[:\-–]/im,
    ],
  },
  {
    field: 'impressionTemplate',
    patterns: [
      /^(?:impression|opinion|(?:radio(?:logical)?|final|overall)\s+impression|diagnosis|interpretation|assessment)\s*[:\-–]/im,
    ],
  },
  {
    field: 'conclusionTemplate',
    patterns: [
      /^(?:conclusion|summary|final\s+(?:conclusion|diagnosis))\s*[:\-–]/im,
    ],
  },
  {
    field: 'recommendationsTemplate',
    patterns: [
      /^(?:recommendation|advice|suggest(?:ion)?s?|follow[\s\-]?up|correlate)\s*[:\-–]/im,
    ],
  },
]

function detectModality(text: string): string {
  const t = text.toUpperCase()
  if (/\bMRI\b|MAGNETIC RESONANCE|M\.R\.I\./.test(t)) return 'MRI'
  if (/\bCT\b|C\.T\.|COMPUTED TOMOGRAPHY/.test(t)) return 'CT'
  if (/\bUSG\b|ULTRASOUND|SONOGRAPH|DOPPLER/.test(t)) return 'USG'
  if (/X[\s\-]?RAY|\bXRAY\b|\bCXR\b/.test(t)) return 'XRAY'
  if (/\bPET\b/.test(t)) return 'PET'
  if (/MAMMOGRAPH/.test(t)) return 'MAMMOGRAPHY'
  if (/FLUOROSCOP/.test(t)) return 'FLUOROSCOPY'
  return ''
}

function detectStudyDescription(text: string, modality: string): string {
  // Try lines that look like "STUDY: CT Brain" or "EXAMINATION: MRI Spine"
  const examMatch = text.match(
    /^(?:study|examination|scan|procedure|modality|test)\s*[:\-–]\s*(.+)/im
  )
  if (examMatch) return examMatch[1].trim()

  // Fallback: first non-blank, non-header line that mentions modality keyword
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (modality) {
    const modalityLine = lines.find((l) =>
      l.toUpperCase().includes(modality) && l.length < 80
    )
    if (modalityLine) return modalityLine.replace(/^[:\-–\s]+/, '')
  }
  return ''
}

function parseWordText(rawText: string): { sections: ParsedSections; detectedFields: Set<keyof ParsedSections> } {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  type Match = { field: keyof ParsedSections; matchStart: number; contentStart: number }
  const matches: Match[] = []

  for (const { field, patterns } of SECTION_PATTERNS) {
    for (const pat of patterns) {
      // reset lastIndex for global patterns
      const m = pat.exec(text)
      if (m) {
        matches.push({ field, matchStart: m.index, contentStart: m.index + m[0].length })
        break
      }
    }
  }

  matches.sort((a, b) => a.matchStart - b.matchStart)

  const sections: ParsedSections = {
    clinicalHistoryTemplate: '',
    findingsTemplate: '',
    impressionTemplate: '',
    conclusionTemplate: '',
    recommendationsTemplate: '',
  }
  const detectedFields = new Set<keyof ParsedSections>()

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i]
    const end = i + 1 < matches.length ? matches[i + 1].matchStart : text.length
    const content = text.slice(curr.contentStart, end).trim()
    if (content) {
      sections[curr.field] = content
      detectedFields.add(curr.field)
    }
  }

  return { sections, detectedFields }
}

// ─── Section meta for the detection pill list ────────────────────────────────

const SECTION_META: Array<{ field: keyof ParsedSections; label: string }> = [
  { field: 'clinicalHistoryTemplate', label: 'Clinical History' },
  { field: 'findingsTemplate',        label: 'Findings' },
  { field: 'impressionTemplate',      label: 'Impression' },
  { field: 'conclusionTemplate',      label: 'Conclusion' },
  { field: 'recommendationsTemplate', label: 'Recommendations' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportTemplates() {
  const qc = useQueryClient()

  // Regular form modal
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Template | null>(null)
  const [form, setForm]             = useState(emptyForm)

  // Paste-from-Word modal
  const [pasteOpen, setPasteOpen]   = useState(false)
  const [pasteText, setPasteText]   = useState('')
  const [pasteName, setPasteName]   = useState('')
  const [parsedSections, setParsedSections] = useState<ParsedSections>({
    clinicalHistoryTemplate: '', findingsTemplate: '',
    impressionTemplate: '', conclusionTemplate: '', recommendationsTemplate: '',
  })
  const [detectedFields, setDetectedFields] = useState<Set<keyof ParsedSections>>(new Set())
  const [autoModality, setAutoModality]     = useState('')
  const [autoStudyDesc, setAutoStudyDesc]   = useState('')

  // Per-template docx upload
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      editing
        ? api.put(`/templates/${editing.id}`, data)
        : api.post('/templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success(editing ? 'Template updated' : 'Template created')
      closeModal()
    },
    onError: () => toast.error('Save failed'),
  })

  const pasteSaveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post('/templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template created from pasted report')
      closePasteModal()
    },
    onError: () => toast.error('Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
    },
  })

  const handleDocxUpload = async (templateId: number, file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Only .docx files are accepted')
      return
    }
    setUploadingId(templateId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/templates/${templateId}/upload-docx`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Word format uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  // ── Regular modal helpers ────────────────────────────────────────────────
  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({
      templateName:            t.templateName,
      studyDescription:        t.studyDescription ?? '',
      modality:                t.modality ?? '',
      clinicalHistoryTemplate: t.clinicalHistoryTemplate ?? '',
      findingsTemplate:        t.findingsTemplate ?? '',
      impressionTemplate:      t.impressionTemplate ?? '',
      conclusionTemplate:      t.conclusionTemplate ?? '',
      recommendationsTemplate: t.recommendationsTemplate ?? '',
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm) }
  const field = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  // ── Paste modal helpers ──────────────────────────────────────────────────
  const closePasteModal = () => {
    setPasteOpen(false)
    setPasteText('')
    setPasteName('')
    setParsedSections({
      clinicalHistoryTemplate: '', findingsTemplate: '',
      impressionTemplate: '', conclusionTemplate: '', recommendationsTemplate: '',
    })
    setDetectedFields(new Set())
    setAutoModality('')
    setAutoStudyDesc('')
  }

  const handlePasteChange = useCallback((text: string) => {
    setPasteText(text)
    if (!text.trim()) {
      setDetectedFields(new Set())
      setParsedSections({
        clinicalHistoryTemplate: '', findingsTemplate: '',
        impressionTemplate: '', conclusionTemplate: '', recommendationsTemplate: '',
      })
      setAutoModality('')
      setAutoStudyDesc('')
      return
    }
    const { sections, detectedFields: df } = parseWordText(text)
    setParsedSections(sections)
    setDetectedFields(df)
    const mod = detectModality(text)
    setAutoModality(mod)
    setAutoStudyDesc(detectStudyDescription(text, mod))
  }, [])

  const handlePasteSave = () => {
    if (!pasteName.trim()) { toast.error('Please enter a template name'); return }
    if (detectedFields.size === 0) { toast.error('No sections detected — check the pasted text'); return }
    pasteSaveMutation.mutate({
      templateName:            pasteName.trim(),
      studyDescription:        autoStudyDesc,
      modality:                autoModality,
      ...parsedSections,
    })
  }

  // "Edit in form" — carry parsed data into the regular form modal
  const openEditFromPaste = () => {
    setEditing(null)
    setForm({
      templateName:            pasteName.trim(),
      studyDescription:        autoStudyDesc,
      modality:                autoModality,
      ...parsedSections,
    })
    closePasteModal()
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Templates auto-fill the report editor. Attach a Word (.docx) format for custom branding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPasteOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste from Word
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {/* Template cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-40 bg-gray-50" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 text-lg">No templates yet</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Create a template by filling in the form, or paste an existing Word report and we'll
            detect the sections automatically.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button onClick={() => setPasteOpen(true)} className="btn-secondary">
              <ClipboardPaste className="w-4 h-4" /> Paste from Word
            </button>
            <button onClick={openNew} className="btn-primary">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{t.templateName}</h3>
                    {t.modality && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                        {t.modality}
                      </span>
                    )}
                    {t.docxTemplateUrl && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        <FileDown className="w-3 h-3" /> Word format
                      </span>
                    )}
                  </div>

                  {t.studyDescription && (
                    <p className="text-sm text-gray-500 mt-1">
                      Matches: <span className="font-medium text-gray-700">"{t.studyDescription}"</span>
                    </p>
                  )}

                  <div className="mt-3 space-y-1">
                    {[
                      ['Findings',   t.findingsTemplate],
                      ['Impression', t.impressionTemplate],
                      ['Conclusion', t.conclusionTemplate],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label as string} className="text-xs text-gray-400 truncate">
                        <span className="font-medium text-gray-500">{label}:</span> {val}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="file"
                      accept=".docx"
                      className="hidden"
                      ref={el => { fileInputRefs.current[t.id] = el }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleDocxUpload(t.id, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[t.id]?.click()}
                      disabled={uploadingId === t.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {uploadingId === t.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />}
                      {t.docxTemplateUrl ? 'Replace Word Format' : 'Upload Word Format'}
                    </button>
                    {t.docxTemplateUrl && (
                      <a
                        href={t.docxTemplateUrl}
                        download
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id) }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Regular Create / Edit Modal ────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Template' : 'New Report Template'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input {...field('templateName')} className="input" placeholder="e.g. CT Brain Contrast" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Match Study Description</label>
              <input {...field('studyDescription')} className="input"
                placeholder="e.g. CT Brain (partial match)" />
              <p className="text-xs text-gray-400 mt-1">Leave blank to match by modality only</p>
            </div>
            <div>
              <label className="label">Match Modality (fallback)</label>
              <select {...field('modality')} className="input">
                <option value="">— Any —</option>
                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <hr />

          {[
            { key: 'clinicalHistoryTemplate',  label: 'Clinical History Template', rows: 2,
              placeholder: 'Pre-fill clinical history...' },
            { key: 'findingsTemplate',          label: 'Findings Template',        rows: 5,
              placeholder: 'e.g.\nBrain parenchyma: Normal\nVentricles: Normal size\n...' },
            { key: 'impressionTemplate',        label: 'Impression Template',      rows: 3,
              placeholder: 'e.g. No intracranial abnormality detected.' },
            { key: 'conclusionTemplate',        label: 'Conclusion Template',      rows: 2,
              placeholder: 'Optional conclusion...' },
            { key: 'recommendationsTemplate',   label: 'Recommendations Template', rows: 2,
              placeholder: 'Optional recommendations...' },
          ].map(({ key, label, rows, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <textarea
                {...field(key as keyof typeof emptyForm)}
                rows={rows}
                placeholder={placeholder}
                className="input resize-y font-mono text-sm"
              />
            </div>
          ))}

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            To attach a Word (.docx) layout file, save the template first — then use the
            "Upload Word Format" button on the template card.
          </p>

          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.templateName.trim() || saveMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update Template' : 'Save Template'}
            </button>
            <button onClick={closeModal} className="btn-secondary">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Paste-from-Word Modal ──────────────────────────────────────────── */}
      <Modal
        open={pasteOpen}
        onClose={closePasteModal}
        title="Create Template from Word Report"
        size="lg"
      >
        <div className="space-y-5">

          {/* Instruction banner */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              Open your existing Word report, select all text (<kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded text-xs">Ctrl+A</kbd>),
              copy it, then paste below. Sections like <strong>Findings</strong>, <strong>Impression</strong> etc.
              will be detected automatically.
            </span>
          </div>

          {/* Template name + auto-detected modality */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Template Name *</label>
              <input
                value={pasteName}
                onChange={e => setPasteName(e.target.value)}
                className="input"
                placeholder="e.g. CT Brain Plain"
              />
            </div>
            <div>
              <label className="label">
                Modality
                {autoModality && (
                  <span className="ml-2 text-xs font-normal text-green-600 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> auto-detected
                  </span>
                )}
              </label>
              <select
                value={autoModality}
                onChange={e => setAutoModality(e.target.value)}
                className="input"
              >
                <option value="">— Any —</option>
                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Paste area */}
          <div>
            <label className="label">Paste Report Text Here</label>
            <textarea
              value={pasteText}
              onChange={e => handlePasteChange(e.target.value)}
              rows={12}
              placeholder={`Paste your full Word report here...\n\nExample format:\n\nCLINICAL HISTORY: Patient presenting with headache...\n\nFINDINGS:\nBrain parenchyma appears normal...\n\nIMPRESSION:\nNo significant intracranial abnormality detected.`}
              className="input resize-y font-mono text-sm leading-relaxed"
            />
          </div>

          {/* Live detection result */}
          {pasteText.trim() && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Detected Sections
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  detectedFields.size > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {detectedFields.size} / {SECTION_META.length} found
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {SECTION_META.map(({ field: f, label }) => {
                  const detected = detectedFields.has(f)
                  const content  = parsedSections[f]
                  return (
                    <div key={f} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        {detected
                          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <Circle      className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        }
                        <span className={`text-sm font-medium ${detected ? 'text-gray-800' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                      {detected && content && (
                        <p className="ml-6 text-xs text-gray-500 line-clamp-2 font-mono leading-relaxed">
                          {content}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {detectedFields.size === 0 && (
                <div className="px-4 py-3 text-sm text-amber-700 bg-amber-50">
                  No sections detected. Make sure your report has headings like
                  <strong> FINDINGS:</strong>, <strong>IMPRESSION:</strong> etc.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={handlePasteSave}
              disabled={!pasteName.trim() || detectedFields.size === 0 || pasteSaveMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {pasteSaveMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {pasteSaveMutation.isPending ? 'Saving…' : 'Save as Template'}
            </button>

            {/* Let them review/edit in the form before saving */}
            {detectedFields.size > 0 && (
              <button
                onClick={openEditFromPaste}
                className="btn-secondary whitespace-nowrap"
                title="Review and edit before saving"
              >
                Edit First <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button onClick={closePasteModal} className="btn-secondary">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
