import clsx from 'clsx'
import { StudyStatus, ReportStatus, PaymentStatus } from '../../types'

type AnyStatus = StudyStatus | ReportStatus | PaymentStatus

const COLOR_MAP: Record<string, string> = {
  REGISTERED:       'bg-gray-100 text-gray-700',
  BILLED:           'bg-blue-100 text-blue-700',
  READY_FOR_SCAN:   'bg-cyan-100 text-cyan-700',
  SCAN_COMPLETED:   'bg-indigo-100 text-indigo-700',
  IMAGE_AVAILABLE:  'bg-violet-100 text-violet-700',
  ASSIGNED:         'bg-yellow-100 text-yellow-700',
  REPORT_PENDING:   'bg-orange-100 text-orange-700',
  REPORT_COMPLETED: 'bg-lime-100 text-lime-700',
  APPROVED:         'bg-green-100 text-green-700',
  DELIVERED:        'bg-emerald-100 text-emerald-700',
  DRAFT:            'bg-gray-100 text-gray-600',
  SUBMITTED:        'bg-blue-100 text-blue-700',
  UNDER_REVIEW:     'bg-amber-100 text-amber-700',
  REJECTED:         'bg-red-100 text-red-700',
  FINAL:            'bg-green-100 text-green-700',
  PENDING:          'bg-yellow-100 text-yellow-700',
  PAID:             'bg-green-100 text-green-700',
  PARTIAL:          'bg-orange-100 text-orange-700',
  REFUNDED:         'bg-purple-100 text-purple-700',
  WAIVED:           'bg-gray-100 text-gray-500',
}

const LABEL_MAP: Record<string, string> = {
  READY_FOR_SCAN:   'Ready for Scan',
  SCAN_COMPLETED:   'Scan Completed',
  IMAGE_AVAILABLE:  'Image Available',
  REPORT_PENDING:   'Report Pending',
  REPORT_COMPLETED: 'Report Completed',
  UNDER_REVIEW:     'Under Review',
}

interface Props { status: AnyStatus; className?: string }

export default function StatusBadge({ status, className }: Props) {
  const label = LABEL_MAP[status] ?? status.replace(/_/g, ' ')
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      COLOR_MAP[status] ?? 'bg-gray-100 text-gray-700', className)}>
      {label}
    </span>
  )
}
