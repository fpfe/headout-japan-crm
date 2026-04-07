'use client'

import { Droppable } from '@hello-pangea/dnd'
import type { Lead, LeadStatus } from '@/types'
import PipelineCard from './PipelineCard'

export type ColumnDef = {
  id: LeadStatus
  label: string
  color: string
}

type Props = {
  column: ColumnDef
  leads: Lead[]
  onAddLead: (status: LeadStatus) => void
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatYen(n: number): string {
  if (n === 0) return '¥—'
  return `¥${(n / 1_000_000).toFixed(1)}M`
}

export default function PipelineColumn({ column, leads, onAddLead }: Props) {
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0)
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 300 }}>
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] uppercase font-bold tracking-wider"
            style={{ color: 'rgba(24,28,35,0.4)' }}
          >
            {column.label}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-gray-500"
            style={{ background: '#e5e8f3' }}
          >
            {pad2(leads.length)}
          </span>
        </div>
        <span className="text-[11px] font-bold" style={{ color: '#a83900' }}>
          {formatYen(totalValue)}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-3 p-2 rounded-2xl transition-colors"
            style={{
              minHeight: 200,
              background: snapshot.isDraggingOver ? '#f1f3fe' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => onAddLead(column.id)}
              className="w-full text-[12px] text-gray-500 py-2.5 rounded-xl transition-colors"
              style={{
                border: '1.5px dashed #d4d7e8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#a83900'
                e.currentTarget.style.color = '#a83900'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d4d7e8'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              + Add lead
            </button>

            {leads.map((lead, idx) => (
              <PipelineCard key={lead.id} lead={lead} index={idx} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
