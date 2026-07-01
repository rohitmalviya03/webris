import { format, isValid } from 'date-fns'

/**
 * Backend returns LocalDateTime as "2026-06-20T23:42:00" (no timezone).
 * new Date("2026-06-20T23:42:00") → browser treats as LOCAL time → correct for IST users.
 */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isValid(d) ? d : null
}

/** 20 Jun 2026 */
export function fmtDate(value: string | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'dd MMM yyyy') : '—'
}

/** 20 Jun 2026, 11:42 PM */
export function fmtDateTime(value: string | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'dd MMM yyyy, hh:mm a') : '—'
}

/** 11:42 PM */
export function fmtTime(value: string | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'hh:mm a') : '—'
}
