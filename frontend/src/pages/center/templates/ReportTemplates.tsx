import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, FileText, X, Save, Upload, FileDown, Loader2 } from 'lucide-react'
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

const MODALITIES = ['CT', 'MRI', 'XRAY', 'USG', 'PET', 'MAMMOGRAPHY']

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

export default function ReportTemplates() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Template | null>(null)
  const [form, setForm]           = useState(emptyForm)

  // Per-template docx upload: tracks which template's upload is in flight
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

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({
      templateName:             t.templateName,
      studyDescription:         t.studyDescription ?? '',
      modality:                 t.modality ?? '',
      clinicalHistoryTemplate:  t.clinicalHistoryTemplate ?? '',
      findingsTemplate:         t.findingsTemplate ?? '',
      impressionTemplate:       t.impressionTemplate ?? '',
      conclusionTemplate:       t.conclusionTemplate ?? '',
      recommendationsTemplate:  t.recommendationsTemplate ?? '',
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm) }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Templates auto-fill the report editor. Attach a Word (.docx) format for custom branding.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

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
            Create templates for CT Brain, MRI Spine, X-Ray Chest etc. You can also attach a
            Word (.docx) report format so doctors can download a branded layout.
          </p>
          <button onClick={openNew} className="btn-primary mt-5 mx-auto">
            <Plus className="w-4 h-4" /> Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">

                  {/* Title row */}
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

                  {/* Text preview */}
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

                  {/* Word format actions */}
                  <div className="mt-3 flex items-center gap-2">
                    {/* Hidden file input per template */}
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

                {/* Edit / Delete */}
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

      {/* Create / Edit Modal */}
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
    </div>
  )
}
