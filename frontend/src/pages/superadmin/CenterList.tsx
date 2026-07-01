import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Building2, Plus, Power, CheckCircle, XCircle,
  AlertTriangle, Search, Loader2, KeyRound, Eye, EyeOff, Copy, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { CenterDetail, CenterPlan, SubscriptionStatus } from '../../types'
import { fmtDateTime } from '../../utils/date'

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'

const PLAN_STYLE: Record<CenterPlan, string> = {
  TRIAL:        'bg-gray-100 text-gray-700 border-gray-200',
  STARTER:      'bg-blue-50 text-blue-700 border-blue-200',
  PROFESSIONAL: 'bg-violet-50 text-violet-700 border-violet-200',
  ENTERPRISE:   'bg-amber-50 text-amber-700 border-amber-200',
}

const SUB_STYLE: Record<SubscriptionStatus, string> = {
  ACTIVE:    'bg-green-50 text-green-700',
  TRIAL:     'bg-blue-50 text-blue-700',
  EXPIRED:   'bg-red-50 text-red-700',
  SUSPENDED: 'bg-orange-50 text-orange-700',
}

// ── Reset-password result dialog ────────────────────────────────────────────
interface ResetResult {
  centerName:    string
  adminUsername: string
  adminEmail:    string
  newPassword:   string
}

function NewPasswordDialog({ result, onClose }: { result: ResetResult; onClose: () => void }) {
  const [show, setShow] = useState(false)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Password Reset</h2>
              <p className="text-sm text-gray-500">{result.centerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            ⚠️ Copy and share this password securely — it will <strong>not</strong> be shown again.
          </p>

          {/* Admin info */}
          {[
            { label: 'Username', value: result.adminUsername },
            { label: 'Email',    value: result.adminEmail },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-mono text-gray-800">{value}</span>
                <button onClick={() => copy(value, label)} className="text-gray-400 hover:text-violet-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm font-mono text-gray-800">
                {show ? result.newPassword : '••••••••••••'}
              </span>
              <button onClick={() => setShow(v => !v)} className="text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => copy(result.newPassword, 'Password')} className="text-gray-400 hover:text-violet-600">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Any previous account lock has been cleared. The admin can log in immediately.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm dialog before resetting ─────────────────────────────────────────
function ConfirmResetDialog({
  centerName,
  onConfirm,
  onCancel,
  isPending,
}: {
  centerName: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Reset Admin Password?</h2>
            <p className="text-sm text-gray-500">{centerName}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          This will generate a <strong>new random password</strong> for the Center Admin of{' '}
          <strong>{centerName}</strong> and invalidate the current one. Any account lock will also be cleared.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60">
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <KeyRound className="w-4 h-4" />}
            Reset Password
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CenterList() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')

  // Which center we're about to reset (shows confirm dialog)
  const [confirmReset, setConfirmReset] = useState<{ id: number; name: string } | null>(null)
  // Result to show after a successful reset
  const [resetResult, setResetResult] = useState<ResetResult | null>(null)

  const { data: centers = [], isLoading } = useQuery<CenterDetail[]>({
    queryKey: ['admin-centers'],
    queryFn: () => api.get('/admin/centers').then(r => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/centers/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (centerId: number) =>
      api.post(`/admin/centers/${centerId}/reset-admin-password`).then(r => r.data as ResetResult),
    onSuccess: (data) => {
      setConfirmReset(null)
      setResetResult(data)
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setConfirmReset(null)
      toast.error(e?.response?.data?.message ?? 'Failed to reset password')
    },
  })

  const filtered = centers
    .filter(c => {
      if (filter === 'ACTIVE')   return c.isActive && c.subscriptionStatus !== 'EXPIRED'
      if (filter === 'INACTIVE') return !c.isActive
      if (filter === 'EXPIRED')  return c.subscriptionStatus === 'EXPIRED'
      return true
    })
    .filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    )

  const counts = {
    ALL:      centers.length,
    ACTIVE:   centers.filter(c => c.isActive && c.subscriptionStatus !== 'EXPIRED').length,
    INACTIVE: centers.filter(c => !c.isActive).length,
    EXPIRED:  centers.filter(c => c.subscriptionStatus === 'EXPIRED').length,
  }

  const isPlanExpiringSoon = (c: CenterDetail) => {
    if (!c.planEndDate) return false
    const days = (new Date(c.planEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days > 0 && days <= 14
  }

  return (
    <div>
      {/* Confirm reset dialog */}
      {confirmReset && (
        <ConfirmResetDialog
          centerName={confirmReset.name}
          onConfirm={() => resetPasswordMutation.mutate(confirmReset.id)}
          onCancel={() => setConfirmReset(null)}
          isPending={resetPasswordMutation.isPending}
        />
      )}

      {/* New password reveal dialog */}
      {resetResult && (
        <NewPasswordDialog result={resetResult} onClose={() => setResetResult(null)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Centers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all diagnostic centers</p>
        </div>
        <Link to="/admin/centers/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Center
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',    count: counts.ALL,      icon: Building2,     bg: 'bg-gray-50',    text: 'text-gray-600' },
          { label: 'Active',   count: counts.ACTIVE,   icon: CheckCircle,   bg: 'bg-green-50',   text: 'text-green-600' },
          { label: 'Inactive', count: counts.INACTIVE, icon: XCircle,       bg: 'bg-gray-50',    text: 'text-gray-500' },
          { label: 'Expired',  count: counts.EXPIRED,  icon: AlertTriangle, bg: 'bg-red-50',     text: 'text-red-600' },
        ].map(({ label, count, icon: Icon, bg, text }) => (
          <div key={label} className="card p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === f ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
              }`}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search centers..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Center', 'Contact', 'Plan', 'Subscription', 'Patients', 'Studies', 'Users', 'Plan Expiry', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={9}><div className="td animate-pulse h-5 bg-gray-100 rounded" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="td text-center py-12 text-gray-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No centers found</p>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.isActive ? 'opacity-60' : ''}`}>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      {c.logoUrl
                        ? <img src={c.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                        : <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">{c.name[0]}</div>
                      }
                      <div>
                        <div className="font-semibold text-gray-800">{c.name}</div>
                        {(c.city || c.state) && (
                          <div className="text-xs text-gray-400">{[c.city, c.state].filter(Boolean).join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <div className="text-sm text-gray-700">{c.contactPerson ?? '—'}</div>
                    <div className="text-xs text-gray-400">{c.phone ?? c.email ?? ''}</div>
                  </td>
                  <td className="td">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${PLAN_STYLE[c.plan]}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STYLE[c.subscriptionStatus]}`}>
                      {c.subscriptionStatus}
                    </span>
                  </td>
                  <td className="td text-sm font-medium text-gray-700">{c.totalPatients.toLocaleString()}</td>
                  <td className="td text-sm font-medium text-gray-700">{c.totalStudies.toLocaleString()}</td>
                  <td className="td text-sm font-medium text-gray-700">{c.totalUsers}</td>
                  <td className="td">
                    {c.planEndDate ? (
                      <span className={`text-xs ${isPlanExpiringSoon(c) ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                        {isPlanExpiringSoon(c) && '⚠ '}
                        {fmtDateTime(c.planEndDate)}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/admin/centers/${c.id}/edit`}
                        className="btn-primary text-xs py-1 px-2.5">
                        Manage
                      </Link>
                      {/* Reset admin password */}
                      <button
                        onClick={() => setConfirmReset({ id: c.id, name: c.name })}
                        title="Reset Center Admin password"
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {/* Toggle active/inactive */}
                      <button
                        onClick={() => toggleMutation.mutate(c.id)}
                        disabled={toggleMutation.isPending}
                        title={c.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          c.isActive
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-green-50 text-green-500 hover:bg-green-100'
                        }`}>
                        {toggleMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Power className="w-3.5 h-3.5" />
                        }
                      </button>
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
