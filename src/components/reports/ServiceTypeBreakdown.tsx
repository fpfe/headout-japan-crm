'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'

type Row = {
  type: string
  count: number
  percentage: number
  wonCount: number
}

export default function ServiceTypeBreakdown({ leads }: { leads: Lead[] }) {
  const rows: Row[] = useMemo(() => {
    const groups = new Map<string, Lead[]>()
    for (const l of leads) {
      const key = l.serviceType || 'Other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(l)
    }
    const total = leads.length
    const out: Row[] = []
    groups.forEach((items, type) => {
      out.push({
        type,
        count: items.length,
        percentage: total > 0 ? Math.round((items.length / total) * 100) : 0,
        wonCount: items.filter((l) => l.status === 'Closed Won').length,
      })
    })
    out.sort((a, b) => b.count - a.count)
    return out
  }, [leads])

  return (
    <div
      className="rounded-none p-6"
      style={{ background: '#f1f3fe' }}
    >
      <h2
        className="font-display text-[#181c23] mb-5"
        style={{ fontSize: '1.25rem', fontWeight: 700 }}
      >
        Leads by Service Type
      </h2>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-[#5b4137]/60 text-sm">
          No data for selected filters
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.type} className="flex items-center gap-4">
              <div
                className="text-[13px] font-bold text-[#181c23]"
                style={{ minWidth: 140 }}
              >
                {r.type}
              </div>
              <div
                className="flex-1 rounded-none overflow-hidden flex items-center"
                style={{ background: '#ebedf8', height: 36 }}
              >
                <div
                  className="h-full flex items-center justify-end pr-3 rounded-none"
                  style={{
                    width: `${r.percentage}%`,
                    background:
                      'linear-gradient(90deg, #a83900 0%, #ff5a00 100%)',
                    minWidth: r.count > 0 ? 28 : 0,
                  }}
                >
                  {r.count > 0 && (
                    <span className="text-white text-[11px] font-bold">
                      {r.percentage}%
                    </span>
                  )}
                </div>
              </div>
              <div
                className="text-[12px] font-bold text-[#5b4137]/70"
                style={{ minWidth: 64, textAlign: 'right' }}
              >
                {r.count} leads
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
