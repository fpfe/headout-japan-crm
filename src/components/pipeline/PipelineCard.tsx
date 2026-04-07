'use client'

import Link from 'next/link'
import { Draggable } from '@hello-pangea/dnd'
import type { Lead } from '@/types'

const AVATAR_PALETTE = [
  '#a83900',
  '#378ADD',
  '#1D9E75',
  '#BA7517',
  '#685588',
  '#b60056',
  '#5F5E5A',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '??'
}

function colorOf(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function formatDealValue(v: string): string {
  const n = Number(v)
  if (!v || !Number.isFinite(n) || n === 0) return '¥—'
  return `¥${(n / 1_000_000).toFixed(1)}M`
}

function daysSince(iso: string): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function FooterActivity({ lead }: { lead: Lead }) {
  if (lead.status === 'Negotiation') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#b60056' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="4" x2="12" y2="14" />
          <circle cx="12" cy="19" r="1.2" fill="currentColor" />
        </svg>
        Decision Pending
      </span>
    )
  }
  if (lead.status === 'Closed Won') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Closed Won
      </span>
    )
  }
  if (lead.status === 'Closed Lost') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
        Closed Lost
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {daysSince(lead.createdAt)}d
    </span>
  )
}

type Props = { lead: Lead; index: number }

export default function PipelineCard({ lead, index }: Props) {
  const isHot = lead.status === 'Negotiation' || lead.status === 'Proposal Sent'
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white relative transition-transform"
          style={{
            borderRadius: 16,
            padding: '1.25rem',
            border: '1px solid transparent',
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            boxShadow: snapshot.isDragging
              ? '0 12px 32px rgba(0,0,0,0.12)'
              : 'none',
            transform: provided.draggableProps.style?.transform,
            ...(isHot
              ? { borderLeft: '4px solid #e4006d' }
              : {}),
            ...provided.draggableProps.style,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(168,57,0,0.10)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div
              className="text-[10px] uppercase font-bold tracking-wider"
              style={{ color: '#9c88bf' }}
            >
              {lead.serviceType}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.2 }}>
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>

          {isHot && (
            <span
              className="inline-block mb-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{ background: '#ffd9e0', color: '#b60056' }}
            >
              Hot Priority
            </span>
          )}

          <Link
            href={`/leads/${lead.id}`}
            className="block text-[14px] font-bold text-[#181c23] hover:text-[#a83900]"
          >
            {lead.company}
          </Link>

          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
              style={{ background: colorOf(lead.contactName) }}
            >
              {initialsOf(lead.contactName)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Primary Contact</span>
              <span className="text-[12px] font-semibold text-[#181c23]">
                {lead.contactName}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <FooterActivity lead={lead} />
            <span className="text-[12px] font-bold text-[#181c23]">{formatDealValue(lead.dealValue)}</span>
          </div>
        </div>
      )}
    </Draggable>
  )
}
