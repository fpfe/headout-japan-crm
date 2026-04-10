'use client'

import Link from 'next/link'
import type { Lead } from '@/types'
import StatusBadge from '@/components/leads/StatusBadge'

const AVATAR_COLORS = [
  '#a83900',
  '#ff5a00',
  '#b60056',
  '#685588',
  '#2f6f4e',
  '#1d4e89',
]

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

function formatDeal(value: string) {
  const n = parseInt(value || '0', 10)
  if (!n || n <= 0) return null
  return `¥${(n / 1_000_000).toFixed(1)}M`
}

function InfoRow({
  icon,
  color,
  text,
}: {
  icon: string
  color: string
  text: string
}) {
  return (
    <div className="flex items-center gap-2 mt-1 text-[12px] text-[#5b4137]">
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 16, color }}
      >
        {icon}
      </span>
      <span className="truncate">{text || '—'}</span>
    </div>
  )
}

export default function MerchantCard({ lead }: { lead: Lead }) {
  const isHot = lead.status === 'Negotiation' || lead.status === 'Proposal Sent'
  const deal = formatDeal(lead.dealValue)

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group block bg-white rounded-none p-6 border border-transparent hover:border-[#a83900]/15 hover:-translate-y-[3px] transition-all duration-200"
      style={{
        borderLeft: isHot ? '4px solid #e4006d' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-12 h-12 rounded-none flex items-center justify-center text-white font-bold"
          style={{ background: colorForName(lead.company || ''), fontSize: 16 }}
        >
          {initials(lead.company)}
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div
        className="font-display text-[#181c23] mt-3 truncate"
        style={{ fontSize: 17, fontWeight: 700 }}
      >
        {lead.company || 'Unnamed'}
      </div>

      <InfoRow icon="person" color="#a83900" text={lead.contactName} />
      <InfoRow icon="category" color="#685588" text={lead.serviceType} />
      <InfoRow icon="location_on" color="#685588" text={lead.region} />

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-none bg-white border border-[#ebedf8] text-[10px] font-bold text-[#5b4137]"
        >
          {lead.leadSource || 'Unknown'}
        </span>
        {deal ? (
          <span className="text-[13px] font-bold text-[#a83900]">{deal}</span>
        ) : (
          <span className="text-[13px] text-gray-400">¥—</span>
        )}
      </div>
    </Link>
  )
}
