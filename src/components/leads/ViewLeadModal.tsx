'use client'

import type { Lead } from '@/types'
import StatusBadge from './StatusBadge'

type Props = {
  open: boolean
  lead: Lead | null
  onClose: () => void
}

export default function ViewLeadModal({ open, lead, onClose }: Props) {
  if (!open || !lead) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,15,30,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
              Lead Details
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#181c23] mt-1">
              {lead.contactName}
            </h2>
            <div className="text-sm text-gray-500">{lead.company}</div>
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
          <Row label="Email" value={lead.email} />
          <Row label="Phone" value={lead.phone} />
          <Row label="Service Type" value={lead.serviceType} />
          <Row label="Lead Source" value={lead.leadSource} />
          <Row label="Region" value={lead.region} />
          <Row label="Assigned To" value={lead.assignedTo} />
          <Row
            label="Created"
            value={
              lead.createdAt
                ? new Date(lead.createdAt).toLocaleString()
                : '—'
            }
          />
          <Row label="ID" value={lead.id} mono />
        </dl>

        {lead.notes && (
          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Notes
            </div>
            <div className="text-[13px] text-[#181c23] bg-[#ebedf8] rounded-none p-3 whitespace-pre-wrap">
              {lead.notes}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className="text-[#181c23] mt-0.5 truncate"
        style={mono ? { fontFamily: 'monospace', fontSize: 11 } : undefined}
      >
        {value || '—'}
      </div>
    </div>
  )
}
