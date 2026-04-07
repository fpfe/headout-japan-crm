'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lead } from '@/types'
import { calcMetrics } from '@/lib/metrics'
import KpiCards from '@/components/dashboard/KpiCards'
import PipelineHealth from '@/components/dashboard/PipelineHealth'
import RecentActivity from '@/components/dashboard/RecentActivity'
import LeadFormModal from '@/components/leads/LeadFormModal'

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load leads')
      setLeads(await res.json())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const metrics = useMemo(() => calcMetrics(leads), [leads])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10 gap-6 flex-wrap">
        <div>
          <h1
            className="font-display text-[#181c23]"
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Dashboard
          </h1>
          <div className="mt-2 text-[16px] text-[#5b4137]">
            Acquisition performance · Japan Market
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#a83900]/30 text-[#a83900] text-sm font-semibold hover:bg-[#a83900]/5 transition"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              download
            </span>
            Generate Report
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-sm hover:opacity-95 transition"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              add
            </span>
            Add New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[200px] rounded-[2rem] bg-gray-200 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="h-[520px] rounded-[2.5rem] bg-gray-200 animate-pulse xl:col-span-2" />
            <div className="h-[520px] rounded-[2.5rem] bg-gray-200 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <KpiCards
            acquisitionRate={metrics.acquisitionRate}
            conversionRate={metrics.conversionRate}
            avgCycleDays={metrics.avgCycleDays}
          />

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <PipelineHealth stageCounts={metrics.stageCounts} />
            <RecentActivity leads={leads} />
          </div>
        </>
      )}

      {/* Footer */}
      <div className="pt-10 mt-10 flex items-center justify-between flex-wrap gap-4">
        <div
          className="text-[10px] uppercase font-bold text-[#181c23]/40"
          style={{ letterSpacing: '0.22em' }}
        >
          Kinetic CRM © 2026 Japan Acquisition Platform
        </div>
        <div className="flex items-center gap-6">
          {['Data Privacy', 'API Status', 'System Logs'].map((l) => (
            <a
              key={l}
              href="#"
              className="text-[10px] uppercase font-bold text-[#181c23]/40 hover:text-[#a83900]"
              style={{ letterSpacing: '0.22em' }}
            >
              {l}
            </a>
          ))}
        </div>
      </div>

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
