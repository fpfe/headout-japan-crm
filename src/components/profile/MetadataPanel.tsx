'use client'

import type { Lead } from '@/types'
import CompetitorBadges from './CompetitorBadges'

function formatCreated(s: string): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MetadataPanel({
  lead,
  onEdit,
  onLeadUpdate,
}: {
  lead: Lead
  onEdit?: () => void
  onLeadUpdate?: (patch: Partial<Lead>) => void
}) {
  const channels = lead.leadSource
    ? lead.leadSource.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const painPoints = lead.notes
    ? lead.notes.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <section
      className="px-4 py-4 sm:px-5 sm:py-5"
      style={{ background: '#e5e8f3', borderRadius: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-extrabold text-[14px] uppercase tracking-tight text-[#181c23]"
          style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
        >
          Metadata
        </h2>
        <button
          type="button"
          className="text-gray-500 hover:text-[#a83900] p-1 inline-flex items-center gap-1.5 text-[12px] font-semibold"
          title="Edit"
          onClick={onEdit}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          Edit
        </button>
      </div>

      {/* Top row: 2 columns — Experience Details + Marketing Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <div className="text-[10px] uppercase font-bold text-[#a83900] mb-3" style={{ letterSpacing: '0.18em' }}>
            Experience Details
          </div>
          <div className="flex flex-col gap-2.5">
            <Row label="Region" value={lead.region} />
            <Row label="Service" value={lead.serviceType} />
            <Row label="Assigned To" value={lead.assignedTo} />
            {lead.dealValue && <Row label="Deal Value" value={lead.dealValue} />}
            <Row label="Created" value={formatCreated(lead.createdAt)} />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold text-[#a83900] mb-3" style={{ letterSpacing: '0.18em' }}>
            Marketing Channels
          </div>
          <div className="flex flex-wrap gap-1.5">
            {channels.length === 0 ? (
              <span className="text-[12px] text-gray-500">—</span>
            ) : (
              channels.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 bg-white rounded-none text-[12px] font-medium text-[#181c23]"
                >
                  {c}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Competitor Listings — full width below the 2-col top */}
      <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <CompetitorBadges lead={lead} onLeadUpdate={onLeadUpdate} />
      </div>

      {/* Research Notes — full width below */}
      {painPoints.length > 0 && (
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="text-[10px] uppercase font-bold text-[#b60056] mb-3" style={{ letterSpacing: '0.18em' }}>
            Research Notes
          </div>
          <ul className="flex flex-col gap-2">
            {painPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-none bg-[#b60056] mt-1.5 shrink-0" />
                <span className="text-[13px] text-[#5b4137]">
                  <LinkifyText text={p} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function LinkifyText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a83900] hover:underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-bold text-[#181c23] text-right truncate">
        {value || '—'}
      </span>
    </div>
  )
}
