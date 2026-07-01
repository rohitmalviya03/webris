import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Users, Stethoscope, CreditCard,
  UserCheck, ClipboardCheck, LogOut, Activity, Menu,
  FileText, KeyRound, FlaskConical, Settings
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { Role } from '../../types'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const navItems: NavItem[] = [
  {
    to: '/center/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['CENTER_ADMIN', 'RECEPTIONIST', 'TECHNICIAN', 'REPORT_APPROVER'],
  },
  {
    to: '/center/patients',
    label: 'Patients',
    icon: Users,
    roles: ['CENTER_ADMIN', 'RECEPTIONIST'],
  },
  {
    to: '/center/studies',
    label: 'Studies',
    icon: Stethoscope,
    roles: ['CENTER_ADMIN', 'RECEPTIONIST', 'TECHNICIAN'],
  },
  {
    to: '/center/billing',
    label: 'Billing',
    icon: CreditCard,
    roles: ['CENTER_ADMIN', 'RECEPTIONIST'],
  },
  {
    to: '/center/assignments',
    label: 'Assignment',
    icon: UserCheck,
    roles: ['CENTER_ADMIN', 'REPORT_APPROVER'],
  },
  {
    to: '/center/approvals',
    label: 'Approvals',
    icon: ClipboardCheck,
    roles: ['CENTER_ADMIN', 'REPORT_APPROVER'],
  },
  {
    to: '/center/tests',
    label: 'Tests',
    icon: FlaskConical,
    roles: ['CENTER_ADMIN'],
  },
  {
    to: '/center/templates',
    label: 'Templates',
    icon: FileText,
    roles: ['CENTER_ADMIN'],
  },
  {
    to: '/center/users',
    label: 'Users',
    icon: KeyRound,
    roles: ['CENTER_ADMIN'],
  },
  {
    to: '/center/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['CENTER_ADMIN'],
  },
]

const roleLabel: Record<string, string> = {
  CENTER_ADMIN: 'Center Admin',
  RECEPTIONIST: 'Receptionist',
  TECHNICIAN: 'Radio Technician',
  REPORT_APPROVER: 'Report Approver',
}

export default function CenterLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const visibleNav = navItems.filter(
    (item) => user?.role && (item.roles as string[]).includes(user.role)
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-primary-900 text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
          <div className="w-9 h-9 bg-primary-400 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">WebRIS</div>
            <div className="text-primary-300 text-xs truncate max-w-[130px]">{user?.centerName ?? 'Center Portal'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-primary-700">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {user?.fullName?.[0] ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-xs text-primary-300 truncate">
                {user?.role ? (roleLabel[user.role] ?? user.role.replace(/_/g, ' ')) : ''}
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-primary-200 hover:bg-primary-800 hover:text-white text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-800">WebRIS</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
