import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Upload, X, Users, Activity,
  TrendingUp, Calendar, Loader2, Building2, CheckCircle,
  KeyRound, Copy, Eye, EyeOff, ShieldCheck, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { CenterDetail, CenterPlan, SubscriptionStatus } from '../../types'
import { fmtDateTime } from '../../utils/date'
import { generatePassword } from '../../utils/password'

const PLANS: { value: CenterPlan; label: string; desc: string }[] = [
  { value: 'TRIAL',        label: 'Trial',        desc: 'Free 30 days, 100 studies/month' },
  { value: 'STARTER',      label: 'Starter',      desc: 'Basic plan, 300 studies/month' },
  { value: 'PROFESSIONAL', label: 'Professional', desc: 'Advanced plan, 1000 studies/month' },
  { value: 'ENTERPRISE',   label: 'Enterprise',   desc: 'Unlimited studies, priority support' },
]

const SUB_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED']

const PLAN_MAX: Record<CenterPlan, number> = {
  TRIAL: 100, STARTER: 300, PROFESSIONAL: 1000, ENTERPRISE: 99999,
}

interface CreatedCenterResponse {
  center: CenterDetail
  adminCreated: boolean
  adminUsername: string | null
  adminPassword: string | null
  adminFullName: string | null
  adminEmail: string | null
}

function CredentialsDialog({ data, onClose }: { data: CreatedCenterResponse; onClose: () => void }) {
  const [showPass, setShowPass] = useState(false)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Center Created!</h2>
            <p className="text-sm text-gray-500">{data.center.name}</p>
          </div>
        </div>

        {/* Credentials */}
        {data.adminCreated ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ Save these credentials now — the password won't be shown again.
            </p>

            {[
              { label: 'Username',  value: data.adminUsername ?? '', type: 'text' },
              { label: 'Full Name', value: data.adminFullName ?? '', type: 'text' },
              { label: 'Email',     value: data.adminEmail    ?? '', type: 'text' },
            ].map(({ label, value }) => value && (
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

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-mono text-gray-800">
                  {showPass ? data.adminPassword : '••••••••'}
                </span>
                <button onClick={() => setShowPass(v => !v)} className="text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copy(data.adminPassword ?? '', 'Password')} className="text-gray-400 hover:text-violet-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs text-violet-700">
              <strong>Role:</strong> Center Admin · Can log in at <strong>localhost:3000</strong>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-600">
              Center was created without an admin account. You can add users later from the Users section.
            </p>
          </div>
        )}

        <div className="px-6 pb-6">
          <button onClick={onClose} className="btn-primary w-full justify-center">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CenterForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = !!id
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [createdData, setCreatedData] = useState<CreatedCenterResponse | null>(null)
  const [showAdminPass, setShowAdminPass] = useState(false)

  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', website: '',
    contactPerson: '', city: '', state: '', pincode: '', notes: '',
    plan: 'TRIAL' as CenterPlan,
    subscriptionStatus: 'TRIAL' as SubscriptionStatus,
    planStartDate: '', planEndDate: '',
    maxStudiesPerMonth: 100,
  })

  const [adminForm, setAdminForm] = useState({
    adminUsername: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  })

  const { data: center } = useQuery<CenterDetail>({
    queryKey: ['admin-center', id],
    queryFn: () => api.get(`/admin/centers/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (center) {
      setForm({
        name: center.name,
        address: center.address ?? '',
        phone: center.phone ?? '',
        email: center.email ?? '',
        website: center.website ?? '',
        contactPerson: center.contactPerson ?? '',
        city: center.city ?? '',
        state: center.state ?? '',
        pincode: center.pincode ?? '',
        notes: center.notes ?? '',
        plan: center.plan,
        subscriptionStatus: center.subscriptionStatus,
        planStartDate: center.planStartDate ? center.planStartDate.substring(0, 10) : '',
        planEndDate: center.planEndDate ? center.planEndDate.substring(0, 10) : '',
        maxStudiesPerMonth: center.maxStudiesPerMonth,
      })
      if (center.logoUrl) setLogoPreview(center.logoUrl)
    }
  }, [center])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        planStartDate: form.planStartDate ? `${form.planStartDate}T00:00:00` : null,
        planEndDate:   form.planEndDate   ? `${form.planEndDate}T23:59:59`   : null,
        ...(isEdit ? {} : adminForm),
      }
      if (isEdit) {
        const center = await api.put(`/admin/centers/${id}`, payload).then(r => r.data)
        return { center, adminCreated: false, adminUsername: null, adminPassword: null, adminFullName: null, adminEmail: null } as CreatedCenterResponse
      }
      return api.post('/admin/centers', payload).then(r => r.data) as Promise<CreatedCenterResponse>
    },
    onSuccess: async (result: CreatedCenterResponse) => {
      const centerId = result.center?.id ?? id
      if (logoFile && centerId) {
        const fd = new FormData()
        fd.append('file', logoFile)
        await api.post(`/admin/centers/${centerId}/logo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })

      if (isEdit) {
        toast.success('Center updated')
        navigate('/admin/centers')
      } else {
        setCreatedData(result)
      }
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    },
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const setAdmin = (k: keyof typeof adminForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAdminForm(f => ({ ...f, [k]: e.target.value }))

  const handlePlanChange = (plan: CenterPlan) => {
    setForm(f => ({ ...f, plan, maxStudiesPerMonth: PLAN_MAX[plan] }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

  return (
    <div>
      {createdData && (
        <CredentialsDialog data={createdData} onClose={() => navigate('/admin/centers')} />
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/centers')} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Center' : 'Add New Center'}</h1>
            {isEdit && center && (
              <p className="text-gray-500 text-sm mt-0.5">
                {center.totalPatients} patients · {center.totalStudies} studies · {center.totalUsers} users
              </p>
            )}
          </div>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="btn-primary">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Create Center'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: main form */}
        <div className="col-span-2 space-y-6">

          {/* Basic Info */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-500" /> Center Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Center Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="ABC Diagnostic Center"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                <input value={form.contactPerson} onChange={set('contactPerson')} placeholder="Dr. John Doe"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91-9876543210"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input value={form.email} onChange={set('email')} type="email" placeholder="center@example.com"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                <input value={form.website} onChange={set('website')} placeholder="https://center.com"
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                <input value={form.address} onChange={set('address')} placeholder="123 Medical Street"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                <input value={form.city} onChange={set('city')} placeholder="Mumbai" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                <input value={form.state} onChange={set('state')} placeholder="Maharashtra" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                <input value={form.pincode} onChange={set('pincode')} placeholder="400001" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-500" /> Subscription Plan
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {PLANS.map(p => (
                <button key={p.value} type="button" onClick={() => handlePlanChange(p.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.plan === p.value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className={`text-sm font-semibold mb-1 ${form.plan === p.value ? 'text-violet-700' : 'text-gray-700'}`}>
                    {p.label}
                    {form.plan === p.value && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-violet-600" />}
                  </div>
                  <div className="text-xs text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subscription Status</label>
                <select value={form.subscriptionStatus}
                  onChange={e => setForm(f => ({ ...f, subscriptionStatus: e.target.value as SubscriptionStatus }))}
                  className={inputCls}>
                  {SUB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Studies / Month</label>
                <input type="number" value={form.maxStudiesPerMonth}
                  onChange={e => setForm(f => ({ ...f, maxStudiesPerMonth: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Start Date</label>
                <input type="date" value={form.planStartDate} onChange={set('planStartDate')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan End Date</label>
                <input type="date" value={form.planEndDate} onChange={set('planEndDate')} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Admin Account — only shown when creating */}
          {!isEdit && (
            <div className="card p-6 border-2 border-violet-100">
              <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-violet-500" /> Initial Admin Account
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Optionally create a Center Admin login for this center. Leave blank to add users later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input value={adminForm.adminUsername} onChange={setAdmin('adminUsername')}
                    placeholder="e.g. abcadmin" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input value={adminForm.adminFullName} onChange={setAdmin('adminFullName')}
                    placeholder="e.g. ABC Admin" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input value={adminForm.adminEmail} onChange={setAdmin('adminEmail')}
                    type="email" placeholder="admin@abcdiag.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Password <span className="text-gray-400 font-normal">(auto-generated if blank)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input value={adminForm.adminPassword} onChange={setAdmin('adminPassword')}
                        type={showAdminPass ? 'text' : 'password'}
                        placeholder="Leave blank to auto-generate"
                        className={`${inputCls} pr-10`} />
                      <button type="button" onClick={() => setShowAdminPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generatePassword()
                        setAdminForm(f => ({ ...f, adminPassword: pwd }))
                        setShowAdminPass(true)
                        navigator.clipboard.writeText(pwd).then(() =>
                          toast.success('Password generated & copied to clipboard')
                        ).catch(() =>
                          toast.success('Password generated')
                        )
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      title="Generate a secure random password"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate
                    </button>
                  </div>
                </div>
              </div>
              {adminForm.adminUsername && (
                <p className="mt-3 text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2">
                  A <strong>Center Admin</strong> account will be created for <strong>{adminForm.adminUsername}</strong>.
                  The credentials will be shown after the center is created.
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Internal Notes</h2>
            <textarea value={form.notes} onChange={set('notes')} rows={3}
              placeholder="Notes about this center (internal only)..."
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Right: logo + stats */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Center Logo</h2>
            <div className="flex flex-col items-center">
              <div onClick={() => fileRef.current?.click()}
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors overflow-hidden mb-3">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  : <div className="text-center text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-xs">Upload logo</p>
                    </div>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="btn-secondary text-xs py-1 px-3">
                  <Upload className="w-3 h-3" /> Browse
                </button>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null) }}
                    className="text-xs py-1 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 5MB</p>
            </div>
          </div>

          {/* Stats (edit only) */}
          {isEdit && center && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Center Stats</h2>
              <div className="space-y-3">
                {[
                  { label: 'Total Patients',     value: center.totalPatients,  icon: Users,      color: 'text-blue-500' },
                  { label: 'Total Studies',      value: center.totalStudies,   icon: TrendingUp, color: 'text-violet-500' },
                  { label: 'Total Users',        value: center.totalUsers,     icon: Users,      color: 'text-green-500' },
                  { label: 'This Month Studies', value: center.monthlyStudies, icon: Activity,   color: 'text-amber-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon className={`w-4 h-4 ${color}`} />
                      {label}
                    </div>
                    <span className="font-bold text-gray-800">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                Created {fmtDateTime(center.createdAt)}
              </div>
            </div>
          )}

          {isEdit && center && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-800 mb-3">Quick Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${center.isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {center.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly usage</span>
                  <span className="font-medium text-gray-800">
                    {center.monthlyStudies} / {center.maxStudiesPerMonth}
                  </span>
                </div>
                {center.planEndDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium text-gray-800">{fmtDateTime(center.planEndDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
