'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import LeadFormModal from '@/components/leads/LeadFormModal'
import CrmFilters, {
  type CrmFilterValue,
} from '@/components/crm/CrmFilters'
import MerchantCard from '@/components/crm/MerchantCard'

const STATUS_ORDER: Record<LeadStatus, number> = LEAD_STATUSES.reduce(
  (acc, s, i) => ({ ...acc, [s]: i }),
  {} as Record<LeadStatus, number>
)

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [filters, setFilters] = useState<CrmFilterValue>({
    status: '',
    serviceType: '',
    search: '',
    sort: 'newest',
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load leads')
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const serviceTypes = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.serviceType).filter(Boolean))).sort(),
    [leads]
  )

  const filteredLeads = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const list = leads.filter((l) => {
      if (filters.status && l.status !== filters.status) return false
      if (filters.serviceType && l.serviceType !== filters.serviceType)
        return false
      if (search) {
        const a = (l.company || '').toLowerCase()
        const b = (l.contactName || '').toLowerCase()
        if (!a.includes(search) && !b.includes(search)) return false
      }
      return true
    })
    const sorted = [...list]
    sorted.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        case 'company-asc':
          return (a.company || '').localeCompare(b.company || '')
        case 'company-desc':
          return (b.company || '').localeCompare(a.company || '')
        case 'status':
          return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        case 'newest':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      }
    })
    return sorted
  }, [leads, filters])

  const activeCount = useMemo(
    () =>
      leads.filter(
        (l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost'
      ).length,
    [leads]
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6 flex-wrap">
        <div>
          <div
            className="text-[11px] font-bold uppercase text-[#a83900]"
            style={{ letterSpacing: '0.22em' }}
          >
            Merchant CRM
          </div>
          <h1
            className="font-display text-[#181c23] mt-2"
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            All Merchants
          </h1>
          <div className="mt-2 text-[14px] text-[#5b4137]">
            {leads.length} merchants · {activeCount} active
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-bold px-5 py-2.5 rounded-none shadow-sm hover:opacity-95 transition"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18 }}
          >
            add
          </span>
          New Merchant
        </button>
      </div>

      <CrmFilters
        value={filters}
        onChange={setFilters}
        serviceTypes={serviceTypes}
        filteredCount={filteredLeads.length}
        totalCount={leads.length}
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[240px] rounded-none bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center" style={{ marginTop: 80 }}>
          <span
            className="material-symbols-outlined text-gray-400"
            style={{ fontSize: 48 }}
          >
            search_off
          </span>
          <div className="mt-3 text-[16px] font-bold text-gray-500">
            No merchants found
          </div>
          <div className="mt-1 text-[13px] text-gray-400">
            Try adjusting your filters
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <MerchantCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      <LeadFormModal
        open={formOpen}
        mode="create"
        initial={null}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
      />
    </div>
  )
}
