import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit2, Trash2, FlaskConical, X, Save, Search, Clock, IndianRupee,
  Stethoscope, Building2, Timer
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

export default function TestCatalog() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Test | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [search, setSearch]       = useState('')
  const [filterModality, setFilterModality] = useState('')

  const { data: tests = [], isLoading } = useQuery<Test[]>({
    queryKey: ['test-catalog'],
    queryFn: () => api.get('/test-catalog').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => {
      const payload = {
        ...data,
        price:           data.price           ? parseFloat(data.price)           : null,
        mrp:             data.mrp             ? parseFloat(data.mrp)             : null,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes)   : null,
        reportTatHours:  data.reportTatHours  ? parseInt(data.reportTatHours)    : null,
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all radiology tests — name, pricing, duration, TAT, and patient prep.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Test
        </button>
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
              ? 'Add tests like CT Brain, MRI Spine, USG Abdomen with prices and scan durations.'
              : 'Try a different search or filter.'}
          </p>
          {tests.length === 0 && (
            <button onClick={openNew} className="btn-primary mt-5 mx-auto">
              <Plus className="w-4 h-4" /> Add First Test
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
              {/* Header */}
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

              {/* Pricing */}
              {(t.price != null || t.mrp != null) && (
                <div className="flex items-center gap-3">
                  {t.price != null && (
                    <div className="flex items-center gap-1 text-green-700 font-semibold text-sm">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {Number(t.price).toLocaleString('en-IN')}
                    </div>
                  )}
                  {t.mrp != null && (
                    <div className="text-xs text-gray-400 line-through">
                      MRP {fmt(t.mrp)}
                    </div>
                  )}
                  {t.price != null && t.mrp != null && t.mrp > t.price && (
                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      {Math.round((1 - t.price / t.mrp) * 100)}% off
                    </span>
                  )}
                </div>
              )}

              {/* Meta row */}
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

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Test' : 'Add Radiology Test'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Name + Short name */}
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

          {/* Modality + Department */}
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
              <input
                {...field('department')}
                list="dept-list"
                className="input"
                placeholder="e.g. Neuroradiology"
              />
              <datalist id="dept-list">
                {DEPARTMENTS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {/* Pricing */}
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

          {/* Duration + TAT */}
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

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              {...field('description')}
              rows={2}
              className="input resize-none"
              placeholder="Brief description of what this test covers…"
            />
          </div>

          {/* Prep */}
          <div>
            <label className="label">Patient Preparation Instructions</label>
            <textarea
              {...field('preparationInstructions')}
              rows={3}
              className="input resize-y"
              placeholder="e.g. Fasting required 4 hours before the scan. Remove all metal objects."
            />
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
    </div>
  )
}
