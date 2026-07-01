import { useQuery } from '@tanstack/react-query'
import { Users, Stethoscope, FileText, CheckCircle, UserCheck, Activity, TrendingUp } from 'lucide-react'
import api from '../../services/api'
import { DashboardStats } from '../../types'
import { useAuthStore } from '../../store/authStore'

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}

function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

export default function CenterDashboard() {
  const user = useAuthStore(s => s.user)
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.centerName ?? 'Center Portal'} — Overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-6 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Patients"     value={stats?.totalPatients ?? 0}    icon={Users}       color="text-blue-600"   bg="bg-blue-50" />
          <StatCard label="Today's Studies"    value={stats?.todaysStudies ?? 0}    icon={Stethoscope} color="text-cyan-600"   bg="bg-cyan-50" />
          <StatCard label="Total Studies"      value={stats?.totalStudies ?? 0}     icon={TrendingUp}  color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Assigned Cases"     value={stats?.assignedCases ?? 0}    icon={UserCheck}   color="text-yellow-600" bg="bg-yellow-50" />
          <StatCard label="Pending Reports"    value={stats?.pendingReports ?? 0}   icon={FileText}    color="text-orange-600" bg="bg-orange-50" />
          <StatCard label="Reports Submitted"   value={stats?.completedReports ?? 0} icon={CheckCircle} color="text-green-600"   bg="bg-green-50" />
          <StatCard label="Ready to Print"     value={stats?.approvedReports ?? 0}  icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" />
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/center/patients/new" className="card p-6 hover:shadow-md transition-shadow cursor-pointer group">
          <Users className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-800">Register Patient</h3>
          <p className="text-sm text-gray-500 mt-1">Add a new patient to the system</p>
        </a>
        <a href="/center/studies/new" className="card p-6 hover:shadow-md transition-shadow cursor-pointer group">
          <Stethoscope className="w-8 h-8 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-800">Create Study Order</h3>
          <p className="text-sm text-gray-500 mt-1">Order a new radiology investigation</p>
        </a>
        <a href="/center/assignments" className="card p-6 hover:shadow-md transition-shadow cursor-pointer group">
          <UserCheck className="w-8 h-8 text-yellow-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-800">Assign Cases</h3>
          <p className="text-sm text-gray-500 mt-1">Assign studies to radiologists</p>
        </a>
      </div>
    </div>
  )
}
