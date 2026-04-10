// Overdue reminder follow-ups — surfaces notes past their reminderDate
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Lead, Note } from '@/types'
import StatusBadge from '@/components/leads/StatusBadge'

type OverdueItem = {
  note: Note
  lead: Lead
  daysOverdue: number
}

export default function OverdueFollowUps() {
  const [items, setItems] = useState<OverdueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [notesRes, leadsRes] = await Promise.all([
          fetch('/api/notes', { cache: 'no-store' }),
          fetch('/api/leads', { cache: 'no-store' }),
        ])
        if (!notesRes.ok || !leadsRes.ok) return
        const notes: Note[] = await notesRes.json()
        const leads: Lead[] = await leadsRes.json()

        const leadMap = new Map(leads.map((l) => [l.id, l]))
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const overdue: OverdueItem[] = []
        for (const note of notes) {
          if (note.isReminder !== 'true' || !note.reminderDate) continue
          const rd = new Date(note.reminderDate)
          if (Number.isNaN(rd.getTime())) continue
          rd.setHours(0, 0, 0, 0)
          if (rd >= today) continue
          const lead = leadMap.get(note.leadId)
          if (!lead) continue
          const daysOverdue = Math.floor(
            (today.getTime() - rd.getTime()) / (1000 * 60 * 60 * 24)
          )
          overdue.push({ note, lead, daysOverdue })
        }

        overdue.sort(
          (a, b) =>
            Date.parse(a.note.reminderDate) - Date.parse(b.note.reminderDate)
        )
        setItems(overdue)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="h-[160px] rounded-none bg-gray-200 animate-pulse" />
    )
  }

  return (
    <div className="bg-[#e5e8f3] rounded-none p-8">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-bold text-[#181c23]"
          style={{ fontSize: 20 }}
        >
          Overdue Follow-Ups
        </h2>
        <span className="text-[12px] font-bold text-[#a83900]">
          {items.length} overdue
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-none bg-green-100 flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-green-600"
              style={{ fontSize: 20 }}
            >
              check_circle
            </span>
          </div>
          <span className="text-[13px] text-green-700 font-medium">
            All follow-ups are on track
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <Link
              key={item.note.id}
              href={`/leads/${item.lead.id}`}
              className="flex items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-none bg-white border border-gray-200/60 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-[#a83900]"
                  style={{ fontSize: 20 }}
                >
                  notifications_active
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#181c23] group-hover:underline">
                    {item.lead.company}
                  </span>
                  <StatusBadge status={item.lead.status} />
                  <span className="text-[11px] font-bold text-[#a83900]">
                    {item.daysOverdue}d overdue
                  </span>
                </div>
                <div className="text-[12px] text-[#5b4137] mt-1 leading-snug truncate">
                  {item.note.content.length > 80
                    ? item.note.content.slice(0, 80) + '...'
                    : item.note.content}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
