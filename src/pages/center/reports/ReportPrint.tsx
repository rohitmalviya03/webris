import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../../../services/api'
import { Report } from '../../../types'
import { fmtDateTime } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'

export default function ReportPrint() {
  const { studyId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: ['report-print', studyId],
    queryFn: () => api.get(`/reports/study/${studyId}`).then(r => r.data),
    enabled: !!studyId,
  })

  const handleDownload = async () => {
    const res = await api.get(`/reports/${report!.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${report!.labNo}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  if (!report) return <div className="text-center py-20 text-gray-400">Report not found</div>

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="page-title">Report — {report.labNo}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownload} className="btn-secondary">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Printable area */}
      <div className="bg-white border rounded-xl shadow-sm p-10 max-w-3xl mx-auto print:border-0 print:shadow-none print:p-0 print:max-w-none">

        {/* Center header */}
        <div className="text-center border-b-2 border-gray-800 pb-5 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase">
            {user?.centerName ?? 'Diagnostic Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-semibold tracking-widest">RADIOLOGY REPORT</p>
        </div>

        {/* Patient & study info grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
          {[
            ['Patient Name',  report.patientName],
            ['Lab No',        report.labNo],
            ['Study',         report.studyDescription],
            ['Radiologist',   `${report.doctorName}${report.doctorQualification ? ', ' + report.doctorQualification : ''}`],
            ['Report Date',   fmtDateTime(report.approvedAt ?? report.createdAt)],
            ['Status',        report.status],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-500 font-medium min-w-[110px]">{label}:</span>
              <span className="text-gray-900 font-semibold">{value}</span>
            </div>
          ))}
        </div>

        <hr className="border-gray-300 mb-5" />

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
        <div className="flex justify-end mt-4">
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
          <p className="text-xs text-gray-400 mt-4 text-center print:block hidden">
            Approved by: {report.approvedByName}
          </p>
        )}
      </div>
    </div>
  )
}
