import { useState, useEffect } from 'react'
import { Settings, ShieldCheck, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../../services/api'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

interface CenterSettingsData {
  id: number
  name: string
  requireReportApproval: boolean
}

export default function CenterSettings() {
  const { user, login } = useAuthStore()
  const [settings, setSettings] = useState<CenterSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<CenterSettingsData>('/centers/my')
      .then((r) => setSettings(r.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (value: boolean) => {
    if (!settings) return
    setSaving(true)
    try {
      const { data } = await api.patch<CenterSettingsData>('/centers/settings', {
        requireReportApproval: value,
      })
      setSettings(data)

      // Keep the auth store in sync so the radiologist workstation reflects the change
      if (user) {
        login({ ...user, requireReportApproval: data.requireReportApproval })
      }

      toast.success(
        value
          ? 'Reports will now require manual approval before delivery.'
          : 'Reports will be auto-approved once submitted by the radiologist.'
      )
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading settings…
      </div>
    )
  }

  if (!settings) return null

  const approvalOn = settings.requireReportApproval

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-gray-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Center Settings</h1>
          <p className="text-sm text-gray-500">{settings.name}</p>
        </div>
      </div>

      {/* Report Approval Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            approvalOn ? 'bg-blue-50' : 'bg-green-50'
          }`}>
            {approvalOn
              ? <ShieldCheck className="w-5 h-5 text-blue-600" />
              : <Zap className="w-5 h-5 text-green-600" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Report Verification</h2>
            <p className="text-sm text-gray-500 mt-1">
              Control whether radiologist reports need to be reviewed by a
              <strong> Report Approver</strong> or <strong>Center Admin</strong> before they are
              marked as final and available for print.
            </p>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium ${
              approvalOn
                ? 'bg-blue-50 text-blue-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {approvalOn
                ? <><ShieldCheck className="w-3.5 h-3.5" /> Manual Approval Required</>
                : <><Zap className="w-3.5 h-3.5" /> Auto-Approval Enabled</>
              }
            </div>

            {/* Workflow description */}
            <div className="mt-4 grid grid-cols-1 gap-3">
              <WorkflowOption
                active={approvalOn}
                icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
                title="Require Approval (Recommended)"
                description="Radiologist submits → Report Approver / Center Admin reviews → Approved or Rejected → Available for print"
                onClick={() => !approvalOn && handleToggle(true)}
                disabled={saving || approvalOn}
                colorActive="blue"
              />
              <WorkflowOption
                active={!approvalOn}
                icon={<Zap className="w-4 h-4 text-green-600" />}
                title="Auto-Approve"
                description="Radiologist submits → Report instantly marked Approved → Available for print immediately"
                onClick={() => approvalOn && handleToggle(false)}
                disabled={saving || !approvalOn}
                colorActive="green"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-4 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          This setting applies to all new report submissions going forward. Reports already
          in <strong>Submitted</strong> or <strong>Approved</strong> status are not affected.
        </span>
      </div>
    </div>
  )
}

interface WorkflowOptionProps {
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  disabled: boolean
  colorActive: 'blue' | 'green'
}

function WorkflowOption({ active, icon, title, description, onClick, disabled, colorActive }: WorkflowOptionProps) {
  const borderClass = active
    ? colorActive === 'blue'
      ? 'border-blue-400 bg-blue-50'
      : 'border-green-400 bg-green-50'
    : 'border-gray-200 bg-white hover:border-gray-300'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${borderClass} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            {active && <CheckCircle className={`w-4 h-4 ${colorActive === 'blue' ? 'text-blue-600' : 'text-green-600'}`} />}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  )
}
