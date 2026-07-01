import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Study, PageResponse } from '../../../types'

const schema = z.object({
  studyId:    z.coerce.number().positive('Study is required'),
  amount:     z.coerce.number().positive('Amount is required'),
  discount:   z.coerce.number().min(0).default(0),
  tax:        z.coerce.number().min(0).default(0),
  paymentMode: z.string().optional(),
  notes:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BillingForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const preStudyId = params.get('studyId')

  const [studySearch, setStudySearch] = useState('')
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)

  const { data: studies } = useQuery<PageResponse<Study>>({
    queryKey: ['studies-bsearch', studySearch],
    queryFn: () => api.get('/studies', { params: { size: 5 } }).then(r => r.data),
    enabled: true,
  })

  const { data: preStudy } = useQuery<Study>({
    queryKey: ['study', preStudyId],
    queryFn: () => api.get(`/studies/${preStudyId}`).then(r => r.data),
    enabled: !!preStudyId,
  })

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { discount: 0, tax: 0 },
  })

  useEffect(() => {
    if (preStudy) { setSelectedStudy(preStudy); setValue('studyId', preStudy.id) }
  }, [preStudy, setValue])

  const amount = watch('amount') || 0
  const discount = watch('discount') || 0
  const tax = watch('tax') || 0
  const netAmount = Number(amount) - Number(discount) + Number(tax)

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/billing', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studies'] })
      qc.invalidateQueries({ queryKey: ['studies-billing'] })
      toast.success('Invoice created & payment recorded')
      navigate('/center/billing')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Something went wrong')
    },
  })

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="page-title">Create Invoice</h1>
        </div>
      </div>

      <div className="card p-6 max-w-xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">

          {/* Study picker */}
          {!selectedStudy ? (
            <div>
              <label className="label">Select Study / Lab No *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={studySearch} onChange={e => setStudySearch(e.target.value)}
                  className="input pl-10" placeholder="Search study..." />
              </div>
              {studies?.content && (
                <div className="border rounded-lg mt-1 divide-y max-h-48 overflow-y-auto shadow-md">
                  {studies.content.filter(s => !s.billing).map(s => (
                    <button key={s.id} type="button" onClick={() => {
                      setSelectedStudy(s); setValue('studyId', s.id)
                    }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      <div className="font-medium">{s.labNo} — {s.patientName}</div>
                      <div className="text-xs text-gray-400">{s.studyDescription} · {s.modality}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-blue-900">{selectedStudy.labNo}</div>
                  <div className="text-sm text-blue-700">{selectedStudy.patientName} — {selectedStudy.studyDescription}</div>
                  <div className="text-xs text-blue-500 mt-1">{selectedStudy.modality} · {selectedStudy.status}</div>
                </div>
                {!preStudyId && <button type="button" onClick={() => setSelectedStudy(null)} className="text-xs text-red-500">Change</button>}
              </div>
            </div>
          )}
          {errors.studyId && <p className="text-red-500 text-xs -mt-2">{errors.studyId.message}</p>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Amount (₹) *</label>
              <input {...register('amount')} type="number" step="0.01" className="input" placeholder="0.00" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Discount (₹)</label>
              <input {...register('discount')} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Tax (₹)</label>
              <input {...register('tax')} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
          </div>

          {/* Net amount */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between">
            <span className="text-sm font-medium text-green-800">Net Payable Amount</span>
            <span className="text-lg font-bold text-green-800">₹{netAmount.toFixed(2)}</span>
          </div>

          <div>
            <label className="label">Payment Mode</label>
            <select {...register('paymentMode')} className="input">
              <option value="">Select mode</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
              <option value="INSURANCE">Insurance</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Any notes..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Save className="w-4 h-4" /> Create Invoice</>}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
