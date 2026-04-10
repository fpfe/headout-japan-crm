import type { LeadStatus } from '@/types'

const STYLES: Record<LeadStatus, { bg: string; fg: string }> = {
  New: { bg: '#e5e7eb', fg: '#4b5563' },
  Contacted: { bg: '#dbeafe', fg: '#1d4ed8' },
  Qualified: { bg: '#dcfce7', fg: '#166534' },
  'Proposal Sent': { bg: '#fef3c7', fg: '#92400e' },
  Negotiation: { bg: '#e0e7ff', fg: '#3730a3' },
  'Closed Won': { bg: '#a83900', fg: '#ffffff' },
  'Closed Lost': { bg: '#374151', fg: '#ffffff' },
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const style = STYLES[status] ?? STYLES.New
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-none text-[11px] font-semibold whitespace-nowrap"
      style={{ background: style.bg, color: style.fg }}
    >
      {status}
    </span>
  )
}
