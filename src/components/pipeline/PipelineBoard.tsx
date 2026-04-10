'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import type { Lead, LeadStatus } from '@/types'
import LeadFormModal from '@/components/leads/LeadFormModal'
import PipelineColumn, { type ColumnDef } from './PipelineColumn'
import PipelineStats from './PipelineStats'

const COLUMNS: ColumnDef[] = [
  { id: 'New', label: 'Prospecting', color: '#888780' },
  { id: 'Contacted', label: 'Contacted', color: '#378ADD' },
  { id: 'Qualified', label: 'Qualification', color: '#1D9E75' },
  { id: 'Proposal Sent', label: 'Proposal', color: '#BA7517' },
  { id: 'Negotiation', label: 'Negotiation', color: '#685588' },
  { id: 'Closed Won', label: 'Closed Won', color: '#a83900' },
  { id: 'Closed Lost', label: 'Closed Lost', color: '#5F5E5A' },
]

export { COLUMNS }

type Props = {
  modalOpen: boolean
  modalInitialStatus: LeadStatus | null
  onModalClose: () => void
  onOpenAddModal: (status: LeadStatus | null) => void
  onLeadsChange?: (leads: Lead[]) => void
}

export default function PipelineBoard({
  modalOpen,
  modalInitialStatus,
  onModalClose,
  onOpenAddModal,
  onLeadsChange,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!alive) return
        const safe: Lead[] = Array.isArray(data) ? (data as Lead[]) : []
        setLeads(safe)
        onLeadsChange?.(safe)
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateLeads(next: Lead[]) {
    setLeads(next)
    onLeadsChange?.(next)
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return

    const newStatus = destination.droppableId as LeadStatus
    const prev = leads
    const next = leads.map((l) =>
      l.id === draggableId ? { ...l, status: newStatus } : l
    )
    updateLeads(next)

    try {
      const res = await fetch(`/api/leads/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
    } catch (e) {
      updateLeads(prev)
      setError((e as Error).message)
    }
  }

  const grouped: Record<LeadStatus, Lead[]> = {
    New: [],
    Contacted: [],
    Qualified: [],
    'Proposal Sent': [],
    Negotiation: [],
    'Closed Won': [],
    'Closed Lost': [],
  }
  for (const l of leads) {
    if (grouped[l.status]) grouped[l.status].push(l)
  }

  if (loading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-12">
        {COLUMNS.map((c) => (
          <div
            key={c.id}
            className="flex-shrink-0 flex flex-col gap-3"
            style={{ width: 300 }}
          >
            <div className="h-5 w-32 bg-[#ebedf8] rounded-none animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-[#ebedf8] rounded-none animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-none">
          {error}
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="flex overflow-x-auto pb-12"
          style={{ gap: 24 }}
        >
          {COLUMNS.map((col) => (
            <PipelineColumn
              key={col.id}
              column={col}
              leads={grouped[col.id]}
              onAddLead={(status) => onOpenAddModal(status)}
            />
          ))}
        </div>
      </DragDropContext>

      <PipelineStats leads={leads} />

      <LeadFormModal
        open={modalOpen}
        mode="create"
        initial={
          modalInitialStatus
            ? ({ status: modalInitialStatus } as Lead)
            : null
        }
        onClose={onModalClose}
        onSaved={(lead) => {
          updateLeads([...leads, lead])
          onModalClose()
        }}
      />
    </>
  )
}
