import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Filter, Stethoscope, Printer, UserCheck } from 'lucide-react'
import api from '../../../services/api'
import { Study, StudyStatus, PageResponse } from '../../../types'
import StatusBadge from '../../../components/common/StatusBadge'
import { fmtDateTime } from '../../../utils/date'

const STATUSES: { value: StudyStatus | ''; label: string }[] = [
  { value: '',                 label: 'All' },
  { value: 'REGISTERED',      label: 'Registered' },
  { value: 'READY_FOR_SCAN',  label: 'Ready for Scan' },
  { value: 'SCAN_COMPLETED',  label: 'Scan Completed' },
  { value: 'IMAGE_AVAILABLE', label: 'Image Available' },
  { value: 'ASSIGNED',        label: 'Assigned' },
  { value: 'REPORT_PENDING',  label: 'Report Pending' },
  { value: 'REPORT_COMPLETED', label: 'Report Ready' },
  { value: 'APPROVED',        label: 'Approved' },
  { value: 'DELIVERED',       label: 'Delivered' },
]

function StudyAction({ study }: { study: Study }) {
  // Report is ready to print
  if (['REPORT_COMPLETED', 'APPROVED', 'DELIVERED'].includes(study.status)) {
    return (
      <Link
        to={`/center/reports/${study.id}/print`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <Printer className="w-3.5 h-3.5" /> Print Report
      </Link>
    )
  }

  // Image available / scan done — ready to assign
  if (['IMAGE_AVAILABLE', 'SCAN_COMPLETED', 'READY_FOR_SCAN', 'BILLED'].includes(study.status)) {
    return (
      <Link
        to={`/center/assignments`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <UserCheck className="w-3.5 h-3.5" /> Assign Doctor
      </Link>
    )
  }

  // Already assigned / report in progress
  if (['ASSIGNED', 'REPORT_PENDING'].includes(study.status)) {
    return (
      <span className="text-xs text-gray-400 italic">
        {study.assignedDoctorName ? `Dr. ${study.assignedDoctorName.replace('Dr. ', '')} reporting` : 'Awaiting report'}
      </span>
    )
  }

  // Registered — needs billing first
  if (study.status === 'REGISTERED') {
    return (
      <span className="text-xs text-gray-400">Bill to proceed</span>
    )
  }

  return <span className="text-xs text-gray-300">—</span>
}

export default function StudyList() {
  const [status, setStatus] = useState<StudyStatus | ''>('')
  const [page, setPage]     = useState(0)

  const { data, isLoading } = useQuery<PageResponse<Study>>({
    queryKey: ['studies', status, page],
    queryFn: () =>
      api.get('/studies', { params: { status: status || undefined, page, size: 20 } })
         .then(r => r.data),
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Studies</h1>
        <Link to="/center/studies/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Study
        </Link>
      </div>

      {/* Status filter */}
      <div className="card p-4 mb-4 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(0) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === s.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Lab No', 'Patient', 'Study / Modality', 'Status', 'Billing', 'Radiologist', 'Date', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="td">
                        <div className="animate-pulse h-4 bg-gray-100 rounded" />
                      </td>
                    </tr>
                  ))
                : data?.content.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="td text-center py-14 text-gray-400">
                        <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        No studies found
                      </td>
                    </tr>
                  )
                : data?.content.map(s => (
                    <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${
                      ['REPORT_COMPLETED', 'APPROVED'].includes(s.status) ? 'bg-green-50/40' : ''
                    }`}>
                      <td className="td">
                        <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                          {s.labNo}
                        </span>
                      </td>
                      <td className="td">
                        <div className="font-medium text-gray-900">{s.patientName}</div>
                        <div className="text-xs text-gray-400">{s.patientCode}</div>
                      </td>
                      <td className="td">
                        <div className="text-gray-800">{s.studyDescription}</div>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {s.modality}
                        </span>
                      </td>
                      <td className="td">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="td">
                        {s.billing
                          ? <span className="text-green-700 text-xs font-semibold">₹{s.billing.netAmount}</span>
                          : <Link to={`/center/billing/new?studyId=${s.id}`}
                              className="text-orange-500 text-xs font-medium underline">
                              Add Bill
                            </Link>
                        }
                      </td>
                      <td className="td text-gray-500 text-xs">
                        {s.assignedDoctorName ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="td text-gray-400 text-xs">
                        {fmtDateTime(s.createdAt)}
                      </td>
                      <td className="td">
                        <StudyAction study={s} />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>{data.totalElements} studies total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-secondary text-xs py-1.5">
                Previous
              </button>
              <span className="text-gray-600">Page {page + 1} / {data.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1} className="btn-secondary text-xs py-1.5">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
