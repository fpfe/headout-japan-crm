'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { type Lead, type LeadStatus, type Member } from '@/types'
import LeadTable from '@/components/leads/LeadTable'
import LeadFilters, {
  EMPTY_FILTERS,
  type FiltersState,
} from '@/components/leads/LeadFilters'
import LeadFormModal from '@/components/leads/LeadFormModal'
import ViewLeadModal from '@/components/leads/ViewLeadModal'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, typesRes, membersRes] = await Promise.all([
        fetch('/api/leads', { cache: 'no-store' }),
        fetch('/api/service-types', { cache: 'no-store' }),
        fetch('/api/members', { cache: 'no-store' }),
      ])
      if (!leadsRes.ok)
        throw new Error((await leadsRes.json()).error || 'Failed to load leads')
      const leadsData = await leadsRes.json()
      setLeads(Array.isArray(leadsData) ? leadsData : [])
      if (typesRes.ok) {
        const types = await typesRes.json()
        if (Array.isArray(types)) setServiceTypes(types)
      }
      if (membersRes.ok) {
        const ms = await membersRes.json()
        if (Array.isArray(ms)) setMembers(ms)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ─────────── filtering ───────────
  const filteredLeads = useMemo(() => {
    const now = Date.now()
    const ranges: Record<string, number> = {
      '7d': 7 * 86400_000,
      '30d': 30 * 86400_000,
      '90d': 90 * 86400_000,
    }
    const q = search.toLowerCase()
    return leads.filter((l) => {
      if (q) {
        const name = (l.contactName || '').toLowerCase()
        const company = (l.company || '').toLowerCase()
        if (!name.includes(q) && !company.includes(q)) return false
      }
      if (filters.serviceType && l.serviceType !== filters.serviceType)
        return false
      if (filters.status && l.status !== filters.status) return false
      if (filters.dateRange !== 'any') {
        const cutoff = now - (ranges[filters.dateRange] ?? 0)
        const t = Date.parse(l.createdAt)
        if (Number.isNaN(t) || t < cutoff) return false
      }
      return true
    })
  }, [leads, filters, search])

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  // ─────────── lead mutations ───────────
  const handleDelete = async (lead: Lead) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    if (status === lead.status) return
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status update failed')
      // optimistic local update
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status } : l))
      )
    } catch (err) {
      alert((err as Error).message)
    }
  }

  // ─────────── bulk actions ───────────
  async function bulkPatch(patch: Partial<Lead>) {
    const ids = [...selectedIds]
    if (!ids.length) return
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/leads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
      )
    )
    setRowSelection({})
    refresh()
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} lead(s)?`)) return
    await Promise.all(
      ids.map((id) => fetch(`/api/leads/${id}`, { method: 'DELETE' }))
    )
    setRowSelection({})
    refresh()
  }

  const handleBulkAssign = async (memberName: string) => {
    bulkPatch({ assignedTo: memberName })
  }

  const handleBulkUpdateStatus = async (status: LeadStatus) => {
    bulkPatch({ status })
  }

  // ─────────── modal openers ───────────
  const openCreate = () => {
    setFormMode('create')
    setEditingLead(null)
    setFormOpen(true)
  }
  const openEdit = (lead: Lead) => {
    setFormMode('edit')
    setEditingLead(lead)
    setFormOpen(true)
  }

  const activeCount = leads.length
  const hotCount = leads.filter((l) =>
    ['Negotiation', 'Proposal Sent', 'Closed Won'].includes(l.status)
  ).length

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
            Merchant Pipeline
          </div>
          <h1 className="font-display font-extrabold text-[2.6rem] leading-tight text-[#181c23] mt-2">
            New Market Leads
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-2 flex-wrap justify-end">
          <span className="px-4 py-2 rounded-none bg-gray-100 text-gray-700 text-[12px] font-bold tracking-wider">
            {activeCount} ACTIVE LEADS
          </span>
          <span className="px-4 py-2 rounded-none brand-gradient text-white text-[12px] font-bold tracking-wider">
            {hotCount} HOT MOMENTUM
          </span>
          <button
            onClick={openCreate}
            className="brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-none shadow-sm hover:opacity-95 transition"
          >
            + New Merchant
          </button>
        </div>
      </div>

      <LeadFilters
        filters={filters}
        serviceTypes={serviceTypes}
        members={members}
        onChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        selectedCount={selectedIds.length}
        onClear={() => {
          setSearch('')
          setFilters(EMPTY_FILTERS)
          setRowSelection({})
        }}
        onBulkDelete={handleBulkDelete}
        onBulkAssign={handleBulkAssign}
        onBulkUpdateStatus={handleBulkUpdateStatus}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          Loading leads…
        </div>
      ) : (
        <LeadTable
          leads={filteredLeads}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onView={(lead) => setViewingLead(lead)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      <LeadFormModal
        open={formOpen}
        mode={formMode}
        initial={editingLead}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
      />

      <ViewLeadModal
        open={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
      />
    </div>
  )
}
