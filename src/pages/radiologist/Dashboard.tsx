import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Monitor, Clock, CheckCircle, Activity, Eye, FileText, Building2 } from 'lucide-react'
import api from '../../services/api'
import { Study } from '../../types'
import StatusBadge from '../../components/common/StatusBadge'
import { fmtDateTime } from '../../utils/date'
import { useAuthStore } from '../../store/authStore'

export default function DoctorDashboard() {
  const user = useAuthStore(s => s.user)

  const { data: cases = [], isLoading } = useQuery<Study[]>({
    queryKey: ['my-cases'],
    queryFn: () => api.get('/assignments/my-cases').then(r => r.data),
    refetchInterval: 30000,
  })

  const pending   = cases.filter(c => ['ASSIGNED', 'REPORT_PENDING'].includes(c.status))
  const completed = cases.filter(c => c.status === 'REPORT_COMPLETED')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Cases</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm">Welcome, {user?.fullName}</p>
            {user?.centerName && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                <Building2 className="w-3 h-3" />
                {user.centerName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/doctor/reports" className="btn-secondary text-sm">
            <FileText className="w-4 h-4" /> My Reports
          </Link>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Activity className="w-4 h-4" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-xl font-bold">{pending.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Assigned</p>
            <p className="text-xl font-bold">{cases.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Reported</p>
            <p className="text-xl font-bold">{completed.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Cases */}
      <div className="card mb-6">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-800">Pending Cases</h2>
            {pending.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {pending.length}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Lab No', 'Patient', 'Study / Modality', 'Clinical History', 'Status', 'Assigned', 'Action'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="td animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : pending.length === 0 ? (
                <tr><td colSpan={7} className="td text-center py-10 text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
                  <p>All caught up — no pending cases</p>
                </td></tr>
              ) : pending.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td">
                    <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{c.labNo}</span>
                  </td>
                  <td className="td">
                    <div className="font-medium">{c.patientName}</div>
                    <div className="text-xs text-gray-400">{c.patientCode}</div>
                  </td>
                  <td className="td">
                    <div>{c.studyDescription}</div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.modality}</span>
                  </td>
                  <td className="td text-gray-500 max-w-xs">
                    <p className="truncate text-xs">{c.clinicalHistory ?? '—'}</p>
                  </td>
                  <td className="td"><StatusBadge status={c.status} /></td>
                  <td className="td text-gray-500 text-xs">{fmtDateTime(c.assignedAt)}</td>
                  <td className="td">
                    <Link to={`/doctor/workstation/${c.id}`}
                      className="btn-primary text-xs py-1.5 px-3">
                      <Monitor className="w-3 h-3" /> Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Cases */}
      <div className="card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-gray-800">Completed Cases</h2>
            {completed.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {completed.length}
              </span>
            )}
          </div>
          <Link to="/doctor/reports" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            <FileText className="w-3 h-3" /> View all reports →
          </Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Lab No', 'Patient', 'Study / Modality', 'Status', 'Assigned', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="td animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : completed.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">
                  <Monitor className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No completed cases yet</p>
                </td></tr>
              ) : completed.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td">
                    <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{c.labNo}</span>
                  </td>
                  <td className="td">
                    <div className="font-medium">{c.patientName}</div>
                    <div className="text-xs text-gray-400">{c.patientCode}</div>
                  </td>
                  <td className="td">
                    <div>{c.studyDescription}</div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.modality}</span>
                  </td>
                  <td className="td"><StatusBadge status={c.status} /></td>
                  <td className="td text-gray-500 text-xs">{fmtDateTime(c.assignedAt)}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/doctor/reports`} state={{ studyId: c.id }}
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Report
                      </Link>
                      <Link to={`/doctor/workstation/${c.id}`}
                        className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1">
                        <Monitor className="w-3 h-3" /> Edit
                      </Link>
                    </div>
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
