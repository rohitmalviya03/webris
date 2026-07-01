import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LayoutDashboard, LogOut, Activity, Stethoscope, FileText, Building2 } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/doctor/dashboard', label: 'My Cases',    icon: LayoutDashboard },
  { to: '/doctor/reports',   label: 'My Reports',  icon: FileText },
  { to: '/doctor/workstation', label: 'Workstation', icon: Stethoscope },
]

export default function DoctorLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">WebRIS</div>
            <div className="text-gray-400 text-xs">Radiologist Portal</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user?.fullName?.[0] ?? 'D'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-xs text-gray-400">Radiologist</div>
              {user?.centerName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-300 truncate">{user.centerName}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
