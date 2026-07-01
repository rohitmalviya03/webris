import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, Search, BookOpen, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Patient, PageResponse } from '../../../types'

const MODALITIES = ['CT', 'MRI', 'XRAY', 'USG', 'PET', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'NUCLEAR_MEDICINE']

interface TestCatalogItem {
  id: number
  testName: string
  shortName: string | null
  modality: string | null
  price: number | null
  mrp: number | null
}

const schema = z.object({
  patientId:        z.coerce.number().positive('Patient is required'),
  studyDescription: z.string().min(2, 'Study description required'),
  modality:         z.string().min(1, 'Modality is required'),
  bodyPart:         z.string().optional(),
  clinicalHistory:  z.string().optional(),
  referringDoctor:  z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function StudyForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [testMode, setTestMode] = useState<'catalog' | 'manual'>('catalog')
  const [testSearch, setTestSearch] = useState('')
  const [selectedTest, setSelectedTest] = useState<TestCatalogItem | null>(null)
  const [manualPrice, setManualPrice] = useState<string>('')
  const [showTestDropdown, setShowTestDropdown] = useState(false)

  const { data: patients } = useQuery<PageResponse<Patient>>({
    queryKey: ['patients-search', patientSearch],
    queryFn: () => api.get('/patients', { params: { search: patientSearch, size: 5 } }).then(r => r.data),
    enabled: patientSearch.length >= 2,
  })

  const { data: tests } = useQuery<TestCatalogItem[]>({
    queryKey: ['test-catalog'],
    queryFn: () => api.get('/test-catalog').then(r => r.data),
  })

  const filteredTests = tests?.filter(t =>
    t.testName.toLowerCase().includes(testSearch.toLowerCase()) ||
    (t.shortName ?? '').toLowerCase().includes(testSearch.toLowerCase()) ||
    (t.modality ?? '').toLowerCase().includes(testSearch.toLowerCase())
  ) ?? []

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const billingMutation = useMutation({
    mutationFn: ({ studyId, amount }: { studyId: number; amount: number }) =>
      api.post('/billing', { studyId, amount, discount: 0, tax: 0, paymentMode: null, notes: null }),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/studies', data),
    onSuccess: async (res) => {
      const price = testMode === 'catalog' ? selectedTest?.price : parseFloat(manualPrice)
      if (price && price > 0) {
        try {
          await billingMutation.mutateAsync({ studyId: res.data.id, amount: price })
          toast.success('Study created and billing added')
        } catch {
          toast.success('Study created (billing could not be auto-added)')
        }
      } else {
        toast.success('Study order created')
      }
      qc.invalidateQueries({ queryKey: ['studies'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
      navigate('/center/studies')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Something went wrong')
    },
  })

  function selectTestFromCatalog(test: TestCatalogItem) {
    setSelectedTest(test)
    setTestSearch(test.testName)
    setShowTestDropdown(false)
    setValue('studyDescription', test.testName)
    if (test.modality) setValue('modality', test.modality)
  }

  function switchMode(mode: 'catalog' | 'manual') {
    setTestMode(mode)
    setSelectedTest(null)
    setTestSearch('')
    setManualPrice('')
    reset({ patientId: undefined as unknown as number, studyDescription: '', modality: '', bodyPart: '', clinicalHistory: '', referringDoctor: '' })
    if (selectedPatient) setValue('patientId', selectedPatient.id)
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="page-title">Create Study Order</h1>
        </div>
      </div>

      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">

          {/* Patient search */}
          <div>
            <label className="label">Select Patient *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={patientSearch} onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null) }}
                className="input pl-10" placeholder="Search patient by name or mobile..." />
            </div>
            {patients?.content && patientSearch.length >= 2 && !selectedPatient && (
              <div className="border rounded-lg mt-1 divide-y max-h-48 overflow-y-auto shadow-md">
                {patients.content.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-400">No patients found</p>
                ) : patients.content.map(p => (
                  <button key={p.id} type="button" onClick={() => {
                    setSelectedPatient(p)
                    setValue('patientId', p.id)
                    setPatientSearch(p.fullName)
                  }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                    <div className="font-medium">{p.fullName}</div>
                    <div className="text-xs text-gray-400">{p.patientCode} · {p.mobile}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-green-800">{selectedPatient.fullName}</div>
                  <div className="text-xs text-green-600">{selectedPatient.patientCode} · {selectedPatient.mobile}</div>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch('') }}
                  className="text-xs text-red-500 hover:text-red-700">Change</button>
              </div>
            )}
            {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
          </div>

          {/* Test selection mode toggle */}
          <div>
            <label className="label">Investigation / Test *</label>
            <div className="flex gap-2 mb-3">
              <button type="button"
                onClick={() => switchMode('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  testMode === 'catalog'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}>
                <BookOpen className="w-4 h-4" />
                From Test Catalog
              </button>
              <button type="button"
                onClick={() => switchMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  testMode === 'manual'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}>
                <PenLine className="w-4 h-4" />
                Manual Entry
              </button>
            </div>

            {testMode === 'catalog' ? (
              <div className="space-y-3">
                {/* Catalog search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={testSearch}
                    onChange={e => { setTestSearch(e.target.value); setSelectedTest(null); setShowTestDropdown(true) }}
                    onFocus={() => setShowTestDropdown(true)}
                    className="input pl-10"
                    placeholder="Search test by name or modality..."
                    autoComplete="off"
                  />
                  {showTestDropdown && testSearch.length >= 1 && !selectedTest && (
                    <div className="absolute z-10 w-full border rounded-lg mt-1 divide-y max-h-56 overflow-y-auto shadow-lg bg-white">
                      {filteredTests.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-gray-400">
                          No tests found.{' '}
                          <button type="button" className="text-blue-600 hover:underline" onClick={() => switchMode('manual')}>
                            Switch to manual entry
                          </button>
                        </div>
                      ) : filteredTests.map(t => (
                        <button key={t.id} type="button" onClick={() => selectTestFromCatalog(t)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{t.testName}</span>
                              {t.shortName && <span className="text-gray-400 text-xs ml-2">({t.shortName})</span>}
                            </div>
                            {t.price != null && (
                              <span className="text-green-700 font-semibold text-xs">₹{t.price}</span>
                            )}
                          </div>
                          {t.modality && (
                            <span className="text-xs text-blue-600 mt-0.5 inline-block">{t.modality}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTest && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-blue-900">{selectedTest.testName}</div>
                        <div className="flex gap-3 mt-1">
                          {selectedTest.modality && (
                            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{selectedTest.modality}</span>
                          )}
                          {selectedTest.price != null && (
                            <span className="text-xs text-green-700 font-medium">Price: ₹{selectedTest.price}</span>
                          )}
                          {selectedTest.mrp != null && selectedTest.mrp !== selectedTest.price && (
                            <span className="text-xs text-gray-400 line-through">MRP: ₹{selectedTest.mrp}</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => { setSelectedTest(null); setTestSearch(''); setValue('studyDescription', ''); setValue('modality', '') }}
                        className="text-xs text-red-500 hover:text-red-700">Change</button>
                    </div>
                  </div>
                )}
                {/* hidden inputs so react-hook-form tracks catalog-filled values */}
                <input type="hidden" {...register('studyDescription')} />
                <input type="hidden" {...register('modality')} />
                {(errors.studyDescription || errors.modality) && !selectedTest && (
                  <p className="text-red-500 text-xs mt-1">Please select a test from the catalog</p>
                )}
              </div>
            ) : (
              /* Manual entry */
              <div className="space-y-4 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <div>
                  <label className="label">Test / Study Description *</label>
                  <input {...register('studyDescription')} className="input" placeholder="e.g. CT Brain, MRI Spine, X-Ray Chest" />
                  {errors.studyDescription && <p className="text-red-500 text-xs mt-1">{errors.studyDescription.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Modality *</label>
                    <select {...register('modality')} className="input">
                      <option value="">Select modality</option>
                      {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {errors.modality && <p className="text-red-500 text-xs mt-1">{errors.modality.message}</p>}
                  </div>
                  <div>
                    <label className="label">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualPrice}
                      onChange={e => setManualPrice(e.target.value)}
                      className="input"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-400 mt-1">Optional — billing will be auto-created</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Body Part — only show when test is selected in catalog mode or always in manual */}
          <div>
            <label className="label">Body Part</label>
            <input {...register('bodyPart')} className="input" placeholder="e.g. Brain, Spine, Chest" />
          </div>

          <div>
            <label className="label">Referring Doctor</label>
            <input {...register('referringDoctor')} className="input" placeholder="Dr. Name" />
          </div>

          <div>
            <label className="label">Clinical History</label>
            <textarea {...register('clinicalHistory')} className="input resize-none" rows={3}
              placeholder="Patient's clinical history and symptoms..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
              {(isSubmitting || mutation.isPending)
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                : <><Save className="w-4 h-4" /> Create Study</>}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
