import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import CenterLayout from './components/layout/CenterLayout'
import DoctorLayout from './components/layout/DoctorLayout'
import SuperAdminLayout from './components/layout/SuperAdminLayout'
import CenterDashboard from './pages/center/Dashboard'
import PatientList from './pages/center/patients/PatientList'
import PatientForm from './pages/center/patients/PatientForm'
import StudyList from './pages/center/studies/StudyList'
import StudyForm from './pages/center/studies/StudyForm'
import BillingList from './pages/center/billing/BillingList'
import BillingForm from './pages/center/billing/BillingForm'
import CaseAssignment from './pages/center/assignment/CaseAssignment'
import ReportApproval from './pages/center/reports/ReportApproval'
import ReportTemplates from './pages/center/templates/ReportTemplates'
import TestCatalog from './pages/center/tests/TestCatalog'
import UserManagement from './pages/center/users/UserManagement'
import CenterSettings from './pages/center/settings/CenterSettings'
import ReportPrint from './pages/center/reports/ReportPrint'
import BillingPrint from './pages/center/billing/BillingPrint'
import DoctorDashboard from './pages/radiologist/Dashboard'
import Workstation from './pages/radiologist/Workstation'
import MyReports from './pages/radiologist/MyReports'
import AdminDashboard from './pages/superadmin/Dashboard'
import CenterList from './pages/superadmin/CenterList'
import CenterForm from './pages/superadmin/CenterForm'
import UserList from './pages/superadmin/UserList'
import type { Role } from './types'

/** Enforces authentication + optional role allowlist. Redirects unauthenticated users to /login. */
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

/**
 * Route guard used *inside* a portal layout.
 * Redirects to /center/dashboard when the current user's role is not in the allowlist,
 * instead of bouncing them all the way back to /.
 */
function CenterRoleGuard({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const { user } = useAuthStore()
  if (!user || !(roles as string[]).includes(user.role)) {
    return <Navigate to="/center/dashboard" replace />
  }
  return <>{children}</>
}

function RoleRouter() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />
  if (user.role === 'RADIOLOGIST')  return <Navigate to="/doctor/dashboard" replace />
  return <Navigate to="/center/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

        {/* Super Admin Portal */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['SUPER_ADMIN']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="centers" element={<CenterList />} />
          <Route path="centers/new" element={<CenterForm />} />
          <Route path="centers/:id/edit" element={<CenterForm />} />
          <Route path="users" element={<UserList />} />
        </Route>

        {/* Center Portal — accessible by all center roles */}
        <Route path="/center" element={
          <ProtectedRoute roles={['CENTER_ADMIN', 'RECEPTIONIST', 'TECHNICIAN', 'REPORT_APPROVER']}>
            <CenterLayout />
          </ProtectedRoute>
        }>
          {/* All center roles */}
          <Route path="dashboard" element={<CenterDashboard />} />

          {/* Receptionist + Admin */}
          <Route path="patients" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <PatientList />
            </CenterRoleGuard>
          } />
          <Route path="patients/new" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <PatientForm />
            </CenterRoleGuard>
          } />
          <Route path="patients/:id/edit" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <PatientForm />
            </CenterRoleGuard>
          } />
          <Route path="billing" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <BillingList />
            </CenterRoleGuard>
          } />
          <Route path="billing/new" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <BillingForm />
            </CenterRoleGuard>
          } />
          <Route path="billing/:studyId/print" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <BillingPrint />
            </CenterRoleGuard>
          } />

          {/* Receptionist + Technician + Admin */}
          <Route path="studies" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST', 'TECHNICIAN']}>
              <StudyList />
            </CenterRoleGuard>
          } />
          <Route path="studies/new" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'RECEPTIONIST']}>
              <StudyForm />
            </CenterRoleGuard>
          } />

          {/* Report Approver + Admin */}
          <Route path="assignments" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'REPORT_APPROVER']}>
              <CaseAssignment />
            </CenterRoleGuard>
          } />
          <Route path="approvals" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'REPORT_APPROVER']}>
              <ReportApproval />
            </CenterRoleGuard>
          } />
          <Route path="reports/:studyId/print" element={
            <CenterRoleGuard roles={['CENTER_ADMIN', 'REPORT_APPROVER']}>
              <ReportPrint />
            </CenterRoleGuard>
          } />

          {/* Admin only */}
          <Route path="templates" element={
            <CenterRoleGuard roles={['CENTER_ADMIN']}>
              <ReportTemplates />
            </CenterRoleGuard>
          } />
          <Route path="tests" element={
            <CenterRoleGuard roles={['CENTER_ADMIN']}>
              <TestCatalog />
            </CenterRoleGuard>
          } />
          <Route path="users" element={
            <CenterRoleGuard roles={['CENTER_ADMIN']}>
              <UserManagement />
            </CenterRoleGuard>
          } />
          <Route path="settings" element={
            <CenterRoleGuard roles={['CENTER_ADMIN']}>
              <CenterSettings />
            </CenterRoleGuard>
          } />
        </Route>

        {/* Radiologist Portal */}
        <Route path="/doctor" element={
          <ProtectedRoute roles={['RADIOLOGIST']}>
            <DoctorLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="workstation/:studyId" element={<Workstation />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
