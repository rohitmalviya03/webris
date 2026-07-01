import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FileText, Monitor, Download, X, CheckCircle,
  AlertCircle, Clock, Send, Eye, Loader2, Pencil
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { Report, ReportStatus } from '../../types'
import StatusBadge from '../../components/common/StatusBadge'
import { fmtDateTime } from '../../utils/date'
import { useAuthStore } from '../../store/authStore'

type Filter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

const FILTER_LABELS: { key: Filter; label: string }[] = [
  { key: 'ALL',       label: 'All Reports' },
  { key: 'DRAFT',     label: 'Draft' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'APPROVED',  label: 'Approved' },
  { key: 'REJECTED',  label: 'Rejected' },
]

function StatusIcon({ status }: { status: ReportStatus }) {
  if (status === 'APPROVED')  return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'REJECTED')  return <AlertCircle className="w-4 h-4 text-red-500" />
  if (status === 'SUBMITTED') return <Send className="w-4 h-4 text-blue-500" />
  return <Clock className="w-4 h-4 text-orange-400" />
}

function ReportViewModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const user = useAuthStore(s => s.user)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/reports/${report.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${report.labNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Radiology Report</h2>
              <p className="text-xs text-gray-500">{report.patientName} — {report.labNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === 'APPROVED' && (
              <button onClick={handleDownload} disabled={downloading}
                className="btn-secondary text-sm py-1.5">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF
              </button>
            )}
            <Link to={`/doctor/workstation/${report.studyId}`}
              className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
              <Monitor className="w-4 h-4" /> Open Workstation
            </Link>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report content */}
        <div className="overflow-y-auto flex-1 p-8">
          {/* Center header */}
          <div className="text-center border-b-2 border-gray-800 pb-5 mb-6">
            <h1 className="text-xl font-bold text-gray-900 uppercase">
              {user?.centerName ?? 'Diagnostic Center'}
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-semibold tracking-widest">RADIOLOGY REPORT</p>
          </div>

          {/* Patient & study info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mb-6 text-sm">
            {[
              ['Patient Name',  report.patientName],
              ['Lab No',        report.labNo],
              ['Study',         report.studyDescription],
              ['Radiologist',   `${report.doctorName}${report.doctorQualification ? ', ' + report.doctorQualification : ''}`],
              ['Report Date',   fmtDateTime(report.approvedAt ?? report.submittedAt ?? report.createdAt)],
              ['Status',        report.status],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-gray-500 font-medium min-w-[110px] shrink-0">{label}:</span>
                <span className="text-gray-900 font-semibold">{value}</span>
              </div>
            ))}
          </div>

          {report.status === 'REJECTED' && report.rejectionReason && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700 mb-0.5">Rejection Reason</p>
                <p className="text-sm text-red-600">{report.rejectionReason}</p>
              </div>
            </div>
          )}

          <hr className="border-gray-200 mb-5" />

          {/* Report sections */}
          {[
            { title: 'CLINICAL HISTORY', content: report.clinicalHistory },
            { title: 'FINDINGS',         content: report.findings },
            { title: 'IMPRESSION',       content: report.impression },
            { title: 'CONCLUSION',       content: report.conclusion },
            { title: 'RECOMMENDATIONS',  content: report.recommendations },
          ].filter(s => s.content).map(section => (
            <div key={section.title} className="mb-5">
              <h3 className="text-xs font-bold text-primary-700 uppercase tracking-widest mb-2 border-b border-primary-100 pb-1">
                {section.title}
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{section.content}</p>
            </div>
          ))}

          <hr className="border-gray-300 my-8" />

          {/* Signature block */}
          <div className="flex justify-end">
            <div className="text-center min-w-[180px]">
              <div className="h-12" />
              <div className="border-t border-gray-500 pt-2">
                <p className="text-sm font-bold text-gray-900">{report.doctorName}</p>
                {report.doctorQualification && (
                  <p className="text-xs text-gray-500">{report.doctorQualification}</p>
                )}
                <p className="text-xs text-gray-500 italic">Radiologist</p>
              </div>
            </div>
          </div>

          {report.approvedByName && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Approved by: {report.approvedByName}
              {report.approvedAt && ` · ${fmtDateTime(report.approvedAt)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyReports() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const qc = useQueryClient()

  const modifyMutation = useMutation({
    mutationFn: (reportId: number) => api.post(`/reports/${reportId}/request-modification`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reports'] })
      qc.invalidateQueries({ queryKey: ['my-cases'] })
      toast.success('Report reopened for editing')
    },
    onError: () => toast.error('Failed to reopen report'),
  })

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['my-reports'],
    queryFn: () => api.get('/reports/my-reports').then(r => r.data),
    refetchInterval: 60000,
  })

  const filtered = filter === 'ALL'
    ? reports
    : reports.filter(r => r.status === filter)

  const counts: Record<Filter, number> = {
    ALL:       reports.length,
    DRAFT:     reports.filter(r => r.status === 'DRAFT').length,
    SUBMITTED: reports.filter(r => r.status === 'SUBMITTED').length,
    APPROVED:  reports.filter(r => r.status === 'APPROVED').length,
    REJECTED:  reports.filter(r => r.status === 'REJECTED').length,
  }

  return (
    <div>
      {selectedReport && (
        <ReportViewModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Reports</h1>
          <p className="text-gray-500 text-sm mt-1">All reports you have authored</p>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 60s</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',     count: counts.ALL,       bg: 'bg-gray-50',   text: 'text-gray-600',  icon: FileText },
          { label: 'Pending',   count: counts.DRAFT + counts.SUBMITTED, bg: 'bg-orange-50', text: 'text-orange-600', icon: Clock },
          { label: 'Approved',  count: counts.APPROVED,  bg: 'bg-green-50',  text: 'text-green-600', icon: CheckCircle },
          { label: 'Rejected',  count: counts.REJECTED,  bg: 'bg-red-50',    text: 'text-red-600',   icon: AlertCircle },
        ].map(({ label, count, bg, text, icon: Icon }) => (
          <div key={label} className="card p-5 flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {FILTER_LABELS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            {counts[key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
              }`}>{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Reports table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Lab No', 'Patient', 'Study', 'Status', 'Submitted', 'Approved By', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="td animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="td text-center py-14 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No reports found</p>
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td">
                    <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{r.labNo}</span>
                  </td>
                  <td className="td font-medium text-gray-800">{r.patientName}</td>
                  <td className="td text-gray-600 text-sm">{r.studyDescription}</td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={r.status} />
                      <StatusBadge status={r.status} />
                    </div>
                  </td>
                  <td className="td text-gray-500 text-xs">{r.submittedAt ? fmtDateTime(r.submittedAt) : '—'}</td>
                  <td className="td text-gray-500 text-xs">
                    {r.approvedByName ?? '—'}
                    {r.approvedAt && <div className="text-gray-400">{fmtDateTime(r.approvedAt)}</div>}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedReport(r)}
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      {(r.status === 'SUBMITTED' || r.status === 'APPROVED') && (
                        <button
                          onClick={() => {
                            if (r.status === 'APPROVED') {
                              if (!confirm('Reopen this approved report for editing? It will need re-approval.')) return
                            }
                            modifyMutation.mutate(r.id)
                          }}
                          disabled={modifyMutation.isPending}
                          className="flex items-center gap-1 text-xs py-1 px-2.5 rounded-lg border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors font-medium"
                        >
                          {modifyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />}
                          Modify
                        </button>
                      )}
                      <Link to={`/doctor/workstation/${r.studyId}`}
                        className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {r.status === 'REJECTED' ? 'Revise' : 'Open'}
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
