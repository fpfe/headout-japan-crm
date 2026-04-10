'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lead } from '@/types'
import { calcMetrics } from '@/lib/metrics'
import KpiCards from '@/components/dashboard/KpiCards'
import PipelineHealth from '@/components/dashboard/PipelineHealth'
import RecentActivity from '@/components/dashboard/RecentActivity'
import OverdueFollowUps from '@/components/dashboard/OverdueFollowUps'
import LeadFormModal from '@/components/leads/LeadFormModal'

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (
        menuWrapRef.current &&
        !menuWrapRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const metrics = useMemo(() => calcMetrics(leads), [leads])

  function exportCSV(leads: Lead[]) {
    const headers = [
      'Company', 'Contact', 'Email',
      'Service Type', 'Lead Source',
      'Assigned To', 'Status', 'Region',
      'Deal Value', 'Created At',
    ]
    const rows = leads.map((l) => [
      l.company, l.contactName, l.email,
      l.serviceType, l.leadSource,
      l.assignedTo, l.status, l.region,
      l.dealValue, l.createdAt,
    ])
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((v) =>
            String(v ?? '').includes(',') ? `"${v}"` : String(v ?? '')
          )
          .join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kinetic-crm-dashboard-${
      new Date().toISOString().split('T')[0]
    }.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF('p', 'mm', 'a4')

    // Header
    doc.setFontSize(20)
    doc.setTextColor(168, 57, 0)
    doc.text('Kinetic CRM', 20, 20)

    doc.setFontSize(12)
    doc.setTextColor(91, 65, 55)
    doc.text('Dashboard Report', 20, 30)
    doc.text(
      `Generated: ${new Date().toLocaleDateString('ja-JP')}`,
      20,
      38
    )

    // KPI Section
    doc.setFontSize(14)
    doc.setTextColor(24, 28, 35)
    doc.text('Key Performance Indicators', 20, 55)

    doc.setFontSize(11)
    doc.setTextColor(91, 65, 55)

    const m = calcMetrics(leads)

    const kpis: [string, string][] = [
      ['Merchant Acquisition Rate', `${m.acquisitionRate}%`],
      ['Lead Conversion Rate', `${m.conversionRate}%`],
      ['Average Sales Cycle', `${m.avgCycleDays} days`],
      ['Total Leads', String(leads.length)],
      ['Total Pipeline Value', `¥${m.totalValue.toLocaleString()}`],
    ]

    kpis.forEach(([label, value], i) => {
      const y = 65 + i * 10
      doc.text(label + ':', 20, y)
      doc.setTextColor(168, 57, 0)
      doc.text(value, 120, y)
      doc.setTextColor(91, 65, 55)
    })

    // Pipeline Health Section
    doc.setFontSize(14)
    doc.setTextColor(24, 28, 35)
    doc.text('Pipeline Health', 20, 125)

    doc.setFontSize(11)
    doc.setTextColor(91, 65, 55)

    const stages: [string, number][] = [
      ['Prospecting (New)', m.stageCounts['New'] ?? 0],
      ['Contacted', m.stageCounts['Contacted'] ?? 0],
      ['Qualification', m.stageCounts['Qualified'] ?? 0],
      ['Proposal', m.stageCounts['Proposal Sent'] ?? 0],
      ['Negotiation', m.stageCounts['Negotiation'] ?? 0],
      ['Closed Won', m.stageCounts['Closed Won'] ?? 0],
      ['Closed Lost', m.stageCounts['Closed Lost'] ?? 0],
    ]

    stages.forEach(([label, count], i) => {
      const y = 135 + i * 10
      doc.text(String(label) + ':', 20, y)
      doc.setTextColor(168, 57, 0)
      doc.text(String(count), 120, y)
      doc.setTextColor(91, 65, 55)
    })

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Kinetic CRM · Internal Use Only · Japan Market',
      20,
      doc.internal.pageSize.getHeight() - 10
    )

    doc.save(
      `kinetic-crm-report-${new Date().toISOString().split('T')[0]}.pdf`
    )
  }

  async function handlePDF() {
    setMenuOpen(false)
    setGenerating(true)
    try {
      await exportPDF()
    } finally {
      setGenerating(false)
    }
  }

  function handleCSV() {
    setMenuOpen(false)
    exportCSV(leads)
  }

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
          <div ref={menuWrapRef} className="relative">
            <button
              type="button"
              disabled={generating}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none border border-[#a83900]/30 text-[#a83900] text-sm font-semibold hover:bg-[#a83900]/5 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  animation: generating
                    ? 'spin 1s linear infinite'
                    : undefined,
                }}
              >
                {generating ? 'progress_activity' : 'download'}
              </span>
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
            {menuOpen && !generating && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #ebedf8',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  padding: 8,
                  minWidth: 180,
                  zIndex: 50,
                }}
              >
                <div
                  onClick={handlePDF}
                  className="hover:bg-[#f1f3fe] rounded-none flex items-center gap-2"
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#181c23',
                    fontSize: 13,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    picture_as_pdf
                  </span>
                  Download PDF
                </div>
                <div
                  onClick={handleCSV}
                  className="hover:bg-[#f1f3fe] rounded-none flex items-center gap-2"
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#181c23',
                    fontSize: 13,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    table_chart
                  </span>
                  Download CSV
                </div>
              </div>
            )}
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
            Add New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[200px] rounded-none bg-gray-200 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="h-[520px] rounded-none bg-gray-200 animate-pulse xl:col-span-2" />
            <div className="h-[520px] rounded-none bg-gray-200 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <KpiCards
            acquisitionRate={metrics.acquisitionRate}
            conversionRate={metrics.conversionRate}
            avgCycleDays={metrics.avgCycleDays}
          />

          <div className="mt-6">
            <OverdueFollowUps />
          </div>

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
