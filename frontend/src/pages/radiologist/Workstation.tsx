import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Send, Maximize2, Monitor,
  AlertCircle, CheckCircle, Loader2, RefreshCw, FileDown, ChevronDown, Pencil
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { Study, Report } from '../../types'
import { useAuthStore } from '../../store/authStore'

interface ReportTemplate {
  id: number
  templateName: string
  studyDescription: string | null
  modality: string | null
  clinicalHistoryTemplate: string | null
  findingsTemplate: string | null
  impressionTemplate: string | null
  conclusionTemplate: string | null
  recommendationsTemplate: string | null
  docxTemplateUrl: string | null
}

// Route OHIF through nginx (same-origin) so we can intercept study-list navigation.
// WADO/QIDO calls from OHIF go to /wado/ which nginx also proxies to Orthanc.
const OHIF_BASE = '/ohif'

export default function Workstation() {
  const { studyId } = useParams<{ studyId: string }>()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const requiresApproval = user?.requireReportApproval !== false

  const [clinicalHistory,  setClinicalHistory]  = useState('')
  const [findings,         setFindings]         = useState('')
  const [impression,       setImpression]       = useState('')
  const [conclusion,       setConclusion]       = useState('')
  const [recommendations,  setRecommendations]  = useState('')
  const [viewerFullscreen, setViewerFullscreen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const { data: study } = useQuery<Study>({
    queryKey: ['study', studyId],
    queryFn: () => api.get(`/studies/${studyId}`).then(r => r.data),
    enabled: !!studyId,
  })

  const { data: report } = useQuery<Report>({
    queryKey: ['report-study', studyId],
    queryFn: () => api.get(`/reports/study/${studyId}`).then(r => r.data),
    enabled: !!studyId,
    retry: false,
  })

  // All templates for this study's center — used to populate the format dropdown
  const { data: allTemplates = [] } = useQuery<ReportTemplate[]>({
    queryKey: ['templates-for-study', studyId],
    queryFn: () => api.get(`/templates/for-study/${studyId}`).then(r => r.data),
    enabled: !!studyId,
    retry: false,
  })

  // Best auto-match template (pre-selects on first open if no report exists)
  const { data: autoMatch } = useQuery<ReportTemplate>({
    queryKey: ['template-match', studyId],
    queryFn: () => api.get(`/templates/match?studyId=${studyId}`).then(r => r.data),
    enabled: !!studyId && !report,
    retry: false,
  })

  const activeTemplate = allTemplates.find(t => t.id === selectedTemplateId) ?? null

  useEffect(() => {
    if (report) {
      setClinicalHistory(report.clinicalHistory ?? '')
      setFindings(report.findings ?? '')
      setImpression(report.impression ?? '')
      setConclusion(report.conclusion ?? '')
      setRecommendations(report.recommendations ?? '')
    } else if (autoMatch) {
      // Auto-select the best-match template and pre-fill its text
      setSelectedTemplateId(autoMatch.id)
      setClinicalHistory(autoMatch.clinicalHistoryTemplate ?? study?.clinicalHistory ?? '')
      setFindings(autoMatch.findingsTemplate ?? '')
      setImpression(autoMatch.impressionTemplate ?? '')
      setConclusion(autoMatch.conclusionTemplate ?? '')
      setRecommendations(autoMatch.recommendationsTemplate ?? '')
    } else if (study) {
      setClinicalHistory(study.clinicalHistory ?? '')
    }
  }, [report, autoMatch, study])

  const modifyMutation = useMutation({
    mutationFn: () => api.post(`/reports/${report?.id}/request-modification`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-study', studyId] })
      qc.invalidateQueries({ queryKey: ['my-cases'] })
      qc.invalidateQueries({ queryKey: ['my-reports'] })
      toast.success('Report reopened for editing')
    },
    onError: () => toast.error('Failed to reopen report'),
  })

  const saveMutation = useMutation({
    mutationFn: (submit: boolean) => api.post(`/reports/study/${studyId}`, {
      clinicalHistory, findings, impression, conclusion, recommendations, submit
    }),
    onSuccess: (_, submit) => {
      qc.invalidateQueries({ queryKey: ['report-study', studyId] })
      qc.invalidateQueries({ queryKey: ['my-cases'] })
      toast.success(
        submit
          ? requiresApproval
            ? 'Report submitted — awaiting approval'
            : 'Report auto-approved and ready for print'
          : 'Draft saved'
      )
    },
    onError: () => toast.error('Save failed'),
  })

  // Sync study with Orthanc PACS
  const syncMutation = useMutation({
    mutationFn: () => api.post(`/studies/${studyId}/sync-pacs`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study', studyId] })
    },
    onError: () => {
      // silent — user can retry manually
    },
  })

  // Auto-sync on load when studyInstanceUid is missing
  useEffect(() => {
    if (study && !study.studyInstanceUid) {
      syncMutation.mutate()
    }
  }, [study?.id])

  // OHIF viewer — routed through nginx so the iframe is same-origin
  const viewerUrl = study?.studyInstanceUid
    ? `${OHIF_BASE}/viewer?StudyInstanceUIDs=${study.studyInstanceUid}`
    : null

  // Guard: intercept OHIF's client-side (React Router) navigation so the back button
  // cannot land the doctor on the study list showing other centres' studies.
  // OHIF is a SPA — it uses history.pushState/replaceState, not full reloads, so
  // we patch those on the iframe window after each load to catch every navigation.
  const handleIframeLoad = () => {
    try {
      const iframe = iframeRef.current
      if (!iframe || !viewerUrl) return
      const iWin = iframe.contentWindow as Window & { __ohifGuardInstalled?: boolean }
      if (!iWin) return

      const redirect = () => {
        if (!iWin.location.pathname.includes('/viewer')) {
          iWin.location.replace(viewerUrl)
        }
      }

      // Run immediately in case it already loaded on the wrong page
      redirect()

      // Prevent double-installation across re-renders
      if (iWin.__ohifGuardInstalled) return
      iWin.__ohifGuardInstalled = true

      // Patch History API — OHIF navigates via pushState/replaceState
      const orig = {
        push: iWin.history.pushState.bind(iWin.history),
        replace: iWin.history.replaceState.bind(iWin.history),
      }
      iWin.history.pushState = (...args: Parameters<typeof iWin.history.pushState>) => {
        orig.push(...args)
        redirect()
      }
      iWin.history.replaceState = (...args: Parameters<typeof iWin.history.replaceState>) => {
        orig.replace(...args)
        redirect()
      }
      iWin.addEventListener('popstate', redirect)
    } catch {
      // cross-origin fallback — safe to ignore
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-900 ${viewerFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <Link to="/doctor/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm bg-gray-700 text-cyan-400 px-2 py-0.5 rounded">{study?.labNo}</span>
            <span className="text-white font-medium">{study?.patientName}</span>
            <span className="text-gray-400 text-sm">{study?.studyDescription}</span>
            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{study?.modality}</span>
          </div>
        </div>
        <button onClick={() => setViewerFullscreen(v => !v)} className="text-gray-400 hover:text-white">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: DICOM Viewer */}
        <div className={`${viewerFullscreen ? 'flex-1' : 'w-3/5'} bg-black relative flex flex-col`}>
          {viewerUrl ? (
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              className="flex-1 w-full border-0"
              title="DICOM Viewer"
              allow="fullscreen"
              onLoad={handleIframeLoad}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
                  <p className="text-cyan-400 font-medium">Connecting to PACS...</p>
                  <p className="text-xs text-gray-600 mt-1">Searching Orthanc for accession {study?.accessionNumber}</p>
                </>
              ) : (
                <>
                  <Monitor className="w-14 h-14 mb-4 opacity-30" />
                  <p className="text-base font-medium">Images not found in PACS</p>
                  <p className="text-xs text-gray-600 mt-1">Accession: {study?.accessionNumber}</p>
                  <button
                    onClick={() => syncMutation.mutate()}
                    className="mt-5 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry Sync
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Report Editor */}
        {!viewerFullscreen && (
          <div className="w-2/5 bg-white flex flex-col border-l border-gray-200">
            {/* Report header */}
            <div className="px-5 py-3 border-b bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm">Radiology Report</h2>
                {report && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    report.status === 'APPROVED'  ? 'bg-green-100 text-green-700' :
                    report.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700'  :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {report.status}
                  </span>
                )}
              </div>

              {/* Format / template selector */}
              {allTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <select
                      value={selectedTemplateId}
                      disabled={report?.status === 'APPROVED'}
                      onChange={e => {
                        const id = Number(e.target.value) || ''
                        setSelectedTemplateId(id as number | '')
                        if (!id) return
                        const tpl = allTemplates.find(t => t.id === Number(id))
                        if (!tpl) return
                        if (findings || impression) {
                          if (!confirm('Apply this format? Current text will be replaced.')) return
                        }
                        setClinicalHistory(tpl.clinicalHistoryTemplate ?? study?.clinicalHistory ?? '')
                        setFindings(tpl.findingsTemplate ?? '')
                        setImpression(tpl.impressionTemplate ?? '')
                        setConclusion(tpl.conclusionTemplate ?? '')
                        setRecommendations(tpl.recommendationsTemplate ?? '')
                      }}
                      className="w-full text-xs border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none"
                    >
                      <option value="">— Select report format —</option>
                      {allTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.templateName}{t.modality ? ` (${t.modality})` : ''}
                          {t.docxTemplateUrl ? ' ⬇' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Download Word format if the selected template has one */}
                  {activeTemplate?.docxTemplateUrl && (
                    <a
                      href={activeTemplate.docxTemplateUrl}
                      download
                      title="Download Word format for this template"
                      className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Word
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Study info */}
            <div className="px-5 py-3 border-b bg-blue-50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  ['Patient', study?.patientName],
                  ['Study', study?.studyDescription],
                  ['Modality', study?.modality],
                  ['Body Part', study?.bodyPart ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}><span className="text-gray-500">{k}: </span><span className="font-medium text-gray-800">{v}</span></div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Clinical History', value: clinicalHistory, setter: setClinicalHistory, rows: 3, placeholder: 'Patient clinical history...' },
                { label: 'Findings *',       value: findings,        setter: setFindings,        rows: 6, placeholder: 'Describe radiological findings in detail...' },
                { label: 'Impression *',     value: impression,      setter: setImpression,      rows: 4, placeholder: 'Radiological impression / diagnosis...' },
                { label: 'Conclusion',       value: conclusion,      setter: setConclusion,      rows: 3, placeholder: 'Conclusion...' },
                { label: 'Recommendations', value: recommendations,  setter: setRecommendations, rows: 2, placeholder: 'Recommendations for follow-up...' },
              ].map(({ label, value, setter, rows, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{label}</label>
                  <textarea value={value} onChange={e => setter(e.target.value)}
                    rows={rows} placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    disabled={report?.status === 'APPROVED' || report?.status === 'SUBMITTED'}
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            {(!report || report.status === 'DRAFT' || report.status === 'REJECTED') && (
              <div className="px-5 py-4 border-t bg-gray-50 flex gap-3">
                <button onClick={() => saveMutation.mutate(false)}
                  disabled={saveMutation.isPending} className="btn-secondary flex-1 justify-center">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>
                <button onClick={() => {
                  if (!findings.trim() || !impression.trim()) {
                    toast.error('Findings and Impression are required')
                    return
                  }
                  saveMutation.mutate(true)
                }} disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </button>
              </div>
            )}

            {report?.status === 'APPROVED' && (
              <div className="px-5 py-4 border-t bg-green-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Approved by {report.approvedByName}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(requiresApproval
                      ? 'Reopen this approved report for editing? It will need to be re-submitted for approval.'
                      : 'Reopen this approved report for editing? It will be auto-approved again on re-submission.')) {
                      modifyMutation.mutate()
                    }
                  }}
                  disabled={modifyMutation.isPending}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  {modifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                  Modify Report
                </button>
              </div>
            )}

            {report?.status === 'SUBMITTED' && (
              <div className="px-5 py-3 border-t bg-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700">
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">Submitted — awaiting approval</span>
                </div>
                <button
                  onClick={() => modifyMutation.mutate()}
                  disabled={modifyMutation.isPending}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  {modifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                  Modify Report
                </button>
              </div>
            )}

            {report?.status === 'REJECTED' && (
              <div className="px-5 py-4 border-t bg-red-50">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Report rejected</span>
                </div>
                {report.rejectionReason && (
                  <p className="text-xs text-red-600">{report.rejectionReason}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
