'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'
import { calcMetrics } from '@/lib/metrics'

type Card = {
  icon: string
  iconBg: string
  iconColor: string
  label: string
  value: string
}

export default function KpiSummaryRow({ leads }: { leads: Lead[] }) {
  const metrics = useMemo(() => calcMetrics(leads), [leads])

  const cards: Card[] = [
    {
      icon: 'groups',
      iconBg: 'rgba(168, 57, 0, 0.05)',
      iconColor: '#a83900',
      label: 'TOTAL LEADS',
      value: String(leads.length),
    },
    {
      icon: 'trending_up',
      iconBg: 'rgba(168, 57, 0, 0.05)',
      iconColor: '#a83900',
      label: 'ACQUISITION RATE',
      value: `${metrics.acquisitionRate}%`,
    },
    {
      icon: 'hub',
      iconBg: 'rgba(182, 0, 86, 0.05)',
      iconColor: '#b60056',
      label: 'CONVERSION RATE',
      value: `${metrics.conversionRate}%`,
    },
    {
      icon: 'schedule',
      iconBg: 'rgba(104, 85, 136, 0.05)',
      iconColor: '#685588',
      label: 'AVG SALES CYCLE',
      value: `${metrics.avgCycleDays} days`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-none p-6 flex flex-col gap-4"
        >
          <div
            className="w-11 h-11 rounded-none flex items-center justify-center"
            style={{ background: c.iconBg }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, color: c.iconColor }}
            >
              {c.icon}
            </span>
          </div>
          <div>
            <div
              className="text-[10px] font-bold text-[#5b4137]/70"
              style={{ letterSpacing: '0.18em' }}
            >
              {c.label}
            </div>
            <div
              className="mt-1 font-display text-[#181c23]"
              style={{ fontSize: '1.75rem', fontWeight: 800 }}
            >
              {c.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
