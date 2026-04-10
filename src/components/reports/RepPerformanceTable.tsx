'use client'

import { useMemo } from 'react'
import type { Lead } from '@/types'

type RepStat = {
  repName: string
  totalLeads: number
  closedWon: number
  conversionRate: string
  totalValue: number
  avgCycleDays: number
}

const AVATAR_COLORS = [
  '#a83900',
  '#ff5a00',
  '#b60056',
  '#685588',
  '#2f6f4e',
  '#1d4e89',
]

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
}

function ConversionPill({ rate }: { rate: number }) {
  let bg = 'rgba(107, 114, 128, 0.12)'
  let color = '#4b5563'
  if (rate >= 50) {
    bg = 'rgba(34, 139, 84, 0.14)'
    color = '#1f7a4d'
  } else if (rate >= 20) {
    bg = 'rgba(217, 137, 17, 0.16)'
    color = '#a86200'
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-none text-[11px] font-bold"
      style={{ background: bg, color }}
    >
      {rate.toFixed(1)}%
    </span>
  )
}

export default function RepPerformanceTable({ leads }: { leads: Lead[] }) {
  const stats: RepStat[] = useMemo(() => {
    const groups = new Map<string, Lead[]>()
    for (const l of leads) {
      const key = l.assignedTo || 'Unassigned'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(l)
    }
    const now = Date.now()
    const out: RepStat[] = []
    groups.forEach((items, repName) => {
      const won = items.filter((l) => l.status === 'Closed Won')
      const conversion = items.length > 0 ? (won.length / items.length) * 100 : 0
      const totalValue = items.reduce(
        (s, l) => s + parseInt(l.dealValue || '0', 10),
        0
      )
      const avgCycleDays =
        won.length > 0
          ? Math.round(
              won.reduce((s, l) => {
                const d = Math.floor(
                  (now - new Date(l.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return s + d
              }, 0) / won.length
            )
          : 0
      out.push({
        repName,
        totalLeads: items.length,
        closedWon: won.length,
        conversionRate: conversion.toFixed(1),
        totalValue,
        avgCycleDays,
      })
    })
    out.sort((a, b) => b.totalLeads - a.totalLeads)
    return out
  }, [leads])

  return (
    <div className="bg-white rounded-none p-6">
      <h2
        className="font-display text-[#181c23] mb-5"
        style={{ fontSize: '1.25rem', fontWeight: 700 }}
      >
        Performance by Rep
      </h2>

      {stats.length === 0 ? (
        <div className="py-10 text-center text-[#5b4137]/60 text-sm">
          No rep data available for selected filters
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-1">
            <thead>
              <tr>
                {['REP', 'LEADS', 'CLOSED WON', 'CONVERSION', 'VALUE', 'AVG CYCLE'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className="text-[11px] font-bold text-[#5b4137]/60 py-2 px-3"
                      style={{
                        letterSpacing: '0.15em',
                        textAlign: i === 0 ? 'left' : 'right',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr
                  key={s.repName}
                  className="transition-colors hover:bg-[#f1f3fe]"
                >
                  <td className="py-3 px-3 rounded-none">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-none flex items-center justify-center text-white text-[11px] font-bold"
                        style={{ background: colorForName(s.repName) }}
                      >
                        {initials(s.repName)}
                      </div>
                      <span className="text-[13px] font-semibold text-[#181c23]">
                        {s.repName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-[13px] text-[#181c23]">
                    {s.totalLeads}
                  </td>
                  <td className="py-3 px-3 text-right text-[13px] text-[#181c23]">
                    {s.closedWon}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ConversionPill rate={parseFloat(s.conversionRate)} />
                  </td>
                  <td className="py-3 px-3 text-right text-[13px] text-[#181c23]">
                    ¥{s.totalValue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-[13px] text-[#181c23] rounded-none">
                    {s.avgCycleDays} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
