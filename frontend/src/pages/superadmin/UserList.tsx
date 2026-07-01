import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Users, Shield, UserCheck, Stethoscope,
  Lock, KeyRound, RefreshCw, Eye, EyeOff, Copy, CheckCircle, X, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { fmtDateTime } from '../../utils/date'

interface AdminUser {
  id: number
  username: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  center?: { id: number; name: string } | null
}

interface PasswordResult {
  username: string
  fullName: string
  plainPassword: string
}

const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN:    'bg-violet-100 text-violet-700',
  CENTER_ADMIN:   'bg-blue-100 text-blue-700',
  RECEPTIONIST:   'bg-cyan-100 text-cyan-700',
  TECHNICIAN:     'bg-indigo-100 text-indigo-700',
  RADIOLOGIST:    'bg-green-100 text-green-700',
  REPORT_APPROVER:'bg-amber-100 text-amber-700',
}

const ROLE_ICON: Record<string, React.ElementType> = {
  SUPER_ADMIN:    Shield,
  CENTER_ADMIN:   UserCheck,
  RADIOLOGIST:    Stethoscope,
}

function ChangePasswordModal({
  user,
  onClose,
}: {
  user: AdminUser
  onClose: () => void
}) {
  const [mode, setMode]           = useState<'GENERATE' | 'MANUAL' | null>(null)
  const [manualPwd, setManualPwd] = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [result, setResult]       = useState<PasswordResult | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: { mode: string; newPassword?: string }) =>
      api.put(`/auth/users/${user.id}/change-password`, payload).then(r => r.data as PasswordResult),
    onSuccess: data => setResult(data),
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to change password'),
  })

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Password copied')
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="p-6 border-b flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Password Changed</h2>
              <p className="text-sm text-gray-500">{result.fullName} · @{result.username}</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ Share this password securely — it won't be shown again.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <span className="flex-1 text-sm font-mono text-gray-800">
                  {showPwd ? result.plainPassword : '••••••••••'}
                </span>
                <button onClick={() => setShowPwd(v => !v)} className="text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copy(result.plainPassword)} className="text-gray-400 hover:text-primary-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-400">{user.fullName} · @{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Choose how to set the new password:</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setMode('GENERATE'); setManualPwd('') }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                mode === 'GENERATE'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RefreshCw className={`w-6 h-6 ${mode === 'GENERATE' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div>
                <div className={`text-sm font-semibold ${mode === 'GENERATE' ? 'text-primary-700' : 'text-gray-700'}`}>
                  Generate
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Auto-create a secure password</div>
              </div>
            </button>

            <button
              onClick={() => setMode('MANUAL')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                mode === 'MANUAL'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <KeyRound className={`w-6 h-6 ${mode === 'MANUAL' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div>
                <div className={`text-sm font-semibold ${mode === 'MANUAL' ? 'text-primary-700' : 'text-gray-700'}`}>
                  Set Password
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Type a custom password</div>
              </div>
            </button>
          </div>

          {mode === 'MANUAL' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={manualPwd}
                  onChange={e => setManualPwd(e.target.value)}
                  placeholder="Enter new password"
                  className="input pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'GENERATE' && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              A cryptographically secure 10-character password will be generated and shown once after saving.
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            disabled={!mode || mutation.isPending || (mode === 'MANUAL' && !manualPwd.trim())}
            onClick={() => {
              if (mode === 'GENERATE') mutation.mutate({ mode: 'GENERATE' })
              else if (mode === 'MANUAL') {
                if (!manualPwd.trim()) { toast.error('Enter a password'); return }
                mutation.mutate({ mode: 'MANUAL', newPassword: manualPwd })
              }
            }}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Lock className="w-4 h-4" />}
            {mutation.isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserList() {
  const [changePwdUser, setChangePwdUser] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  })

  const byRole = (role: string) => users.filter(u => u.role === role).length

  return (
    <div>
      {changePwdUser && (
        <ChangePasswordModal user={changePwdUser} onClose={() => setChangePwdUser(null)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">All Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} total users across all centers</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {['SUPER_ADMIN','CENTER_ADMIN','RECEPTIONIST','TECHNICIAN','RADIOLOGIST','REPORT_APPROVER'].map(r => {
          const Icon = ROLE_ICON[r] ?? Users
          return (
            <div key={r} className="card p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <div className="text-xl font-bold">{byRole(r)}</div>
              <div className="text-xs text-gray-500">{r.replace(/_/g, ' ')}</div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['User', 'Role', 'Center', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="td animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm flex items-center justify-center">
                        {u.fullName?.[0] ?? '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{u.fullName}</div>
                        <div className="text-xs text-gray-400">@{u.username} · {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="td text-sm text-gray-600">
                    {u.center?.name ?? <span className="text-gray-400 italic">Global</span>}
                  </td>
                  <td className="td">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td text-xs text-gray-400">{fmtDateTime(u.createdAt)}</td>
                  <td className="td">
                    <button
                      onClick={() => setChangePwdUser(u)}
                      title="Change password"
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" /> Change Password
                    </button>
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
