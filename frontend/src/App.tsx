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
import ReportPrint from './pages/center/reports/ReportPrint'
import BillingPrint from './pages/center/billing/BillingPrint'
import DoctorDashboard from './pages/radiologist/Dashboard'
import Workstation from './pages/radiologist/Workstation'
import MyReports from './pages/radiologist/MyReports'
import AdminDashboard from './pages/superadmin/Dashboard'
import CenterList from './pages/superadmin/CenterList'
import CenterForm from './pages/superadmin/CenterForm'
import UserList from './pages/superadmin/UserList'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />
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

        {/* Center Portal */}
        <Route path="/center" element={
          <ProtectedRoute roles={['SUPER_ADMIN','CENTER_ADMIN','RECEPTIONIST','TECHNICIAN','REPORT_APPROVER']}>
            <CenterLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<CenterDashboard />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/new" element={<PatientForm />} />
          <Route path="patients/:id/edit" element={<PatientForm />} />
          <Route path="studies" element={<StudyList />} />
          <Route path="studies/new" element={<StudyForm />} />
          <Route path="billing" element={<BillingList />} />
          <Route path="billing/new" element={<BillingForm />} />
          <Route path="billing/:studyId/print" element={<BillingPrint />} />
          <Route path="assignments" element={<CaseAssignment />} />
          <Route path="approvals" element={<ReportApproval />} />
          <Route path="templates" element={<ReportTemplates />} />
          <Route path="tests" element={<TestCatalog />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports/:studyId/print" element={<ReportPrint />} />
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
