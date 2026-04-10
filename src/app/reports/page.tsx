'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lead } from '@/types'
import ReportFilters, {
  type ReportFilterValue,
} from '@/components/reports/ReportFilters'
import KpiSummaryRow from '@/components/reports/KpiSummaryRow'
import RepPerformanceTable from '@/components/reports/RepPerformanceTable'
import ServiceTypeBreakdown from '@/components/reports/ServiceTypeBreakdown'
import InsightsPanel from '@/components/reports/InsightsPanel'

const DATE_LABELS: Record<ReportFilterValue['dateRange'], string> = {
  all: 'all leads',
  month: 'this month',
  '3months': 'last 3 months',
  '6months': 'last 6 months',
  year: 'this year',
}

function withinDateRange(createdAt: string, range: ReportFilterValue['dateRange']) {
  if (range === 'all') return true
  const created = new Date(createdAt)
  if (isNaN(created.getTime())) return false
  const now = new Date()
  if (range === 'month') {
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    )
  }
  if (range === 'year') {
    return created.getFullYear() === now.getFullYear()
  }
  const months = range === '3months' ? 3 : 6
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - months)
  return created >= cutoff
}

function exportCSV(leads: Lead[]) {
  const headers = [
    'Company',
    'Contact',
    'Email',
    'Service Type',
    'Lead Source',
    'Assigned To',
    'Status',
    'Region',
    'Deal Value',
    'Created At',
  ]
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = leads.map((l) => [
    l.company,
    l.contactName,
    l.email,
    l.serviceType,
    l.leadSource,
    l.assignedTo,
    l.status,
    l.region,
    l.dealValue,
    l.createdAt,
  ])
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kinetic-crm-report-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilterValue>({
    dateRange: 'all',
    serviceType: '',
    assignedTo: '',
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
  const reps = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.assignedTo).filter(Boolean))).sort(),
    [leads]
  )

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (!withinDateRange(l.createdAt, filters.dateRange)) return false
        if (filters.serviceType && l.serviceType !== filters.serviceType)
          return false
        if (filters.assignedTo && l.assignedTo !== filters.assignedTo)
          return false
        return true
      }),
    [leads, filters]
  )

  const subtitle = useMemo(() => {
    const parts: string[] = []
    parts.push(
      filters.dateRange === 'all'
        ? 'Showing all leads'
        : `Showing ${DATE_LABELS[filters.dateRange]}`
    )
    parts.push(
      filters.serviceType ? filters.serviceType : 'All service types'
    )
    parts.push(filters.assignedTo ? filters.assignedTo : 'All reps')
    return parts.join(' · ')
  }, [filters])

  return (
    <div
      style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem' }}
    >
      <div className="flex items-start justify-between mb-8 gap-6 flex-wrap">
        <div>
          <div
            className="text-[11px] font-bold uppercase text-[#a83900]"
            style={{ letterSpacing: '0.22em' }}
          >
            Analytics & Reports
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
            Performance Report
          </h1>
          <div className="mt-2 text-[14px] text-[#5b4137]">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => exportCSV(filtered)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-none border border-[#a83900]/30 text-[#a83900] text-sm font-semibold hover:bg-[#a83900]/5 transition"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18 }}
          >
            download
          </span>
          Export CSV
        </button>
      </div>

      <ReportFilters
        value={filters}
        onChange={setFilters}
        serviceTypes={serviceTypes}
        reps={reps}
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[140px] rounded-none bg-gray-200 animate-pulse"
              />
            ))}
          </div>
          <div className="h-[320px] rounded-none bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="h-[360px] rounded-none bg-gray-200 animate-pulse xl:col-span-2" />
            <div className="h-[360px] rounded-none bg-gray-200 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <KpiSummaryRow leads={filtered} />
          <RepPerformanceTable leads={filtered} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <ServiceTypeBreakdown leads={filtered} />
            </div>
            <div className="xl:col-span-1">
              <InsightsPanel leads={filtered} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
