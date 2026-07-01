export type Role = 'SUPER_ADMIN' | 'CENTER_ADMIN' | 'RECEPTIONIST' | 'TECHNICIAN' | 'RADIOLOGIST' | 'REPORT_APPROVER'

export type Modality = 'CT' | 'MRI' | 'XRAY' | 'USG' | 'PET' | 'MAMMOGRAPHY' | 'FLUOROSCOPY' | 'NUCLEAR_MEDICINE'

export type StudyStatus =
  | 'REGISTERED' | 'BILLED' | 'READY_FOR_SCAN' | 'SCAN_COMPLETED'
  | 'IMAGE_AVAILABLE' | 'ASSIGNED' | 'REPORT_PENDING' | 'REPORT_COMPLETED'
  | 'APPROVED' | 'DELIVERED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED' | 'WAIVED'

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'FINAL'

export type CenterPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED'

export interface AuthUser {
  token: string
  userId: number
  username: string
  fullName: string
  role: Role
  centerId: number | null
  centerName: string | null
  requireReportApproval: boolean | null
}

export interface Patient {
  id: number
  patientCode: string
  fullName: string
  dateOfBirth: string | null
  age: number | null
  gender: string | null
  mobile: string
  email: string | null
  address: string | null
  referringDoctor: string | null
  centerId: number
  centerName: string
  createdAt: string
}

export interface BillingInfo {
  id: number
  studyId: number
  labNo: string
  invoiceNo: string
  testName: string
  amount: number
  discount: number
  tax: number
  netAmount: number
  paymentStatus: PaymentStatus
  paymentMode: string | null
  paymentDate: string | null
  notes: string | null
  createdAt: string
}

export interface Study {
  id: number
  labNo: string
  patientId: number
  patientName: string
  patientCode: string
  centerId: number
  centerName: string
  studyDescription: string
  modality: Modality
  bodyPart: string | null
  clinicalHistory: string | null
  referringDoctor: string | null
  accessionNumber: string
  orthancStudyId: string | null
  studyInstanceUid: string | null
  status: StudyStatus
  assignedDoctorId: number | null
  assignedDoctorName: string | null
  assignedAt: string | null
  createdAt: string
  billing: BillingInfo | null
}

export interface Doctor {
  id: number
  userId: number | null
  name: string
  specialization: string | null
  qualification: string | null
  email: string | null
  phone: string | null
  isActive: boolean
  pendingCases: number
}

export interface Report {
  id: number
  studyId: number
  labNo: string
  patientName: string
  studyDescription: string
  doctorId: number
  doctorName: string
  doctorQualification: string | null
  clinicalHistory: string | null
  findings: string | null
  impression: string | null
  conclusion: string | null
  recommendations: string | null
  status: ReportStatus
  submittedAt: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectionReason: string | null
  pdfUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalPatients: number
  todaysStudies: number
  pendingReports: number
  completedReports: number
  assignedCases: number
  totalStudies: number
  approvedReports: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface CenterDetail {
  id: number
  name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  contactPerson: string | null
  city: string | null
  state: string | null
  pincode: string | null
  logoUrl: string | null
  isActive: boolean
  notes: string | null
  plan: CenterPlan
  subscriptionStatus: SubscriptionStatus
  planStartDate: string | null
  planEndDate: string | null
  maxStudiesPerMonth: number
  createdAt: string
  totalPatients: number
  totalStudies: number
  totalUsers: number
  monthlyStudies: number
}

export interface GlobalStats {
  totalCenters: number
  activeCenters: number
  inactiveCenters: number
  expiredSubscriptions: number
  totalPatients: number
  totalStudies: number
  totalUsers: number
  monthlyStudies: number
  trialCenters: number
  starterCenters: number
  professionalCenters: number
  enterpriseCenters: number
}
