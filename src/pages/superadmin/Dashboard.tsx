import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Building2, Users, Activity, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Clock, ChevronRight
} from 'lucide-react'
import api from '../../services/api'
import { GlobalStats, CenterDetail, CenterPlan, SubscriptionStatus } from '../../types'
import { fmtDateTime } from '../../utils/date'

const PLAN_COLORS: Record<CenterPlan, string> = {
  TRIAL:        'bg-gray-100 text-gray-700',
  STARTER:      'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-violet-100 text-violet-700',
  ENTERPRISE:   'bg-amber-100 text-amber-700',
}

const SUB_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  TRIAL:     'bg-blue-100 text-blue-700',
  EXPIRED:   'bg-red-100 text-red-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
}

export default function AdminDashboard() {
  const { data: stats } = useQuery<GlobalStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: centers = [] } = useQuery<CenterDetail[]>({
    queryKey: ['admin-centers'],
    queryFn: () => api.get('/admin/centers').then(r => r.data),
  })

  const statCards = [
    { label: 'Total Centers',   value: stats?.totalCenters   ?? 0, icon: Building2,     color: 'bg-violet-50 text-violet-600' },
    { label: 'Active Centers',  value: stats?.activeCenters  ?? 0, icon: CheckCircle,   color: 'bg-green-50 text-green-600' },
    { label: 'Expired Plans',   value: stats?.expiredSubscriptions ?? 0, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Total Users',     value: stats?.totalUsers     ?? 0, icon: Users,         color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Patients',  value: stats?.totalPatients  ?? 0, icon: Activity,      color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Total Studies',   value: stats?.totalStudies   ?? 0, icon: TrendingUp,    color: 'bg-indigo-50 text-indigo-600' },
    { label: 'This Month',      value: stats?.monthlyStudies ?? 0, icon: Clock,         color: 'bg-amber-50 text-amber-600' },
    { label: 'Inactive Centers', value: stats?.inactiveCenters ?? 0, icon: XCircle,    color: 'bg-gray-50 text-gray-600' },
  ]

  const planDist = [
    { label: 'Trial',        count: stats?.trialCenters        ?? 0, color: 'bg-gray-200' },
    { label: 'Starter',      count: stats?.starterCenters      ?? 0, color: 'bg-blue-400' },
    { label: 'Professional', count: stats?.professionalCenters ?? 0, color: 'bg-violet-500' },
    { label: 'Enterprise',   count: stats?.enterpriseCenters   ?? 0, color: 'bg-amber-500' },
  ]
  const totalForBar = Math.max(1, (stats?.totalCenters ?? 0))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform-wide overview</p>
        </div>
        <Link to="/admin/centers/new" className="btn-primary">
          <Building2 className="w-4 h-4" /> Add Center
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Plan Distribution</h2>
        <div className="flex h-4 rounded-full overflow-hidden mb-3">
          {planDist.map(p => (
            <div key={p.label}
              className={`${p.color} transition-all`}
              style={{ width: `${(p.count / totalForBar) * 100}%` }}
            />
          ))}
          {stats?.totalCenters === 0 && <div className="bg-gray-100 flex-1 rounded-full" />}
        </div>
        <div className="flex gap-6">
          {planDist.map(p => (
            <div key={p.label} className="flex items-center gap-1.5 text-sm">
              <span className={`w-3 h-3 rounded-sm ${p.color}`} />
              <span className="text-gray-600">{p.label}</span>
              <span className="font-semibold text-gray-800">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Centers table */}
      <div className="card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">All Centers</h2>
          <Link to="/admin/centers" className="text-xs text-violet-600 hover:underline flex items-center gap-1">
            Manage all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Center', 'Plan', 'Status', 'Patients', 'Studies', 'Users', 'Plan Expiry', ''].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {centers.length === 0 ? (
                <tr><td colSpan={8} className="td text-center py-10 text-gray-400">
                  No centers yet. <Link to="/admin/centers/new" className="text-violet-600 underline">Add one →</Link>
                </td></tr>
              ) : centers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {c.logoUrl
                        ? <img src={c.logoUrl} alt="" className="w-7 h-7 rounded object-cover" />
                        : <div className="w-7 h-7 rounded bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">{c.name[0]}</div>
                      }
                      <div>
                        <div className="font-medium text-gray-800">{c.name}</div>
                        {c.city && <div className="text-xs text-gray-400">{c.city}{c.state ? `, ${c.state}` : ''}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[c.plan]}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_COLORS[c.subscriptionStatus]}`}>
                        {c.subscriptionStatus}
                      </span>
                    </div>
                  </td>
                  <td className="td text-sm text-gray-700">{c.totalPatients.toLocaleString()}</td>
                  <td className="td text-sm text-gray-700">{c.totalStudies.toLocaleString()}</td>
                  <td className="td text-sm text-gray-700">{c.totalUsers}</td>
                  <td className="td text-xs text-gray-500">
                    {c.planEndDate ? fmtDateTime(c.planEndDate) : '—'}
                  </td>
                  <td className="td">
                    <Link to={`/admin/centers/${c.id}/edit`}
                      className="text-xs text-violet-600 hover:underline">
                      Manage
                    </Link>
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
