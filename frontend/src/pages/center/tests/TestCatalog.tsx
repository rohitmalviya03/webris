import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Plus, Edit2, Trash2, FlaskConical, X, Save, Search, Clock, IndianRupee,
  Stethoscope, Building2, Timer, Upload, Download, FileSpreadsheet,
  CheckCircle2, AlertCircle, Loader2, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import Modal from '../../../components/common/Modal'

interface Test {
  id: number
  testName: string
  shortName: string | null
  modality: string | null
  department: string | null
  price: number | null
  mrp: number | null
  durationMinutes: number | null
  reportTatHours: number | null
  preparationInstructions: string | null
  description: string | null
  isActive: boolean
}

const MODALITIES = ['CT', 'MRI', 'XRAY', 'USG', 'PET', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'NUCLEAR_MEDICINE']

const DEPARTMENTS = [
  'Neuroradiology', 'Musculoskeletal', 'Chest & Cardiac', 'Abdominal',
  'Vascular', 'Paediatric', 'Oncology', 'Interventional', 'General',
]

const emptyForm = {
  testName: '',
  shortName: '',
  modality: '',
  department: '',
  price: '',
  mrp: '',
  durationMinutes: '',
  reportTatHours: '',
  preparationInstructions: '',
  description: '',
}

const fmt = (n: number | null) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN')}` : null

// ─── Excel column map ─────────────────────────────────────────────────────────
// Maps header aliases (case-insensitive) → canonical field name
const COL_MAP: Record<string, string> = {
  'test name':               'testName',
  'testname':                'testName',
  'name':                    'testName',
  'short name':              'shortName',
  'shortname':               'shortName',
  'code':                    'shortName',
  'modality':                'modality',
  'department':              'department',
  'dept':                    'department',
  'price':                   'price',
  'rate':                    'price',
  'mrp':                     'mrp',
  'list price':              'mrp',
  'duration':                'durationMinutes',
  'duration (min)':          'durationMinutes',
  'duration minutes':        'durationMinutes',
  'durationminutes':         'durationMinutes',
  'scan duration':           'durationMinutes',
  'tat':                     'reportTatHours',
  'tat (hours)':             'reportTatHours',
  'report tat':              'reportTatHours',
  'report tat hours':        'reportTatHours',
  'reporttathours':          'reportTatHours',
  'description':             'description',
  'preparation':             'preparationInstructions',
  'prep instructions':       'preparationInstructions',
  'patient preparation':     'preparationInstructions',
  'preparationinstructions': 'preparationInstructions',
}

interface ImportRow {
  rowNum: number
  testName: string
  shortName: string
  modality: string
  department: string
  price: string
  mrp: string
  durationMinutes: string
  reportTatHours: string
  description: string
  preparationInstructions: string
  errors: string[]
  status: 'pending' | 'success' | 'error'
  statusMsg?: string
}

function validateRow(row: Omit<ImportRow, 'errors' | 'status' | 'statusMsg'>): string[] {
  const errs: string[] = []
  if (!row.testName?.trim()) errs.push('Test Name is required')
  if (row.modality && !MODALITIES.includes(row.modality.toUpperCase().replace(/-/g, '_'))) {
    errs.push(`Invalid modality "${row.modality}" — use CT/MRI/XRAY/USG/PET/MAMMOGRAPHY/FLUOROSCOPY/NUCLEAR_MEDICINE`)
  }
  if (row.price && isNaN(Number(row.price))) errs.push('Price must be a number')
  if (row.mrp   && isNaN(Number(row.mrp)))   errs.push('MRP must be a number')
  if (row.durationMinutes && isNaN(Number(row.durationMinutes))) errs.push('Duration must be a number')
  if (row.reportTatHours  && isNaN(Number(row.reportTatHours)))  errs.push('TAT must be a number')
  return errs
}

function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        if (raw.length === 0) { reject(new Error('Sheet is empty')); return }

        // Build canonical key map from actual headers
        const firstRow = raw[0]
        const headerMap: Record<string, string> = {}
        for (const key of Object.keys(firstRow)) {
          const canonical = COL_MAP[key.toLowerCase().trim()]
          if (canonical) headerMap[key] = canonical
        }

        const rows: ImportRow[] = raw.map((r, i) => {
          const mapped: Record<string, string> = {}
          for (const [orig, canonical] of Object.entries(headerMap)) {
            mapped[canonical] = String(r[orig] ?? '').trim()
          }

          // Normalize modality
          if (mapped.modality) {
            mapped.modality = mapped.modality.toUpperCase().replace(/-/g, '_')
          }

          const partial = {
            rowNum:                  i + 2,
            testName:                mapped.testName                || '',
            shortName:               mapped.shortName               || '',
            modality:                mapped.modality                || '',
            department:              mapped.department              || '',
            price:                   mapped.price                   || '',
            mrp:                     mapped.mrp                     || '',
            durationMinutes:         mapped.durationMinutes         || '',
            reportTatHours:          mapped.reportTatHours          || '',
            description:             mapped.description             || '',
            preparationInstructions: mapped.preparationInstructions || '',
          }

          return { ...partial, errors: validateRow(partial), status: 'pending' }
        }).filter(r => r.testName.trim() || r.shortName.trim()) // skip entirely blank rows

        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function downloadTemplate() {
  const headers = [
    'Test Name', 'Short Name', 'Modality', 'Department',
    'Price', 'MRP', 'Duration (min)', 'TAT (hours)',
    'Description', 'Preparation',
  ]
  const examples = [
    ['CT Brain Plain', 'CT-BRAIN', 'CT', 'Neuroradiology', 1200, 1500, 20, 24,
      'Non-contrast CT scan of brain', 'No special preparation required'],
    ['MRI Lumbar Spine', 'MRI-LS', 'MRI', 'Musculoskeletal', 3500, 4000, 45, 48,
      'MRI of lumbar spine with and without contrast', 'Remove all metal objects'],
    ['USG Abdomen', 'USG-ABD', 'USG', 'Abdominal', 600, 800, 15, 12,
      'Ultrasound examination of the abdomen', 'Fasting 4 hours before scan'],
    ['X-Ray Chest PA', 'XRAY-CXR', 'XRAY', 'Chest & Cardiac', 250, 300, 5, 2,
      'Posteroanterior chest radiograph', ''],
  ]

  const ws   = XLSX.utils.aoa_to_sheet([headers, ...examples])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  const wb   = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tests')
  XLSX.writeFile(wb, 'test_catalog_import_template.xlsx')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestCatalog() {
  const qc = useQueryClient()

  // Single-test modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Test | null>(null)
  const [form, setForm]           = useState(emptyForm)

  // Search / filter
  const [search, setSearch]             = useState('')
  const [filterModality, setFilterModality] = useState('')

  // Import modal
  const [importOpen, setImportOpen]   = useState(false)
  const [importRows, setImportRows]   = useState<ImportRow[]>([])
  const [importing, setImporting]     = useState(false)
  const [importDone, setImportDone]   = useState(false)
  const [progress, setProgress]       = useState({ done: 0, total: 0 })
  const [isDragging, setIsDragging]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: tests = [], isLoading } = useQuery<Test[]>({
    queryKey: ['test-catalog'],
    queryFn: () => api.get('/test-catalog').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => {
      const payload = {
        ...data,
        price:           data.price           ? parseFloat(data.price)         : null,
        mrp:             data.mrp             ? parseFloat(data.mrp)           : null,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : null,
        reportTatHours:  data.reportTatHours  ? parseInt(data.reportTatHours)  : null,
      }
      return editing
        ? api.put(`/test-catalog/${editing.id}`, payload)
        : api.post('/test-catalog', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test-catalog'] })
      toast.success(editing ? 'Test updated' : 'Test added')
      closeModal()
    },
    onError: () => toast.error('Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/test-catalog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test-catalog'] })
      toast.success('Test removed')
    },
  })

  const openNew  = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (t: Test) => {
    setEditing(t)
    setForm({
      testName:                t.testName,
      shortName:               t.shortName               ?? '',
      modality:                t.modality                ?? '',
      department:              t.department              ?? '',
      price:                   t.price                   != null ? String(t.price)           : '',
      mrp:                     t.mrp                     != null ? String(t.mrp)             : '',
      durationMinutes:         t.durationMinutes         != null ? String(t.durationMinutes) : '',
      reportTatHours:          t.reportTatHours          != null ? String(t.reportTatHours)  : '',
      preparationInstructions: t.preparationInstructions ?? '',
      description:             t.description             ?? '',
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm) }
  const field = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const visible = tests.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.testName.toLowerCase().includes(q) ||
      (t.shortName ?? '').toLowerCase().includes(q) ||
      (t.department ?? '').toLowerCase().includes(q)
    const matchModality = !filterModality || t.modality === filterModality
    return matchSearch && matchModality
  })

  // ── Import modal helpers ───────────────────────────────────────────────────

  const closeImport = () => {
    if (importing) return
    setImportOpen(false)
    setImportRows([])
    setImportDone(false)
    setProgress({ done: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Please upload an .xlsx or .xls file')
      return
    }
    try {
      const rows = await parseExcel(file)
      if (rows.length === 0) { toast.error('No data rows found in the file'); return }
      setImportRows(rows)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const runImport = async () => {
    const valid = importRows.filter(r => r.errors.length === 0)
    if (valid.length === 0) { toast.error('No valid rows to import'); return }

    setImporting(true)
    setProgress({ done: 0, total: valid.length })

    let succeeded = 0
    const updated = [...importRows]

    for (const row of valid) {
      const idx = updated.findIndex(r => r.rowNum === row.rowNum)
      try {
        await api.post('/test-catalog', {
          testName:                row.testName,
          shortName:               row.shortName      || null,
          modality:                row.modality       || null,
          department:              row.department     || null,
          price:                   row.price          ? parseFloat(row.price)          : null,
          mrp:                     row.mrp            ? parseFloat(row.mrp)            : null,
          durationMinutes:         row.durationMinutes ? parseInt(row.durationMinutes) : null,
          reportTatHours:          row.reportTatHours  ? parseInt(row.reportTatHours)  : null,
          description:             row.description     || null,
          preparationInstructions: row.preparationInstructions || null,
        })
        updated[idx] = { ...updated[idx], status: 'success' }
        succeeded++
      } catch {
        updated[idx] = { ...updated[idx], status: 'error', statusMsg: 'Server rejected this row' }
      }
      setImportRows([...updated])
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setImporting(false)
    setImportDone(true)
    qc.invalidateQueries({ queryKey: ['test-catalog'] })
    toast.success(`${succeeded} of ${valid.length} tests imported`)
  }

  const validCount   = importRows.filter(r => r.errors.length === 0).length
  const invalidCount = importRows.filter(r => r.errors.length > 0).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all radiology tests — name, pricing, duration, TAT, and patient prep.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import from Excel
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, short name, department…"
            className="input pl-9"
          />
        </div>
        <select
          value={filterModality}
          onChange={e => setFilterModality(e.target.value)}
          className="input w-44"
        >
          <option value="">All Modalities</option>
          {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-44 bg-gray-50" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-16 text-center">
          <FlaskConical className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 text-lg">
            {tests.length === 0 ? 'No tests yet' : 'No results'}
          </h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            {tests.length === 0
              ? 'Add tests individually or import multiple at once from an Excel file.'
              : 'Try a different search or filter.'}
          </p>
          {tests.length === 0 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button onClick={() => setImportOpen(true)} className="btn-secondary">
                <FileSpreadsheet className="w-4 h-4" /> Import from Excel
              </button>
              <button onClick={openNew} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Test
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{t.testName}</h3>
                    {t.shortName && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        {t.shortName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.modality && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                        <Stethoscope className="w-3 h-3" /> {t.modality}
                      </span>
                    )}
                    {t.department && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" /> {t.department}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Remove this test?')) deleteMutation.mutate(t.id) }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(t.price != null || t.mrp != null) && (
                <div className="flex items-center gap-3">
                  {t.price != null && (
                    <div className="flex items-center gap-1 text-green-700 font-semibold text-sm">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {Number(t.price).toLocaleString('en-IN')}
                    </div>
                  )}
                  {t.mrp != null && (
                    <div className="text-xs text-gray-400 line-through">MRP {fmt(t.mrp)}</div>
                  )}
                  {t.price != null && t.mrp != null && t.mrp > t.price && (
                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      {Math.round((1 - t.price / t.mrp) * 100)}% off
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                {t.durationMinutes != null && (
                  <span className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> {t.durationMinutes} min
                  </span>
                )}
                {t.reportTatHours != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> TAT {t.reportTatHours}h
                  </span>
                )}
              </div>

              {t.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
              )}
              {t.preparationInstructions && (
                <div className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 border border-amber-100">
                  <span className="font-medium">Prep: </span>{t.preparationInstructions}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Single test modal ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Test' : 'Add Radiology Test'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Test Name *</label>
              <input {...field('testName')} className="input" placeholder="e.g. CT Brain with Contrast" />
            </div>
            <div>
              <label className="label">Short Name</label>
              <input {...field('shortName')} className="input" placeholder="e.g. CT-BRAIN" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Modality</label>
              <select {...field('modality')} className="input">
                <option value="">— Select —</option>
                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input {...field('department')} list="dept-list" className="input" placeholder="e.g. Neuroradiology" />
              <datalist id="dept-list">
                {DEPARTMENTS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (₹)</label>
              <input {...field('price')} type="number" min="0" className="input" placeholder="e.g. 1500" />
            </div>
            <div>
              <label className="label">MRP (₹)</label>
              <input {...field('mrp')} type="number" min="0" className="input" placeholder="e.g. 2000" />
              <p className="text-xs text-gray-400 mt-1">Leave blank if no MRP/discount to show</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Scan Duration (minutes)</label>
              <input {...field('durationMinutes')} type="number" min="1" className="input" placeholder="e.g. 30" />
            </div>
            <div>
              <label className="label">Report TAT (hours)</label>
              <input {...field('reportTatHours')} type="number" min="1" className="input" placeholder="e.g. 24" />
            </div>
          </div>

          <hr />

          <div>
            <label className="label">Description</label>
            <textarea {...field('description')} rows={2} className="input resize-none"
              placeholder="Brief description of what this test covers…" />
          </div>
          <div>
            <label className="label">Patient Preparation Instructions</label>
            <textarea {...field('preparationInstructions')} rows={3} className="input resize-y"
              placeholder="e.g. Fasting required 4 hours before the scan. Remove all metal objects." />
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.testName.trim() || saveMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update Test' : 'Save Test'}
            </button>
            <button onClick={closeModal} className="btn-secondary">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Import from Excel modal ───────────────────────────────────────── */}
      <Modal
        open={importOpen}
        onClose={closeImport}
        title="Import Tests from Excel"
        size="lg"
      >
        <div className="space-y-5">

          {/* Step 1 — download template */}
          {importRows.length === 0 && (
            <>
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <FileSpreadsheet className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>
                  Download the Excel template, fill in your tests, then upload it below.
                  Column headers are flexible — common aliases are accepted.
                </span>
              </div>

              <button
                onClick={downloadTemplate}
                className="btn-secondary w-full justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel Template
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2 w-fit mx-auto">
                  or upload your own file
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Drop your Excel file here, or <span className="text-primary-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls — max 5 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>

              {/* Column reference */}
              <details className="group">
                <summary className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                  Accepted column headers
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-500 pl-5">
                  {[
                    ['Test Name *', 'test name, testname, name'],
                    ['Short Name', 'short name, shortname, code'],
                    ['Modality', 'modality'],
                    ['Department', 'department, dept'],
                    ['Price', 'price, rate'],
                    ['MRP', 'mrp, list price'],
                    ['Duration (min)', 'duration, duration (min), scan duration'],
                    ['TAT (hours)', 'tat, tat (hours), report tat'],
                    ['Description', 'description'],
                    ['Preparation', 'preparation, prep instructions, patient preparation'],
                  ].map(([field, aliases]) => (
                    <div key={field}>
                      <span className="font-medium text-gray-700">{field}:</span> {aliases}
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}

          {/* Step 2 — preview & import */}
          {importRows.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">
                  {importRows.length} row{importRows.length !== 1 ? 's' : ''} parsed
                </span>
                {validCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} with errors
                  </span>
                )}
                {!importing && !importDone && (
                  <button
                    onClick={() => { setImportRows([]); setImportDone(false) }}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Upload different file
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {importing && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Importing…</span>
                    <span>{progress.done} / {progress.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold w-8">#</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Test Name</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Modality</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Price</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">MRP</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Duration</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importRows.map(row => (
                      <tr
                        key={row.rowNum}
                        className={
                          row.status === 'success' ? 'bg-green-50' :
                          row.status === 'error'   ? 'bg-red-50' :
                          row.errors.length > 0    ? 'bg-amber-50' : ''
                        }
                      >
                        <td className="px-3 py-2 text-gray-400">{row.rowNum}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">
                          {row.testName || <span className="text-red-400 italic">missing</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.modality || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.price ? `₹${row.price}` : '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.mrp   ? `₹${row.mrp}`   : '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.durationMinutes ? `${row.durationMinutes}m` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === 'success' && (
                            <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                            </span>
                          )}
                          {row.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-3.5 h-3.5" /> {row.statusMsg}
                            </span>
                          )}
                          {row.status === 'pending' && row.errors.length === 0 && (
                            importing
                              ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                              : <span className="text-gray-400">Ready</span>
                          )}
                          {row.status === 'pending' && row.errors.length > 0 && (
                            <span className="text-amber-700" title={row.errors.join(', ')}>
                              <AlertCircle className="w-3.5 h-3.5 inline" /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidCount > 0 && !importDone && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  {invalidCount} row{invalidCount !== 1 ? 's' : ''} with errors will be skipped.
                  Only the {validCount} valid rows will be imported.
                </p>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            {importRows.length > 0 && !importDone && (
              <button
                onClick={runImport}
                disabled={importing || validCount === 0}
                className="btn-primary flex-1 justify-center"
              >
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {validCount} Test{validCount !== 1 ? 's' : ''}</>
                }
              </button>
            )}
            {importDone && (
              <button onClick={closeImport} className="btn-primary flex-1 justify-center">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            )}
            {!importing && (
              <button onClick={closeImport} className="btn-secondary">
                <X className="w-4 h-4" /> {importDone ? 'Close' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
