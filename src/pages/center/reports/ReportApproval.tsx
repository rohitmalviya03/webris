import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, Printer, Clock, FileCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Report } from '../../../types'
import StatusBadge from '../../../components/common/StatusBadge'
import Modal from '../../../components/common/Modal'
import { fmtDateTime } from '../../../utils/date'

type Tab = 'pending' | 'approved'

export default function ReportApproval() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('pending')
  const [viewReport, setViewReport] = useState<Report | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const { data: pendingReports = [], isLoading: loadingPending } = useQuery<Report[]>({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/reports/pending-approvals').then(r => r.data),
  })

  const { data: approvedReports = [], isLoading: loadingApproved } = useQuery<Report[]>({
    queryKey: ['approved-reports'],
    queryFn: () => api.get('/reports/approved').then(r => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (reportId: number) => api.post(`/reports/${reportId}/approve`),
    onSuccess: (_, reportId) => {
      qc.invalidateQueries({ queryKey: ['pending-approvals'] })
      qc.invalidateQueries({ queryKey: ['approved-reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Report approved successfully')
      setViewReport(null)
      setTab('approved')
    },
    onError: () => toast.error('Approval failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/reports/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-approvals'] })
      toast.success('Report sent back for correction')
      setRejectingId(null)
      setRejectReason('')
      setViewReport(null)
    },
    onError: () => toast.error('Action failed'),
  })

  const isLoading = tab === 'pending' ? loadingPending : loadingApproved
  const reports   = tab === 'pending' ? pendingReports : approvedReports

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'pending' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approval
          {pendingReports.length > 0 && (
            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'approved' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Approved &amp; Print
          {approvedReports.length > 0 && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {approvedReports.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          {tab === 'pending' ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700">All caught up!</h3>
              <p className="text-gray-500 text-sm mt-1">No reports pending approval.</p>
            </>
          ) : (
            <>
              <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700">No approved reports yet</h3>
              <p className="text-gray-500 text-sm mt-1">Approved reports will appear here for printing.</p>
            </>
          )}
        </div>
      ) : (
        <div className="card divide-y">
          {reports.map(r => (
            <div key={r.id} className="p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                      {r.labNo}
                    </span>
                    <StatusBadge status={r.status} />
                    {r.approvedAt && (
                      <span className="text-xs text-gray-400">
                        Approved: {fmtDateTime(r.approvedAt)}
                      </span>
                    )}
                    {r.submittedAt && tab === 'pending' && (
                      <span className="text-xs text-gray-400">
                        Submitted: {fmtDateTime(r.submittedAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="font-semibold text-gray-900">{r.patientName}</div>
                    <div className="text-sm text-gray-500">{r.studyDescription}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Radiologist: {r.doctorName}</div>
                  </div>
                  {r.impression && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 line-clamp-2">
                      <span className="font-medium text-blue-700">Impression: </span>{r.impression}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => setViewReport(r)} className="btn-secondary text-xs py-1.5 gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>

                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                        className="btn-success text-xs py-1.5 gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => setRejectingId(r.id)} className="btn-danger text-xs py-1.5 gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {tab === 'approved' && (
                    <Link
                      to={`/center/reports/${r.studyId}/print`}
                      className="btn-primary text-xs py-1.5 gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Report Modal */}
      <Modal open={!!viewReport} onClose={() => setViewReport(null)} title="Report Review" size="lg">
        {viewReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium text-gray-500">Patient:</span> <span className="font-semibold">{viewReport.patientName}</span></div>
              <div><span className="font-medium text-gray-500">Lab No:</span> <span className="font-mono font-semibold text-primary-700">{viewReport.labNo}</span></div>
              <div><span className="font-medium text-gray-500">Study:</span> {viewReport.studyDescription}</div>
              <div><span className="font-medium text-gray-500">Radiologist:</span> {viewReport.doctorName}</div>
            </div>

            {viewReport.clinicalHistory && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">Clinical History</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{viewReport.clinicalHistory}</p>
              </div>
            )}
            {viewReport.findings && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">Findings</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{viewReport.findings}</p>
              </div>
            )}
            {viewReport.impression && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">Impression</h4>
                <p className="text-sm text-gray-700 font-medium bg-blue-50 p-3 rounded-lg">{viewReport.impression}</p>
              </div>
            )}
            {viewReport.conclusion && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">Conclusion</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{viewReport.conclusion}</p>
              </div>
            )}

            {tab === 'pending' && (
              <div className="flex gap-3 pt-2 border-t">
                <button
                  onClick={() => approveMutation.mutate(viewReport.id)}
                  disabled={approveMutation.isPending}
                  className="btn-success flex-1 justify-center"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Report
                </button>
                <button
                  onClick={() => { setRejectingId(viewReport.id); setViewReport(null) }}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {tab === 'approved' && (
              <div className="pt-2 border-t">
                <Link
                  to={`/center/reports/${viewReport.studyId}/print`}
                  className="btn-primary w-full justify-center"
                >
                  <Printer className="w-4 h-4" /> Open Print Preview
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectingId} onClose={() => setRejectingId(null)} title="Reject Report" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Provide a reason — the radiologist will see this:</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="input resize-none"
            rows={4}
            placeholder="Specify what needs to be corrected..."
          />
          <div className="flex gap-3">
            <button
              onClick={() => rejectMutation.mutate({ id: rejectingId!, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="btn-danger flex-1 justify-center"
            >
              <XCircle className="w-4 h-4" /> Send Back
            </button>
            <button onClick={() => setRejectingId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
