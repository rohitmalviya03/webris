import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, CreditCard, Printer } from 'lucide-react'
import api from '../../../services/api'
import { Study, PageResponse } from '../../../types'
import StatusBadge from '../../../components/common/StatusBadge'
import { fmtDateTime } from '../../../utils/date'

export default function BillingList() {
  const { data, isLoading } = useQuery<PageResponse<Study>>({
    queryKey: ['studies-billing'],
    queryFn: () => api.get('/studies', { params: { size: 50 } }).then(r => r.data),
  })

  const studies = data?.content ?? []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Billing</h1>
        <Link to="/center/billing/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Lab No', 'Patient', 'Study', 'Invoice No', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="td animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : studies.filter(s => s.billing).length === 0 ? (
                <tr><td colSpan={8} className="td text-center py-10 text-gray-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No billing records found
                </td></tr>
              ) : studies.filter(s => s.billing).map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-mono text-xs">{s.labNo}</td>
                  <td className="td font-medium">{s.patientName}</td>
                  <td className="td text-gray-600">{s.studyDescription}</td>
                  <td className="td font-mono text-xs">{s.billing!.invoiceNo}</td>
                  <td className="td">
                    <div className="font-semibold">₹{s.billing!.netAmount}</div>
                    {s.billing!.discount > 0 && (
                      <div className="text-xs text-gray-400">Disc: ₹{s.billing!.discount}</div>
                    )}
                  </td>
                  <td className="td"><StatusBadge status={s.billing!.paymentStatus} /></td>
                  <td className="td text-gray-500 text-xs">{fmtDateTime(s.billing!.createdAt)}</td>
                  <td className="td">
                    <Link to={`/center/billing/${s.id}/print`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors">
                      <Printer className="w-3 h-3" /> Print Bill
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
