'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'

function topKey(items: Lead[], key: keyof Lead) {
  const counts = new Map<string, number>()
  for (const l of items) {
    const v = (l[key] as string) || 'Unknown'
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  let best = ''
  let max = 0
  counts.forEach((v, k) => {
    if (v > max) {
      max = v
      best = k
    }
  })
  return { name: best, count: max }
}

export default function InsightsPanel({ leads }: { leads: Lead[] }) {
  const insights = useMemo(() => {
    const topSource = topKey(leads, 'leadSource')
    const activeLeads = leads.filter((l) => l.status !== 'Closed Lost')
    const hotRegion = topKey(activeLeads, 'region')
    const now = Date.now()
    const stagnant = leads.filter((l) => {
      if (l.status === 'Closed Won' || l.status === 'Closed Lost') return false
      const days = Math.floor(
        (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return days > 14
    }).length
    return { topSource, hotRegion, stagnant }
  }, [leads])

  return (
    <div
      className="rounded-none p-6"
      style={{ background: '#e5e8f3' }}
    >
      <h2
        className="font-display text-[#181c23] mb-5"
        style={{ fontSize: '1.25rem', fontWeight: 700 }}
      >
        Acquisition Insights
      </h2>

      <div className="flex flex-col gap-3">
        <InsightCard
          icon="hub"
          color="#a83900"
          label="TOP LEAD SOURCE"
          value={insights.topSource.name || '—'}
          sub={`${insights.topSource.count} leads from this source`}
        />
        <InsightCard
          icon="location_on"
          color="#685588"
          label="HOTTEST REGION"
          value={insights.hotRegion.name || '—'}
          sub={`${insights.hotRegion.count} active leads`}
        />
        <InsightCard
          icon="warning"
          color="#b60056"
          label="STAGNANT LEADS"
          value={
            insights.stagnant === 0
              ? 'All leads are active'
              : `${insights.stagnant} leads`
          }
          sub={
            insights.stagnant === 0 ? '' : 'No activity for 14+ days'
          }
          valueColor={insights.stagnant === 0 ? '#1f7a4d' : undefined}
        />
      </div>
    </div>
  )
}

function InsightCard({
  icon,
  color,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: string
  color: string
  label: string
  value: string
  sub: string
  valueColor?: string
}) {
  return (
    <div className="bg-white rounded-none p-4 flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-none flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}14` }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color }}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <div
          className="text-[10px] font-bold"
          style={{ letterSpacing: '0.16em', color }}
        >
          {label}
        </div>
        <div
          className="mt-1 font-bold text-[16px] truncate"
          style={{ color: valueColor || '#181c23' }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[12px] text-[#5b4137]/70 mt-0.5">{sub}</div>
        )}
      </div>
    </div>
  )
}
