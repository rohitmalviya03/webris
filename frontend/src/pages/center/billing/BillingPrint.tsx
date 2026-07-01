import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../../../services/api'
import { Study } from '../../../types'
import { fmtDateTime } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'

export default function BillingPrint() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: study, isLoading } = useQuery<Study>({
    queryKey: ['study-bill', studyId],
    queryFn: () => api.get(`/studies/${studyId}`).then(r => r.data),
    enabled: !!studyId,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  if (!study || !study.billing) return (
    <div className="text-center py-20 text-gray-400">Billing record not found</div>
  )

  const b = study.billing

  return (
    <div>
      {/* Toolbar */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="page-title">Invoice — {b.invoiceNo}</h1>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="w-4 h-4" /> Print Invoice
        </button>
      </div>

      {/* Printable Invoice */}
      <div className="bg-white border rounded-xl shadow-sm p-10 max-w-2xl mx-auto print:border-0 print:shadow-none print:p-4 print:max-w-none">

        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase">
            {user?.centerName ?? 'Diagnostic Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 font-semibold tracking-widest">BILLING INVOICE</p>
        </div>

        {/* Invoice meta */}
        <div className="flex justify-between mb-6 text-sm">
          <div className="space-y-1">
            <div><span className="text-gray-500">Invoice No:</span> <span className="font-bold font-mono text-primary-700">{b.invoiceNo}</span></div>
            <div><span className="text-gray-500">Lab No:</span> <span className="font-semibold">{study.labNo}</span></div>
          </div>
          <div className="text-right space-y-1">
            <div><span className="text-gray-500">Date:</span> <span className="font-semibold">{fmtDateTime(b.createdAt)}</span></div>
            <div><span className="text-gray-500">Payment Mode:</span> <span className="font-semibold">{b.paymentMode ?? '—'}</span></div>
          </div>
        </div>

        {/* Patient details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
          <h3 className="font-semibold text-gray-700 mb-2 uppercase text-xs tracking-wide">Patient Details</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{study.patientName}</span></div>
            <div><span className="text-gray-500">Patient ID:</span> <span className="font-mono">{study.patientCode}</span></div>
            {study.referringDoctor && (
              <div><span className="text-gray-500">Ref. Doctor:</span> <span>{study.referringDoctor}</span></div>
            )}
          </div>
        </div>

        {/* Invoice table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left px-4 py-2 rounded-tl-lg">Investigation</th>
              <th className="text-center px-4 py-2">Modality</th>
              <th className="text-right px-4 py-2 rounded-tr-lg">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">{study.studyDescription}</td>
              <td className="px-4 py-3 text-center text-gray-500">{study.modality}</td>
              <td className="px-4 py-3 text-right">₹{Number(b.amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount summary */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{Number(b.amount).toFixed(2)}</span>
            </div>
            {Number(b.discount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>— ₹{Number(b.discount).toFixed(2)}</span>
              </div>
            )}
            {Number(b.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>₹{Number(b.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-2">
              <span>Total Paid</span>
              <span className="text-primary-700">₹{Number(b.netAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Payment Status</span>
              <span className={`font-semibold ${b.paymentStatus === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                {b.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Thank you for choosing {user?.centerName ?? 'our center'}. Get well soon!
        </div>
      </div>
    </div>
  )
}
