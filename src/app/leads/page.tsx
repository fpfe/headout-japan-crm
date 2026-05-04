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
import DuplicateCheckModal from '@/components/leads/DuplicateCheckModal'
import CsvImportModal from '@/components/leads/CsvImportModal'
import EnrichmentPanel from '@/components/leads/EnrichmentPanel'
import MagicFieldsPanel from '@/components/leads/MagicFieldsPanel'
import { useToast } from '@/components/ui/Toast'
import { useViewingAs } from '@/lib/use-viewing-as'

const MINE_STORAGE_KEY = 'cowork.leads.onlyMine'

export default function LeadsPage() {
  const { toastSuccess, toastError } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)

  const [search, setSearch] = useState('')
  const [interactionMatchIds, setInteractionMatchIds] = useState<Set<string>>(new Set())
  const [searchingInteractions, setSearchingInteractions] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [dupeCheckOpen, setDupeCheckOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [enrichingLead, setEnrichingLead] = useState<Lead | null>(null)
  const [magicFieldsOpen, setMagicFieldsOpen] = useState(false)
  const { name: viewingAs } = useViewingAs()
  const [onlyMine, setOnlyMine] = useState(false)

  // Hydrate "Only mine" preference from localStorage
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(MINE_STORAGE_KEY)
      if (v === 'true') setOnlyMine(true)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem(MINE_STORAGE_KEY, onlyMine ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [onlyMine])

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

  // ─────────── interaction search (debounced) ───────────
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setInteractionMatchIds(new Set())
      return
    }
    const timer = setTimeout(async () => {
      setSearchingInteractions(true)
      try {
        const res = await fetch(
          `/api/interactions/search?q=${encodeURIComponent(q)}`
        )
        if (res.ok) {
          const ids: string[] = await res.json()
          setInteractionMatchIds(new Set(ids))
        }
      } catch {
        // ignore
      } finally {
        setSearchingInteractions(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // ─────────── filtering ───────────
  const filteredLeads = useMemo(() => {
    const now = Date.now()
    const ranges: Record<string, number> = {
      '7d': 7 * 86400_000,
      '30d': 30 * 86400_000,
      '90d': 90 * 86400_000,
    }
    const q = search.toLowerCase()
    const me = viewingAs.trim()
    return leads.filter((l) => {
      // "My Leads" toggle — UI-only filter, scoped to assignedTo === viewingAs name
      if (onlyMine && (l.assignedTo || '').trim() !== me) return false
      if (q) {
        // Search across all lead text fields
        const searchable = [
          l.contactName,
          l.company,
          l.serviceType,
          l.leadSource,
          l.region,
          l.notes,
        ]
          .join(' ')
          .toLowerCase()
        const matchesLead = searchable.includes(q)
        const matchesInteraction = interactionMatchIds.has(l.id)
        if (!matchesLead && !matchesInteraction) return false
      }
      if (filters.serviceType && l.serviceType !== filters.serviceType)
        return false
      if (filters.status && l.status !== filters.status) return false
      if (filters.assignedTo && l.assignedTo !== filters.assignedTo)
        return false
      if (filters.dateRange !== 'any') {
        const cutoff = now - (ranges[filters.dateRange] ?? 0)
        const t = Date.parse(l.createdAt)
        if (Number.isNaN(t) || t < cutoff) return false
      }
      return true
    })
  }, [leads, filters, search, interactionMatchIds, onlyMine, viewingAs])

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  // ─────────── lead mutations ───────────
  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete "${lead.company}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess(`Deleted "${lead.company}"`)
      refresh()
    } catch (err) {
      toastError((err as Error).message)
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
      toastError((err as Error).message)
    }
  }

  const handleInlineEdit = async (lead: Lead, field: keyof Lead, value: string) => {
    if (value === lead[field]) return
    // optimistic local update
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, [field]: value } : l))
    )
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch (err) {
      // revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, [field]: lead[field] } : l))
      )
      toastError((err as Error).message)
    }
  }

  // ─────────── bulk actions ───────────
  async function bulkPatch(patch: Partial<Lead>, label: string) {
    const ids = [...selectedIds]
    if (!ids.length) return
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
        )
      )
      toastSuccess(`Updated ${ids.length} lead(s): ${label}`)
      setRowSelection({})
      refresh()
    } catch (err) {
      toastError(`Bulk update failed: ${(err as Error).message}`)
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} lead(s)? This cannot be undone.`)) return
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/leads/${id}`, { method: 'DELETE' }))
      )
      toastSuccess(`Deleted ${ids.length} lead(s)`)
      setRowSelection({})
      refresh()
    } catch (err) {
      toastError(`Bulk delete failed: ${(err as Error).message}`)
    }
  }

  const handleBulkAssign = async (memberName: string) => {
    bulkPatch({ assignedTo: memberName }, `assigned to ${memberName}`)
  }

  const handleBulkUpdateStatus = async (status: LeadStatus) => {
    bulkPatch({ status }, `status → ${status}`)
  }

  // ─────────── follow-up + calendar sync ───────────
  const handleFollowUpChange = async (lead: Lead, date: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, followUpDate: date } : l))
    )
    try {
      // Save the follow-up date to the lead
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpDate: date }),
      })
      if (!res.ok) throw new Error('Failed to save follow-up date')

      // If a date is set, create a Google Calendar event
      if (date) {
        try {
          const syncRes = await fetch('/api/leads/calendar-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              company: lead.company,
              contactName: lead.contactName,
              followUpDate: date,
              notes: lead.notes,
              serviceType: lead.serviceType,
            }),
          })
          if (syncRes.ok) {
            toastSuccess(`Follow-up set for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — calendar event ready`)
          }
        } catch {
          // Calendar sync is best-effort
          toastSuccess(`Follow-up date set for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
        }
      } else {
        toastSuccess('Follow-up date cleared')
      }
    } catch (err) {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, followUpDate: lead.followUpDate } : l))
      )
      toastError((err as Error).message)
    }
  }

  // ─────────── enrichment apply ───────────
  const handleEnrichApply = async (lead: Lead, updates: Partial<Lead>) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, ...updates } : l))
    )
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save enrichment')
    } catch (err) {
      // revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? lead : l))
      )
      toastError((err as Error).message)
    }
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-8 gap-3 sm:gap-6">
        <div>
          <div className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
            Merchant Pipeline
          </div>
          <h1
            className="font-display font-extrabold leading-tight text-[#181c23] mt-1 sm:mt-2"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 2.6rem)' }}
          >
            New Market Leads
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 sm:pt-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            title={onlyMine ? `Showing only leads assigned to ${viewingAs}` : 'Showing all team leads'}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-none text-[10px] sm:text-[12px] font-bold uppercase tracking-wider transition-colors ${
              onlyMine
                ? 'bg-[#a83900] text-white hover:bg-[#8a2f00]'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#a83900] hover:text-[#a83900]'
            }`}
            style={{ letterSpacing: '0.1em' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {onlyMine ? 'person' : 'groups'}
            </span>
            {onlyMine ? 'My Leads' : 'All Leads'}
          </button>
          <span className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-none bg-gray-100 text-gray-700 text-[10px] sm:text-[12px] font-bold tracking-wider">
            {activeCount} ACTIVE
          </span>
          <span className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-none brand-gradient text-white text-[10px] sm:text-[12px] font-bold tracking-wider">
            {hotCount} HOT
          </span>
          <button
            onClick={() => setMagicFieldsOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-none border border-[#a83900]/30 text-[#a83900] hover:bg-[#a83900]/5 transition"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            Magic Fields
          </button>
          <button
            onClick={() => setCsvImportOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-none border border-gray-300 text-gray-700 hover:border-[#a83900] hover:text-[#a83900] transition"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
            Import CSV
          </button>
          <button
            onClick={() => setDupeCheckOpen(true)}
            className="hidden sm:inline-flex text-sm font-semibold px-4 py-2.5 rounded-none border border-gray-300 text-gray-700 hover:border-[#a83900] hover:text-[#a83900] transition"
          >
            Check Duplicates
          </button>
          <button
            onClick={openCreate}
            className="brand-gradient text-white text-[12px] sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-none shadow-sm hover:opacity-95 transition"
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
        <div className="mb-4 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refresh} className="ml-4 underline font-semibold hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-none border border-gray-200">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 animate-pulse">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-28" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="flex-1" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[800px] sm:min-w-0 px-4 sm:px-0">
        <LeadTable
          leads={filteredLeads}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onView={(lead) => setViewingLead(lead)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onInlineEdit={handleInlineEdit}
          onEnrich={(lead) => setEnrichingLead(lead)}
          onFollowUpChange={handleFollowUpChange}
        />
        </div>
        </div>
      )}

      <LeadFormModal
        open={formOpen}
        mode={formMode}
        initial={editingLead}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          toastSuccess(formMode === 'create' ? 'Lead created' : 'Lead updated')
          refresh()
        }}
      />

      <ViewLeadModal
        open={!!viewingLead}
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onEdit={(lead) => {
          setViewingLead(null)
          openEdit(lead)
        }}
        onEnrich={(lead) => {
          setViewingLead(null)
          setEnrichingLead(lead)
        }}
      />

      <DuplicateCheckModal
        open={dupeCheckOpen}
        leads={leads}
        onClose={() => setDupeCheckOpen(false)}
        onMerged={() => {
          setDupeCheckOpen(false)
          refresh()
        }}
      />

      <CsvImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImported={() => {
          setCsvImportOpen(false)
          refresh()
        }}
      />

      <EnrichmentPanel
        open={!!enrichingLead}
        lead={enrichingLead}
        onClose={() => setEnrichingLead(null)}
        onApply={handleEnrichApply}
      />

      <MagicFieldsPanel
        open={magicFieldsOpen}
        leads={filteredLeads}
        onClose={() => setMagicFieldsOpen(false)}
      />
    </div>
  )
}
