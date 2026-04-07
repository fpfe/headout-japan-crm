'use client'

import Link from 'next/link'
import type { Lead } from '@/types'

type Props = {
  leads: Lead[]
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function activityFor(lead: Lead): {
  icon: string
  color: string
  text: string
} {
  switch (lead.status) {
    case 'Closed Won':
      return {
        icon: 'check_circle',
        color: 'text-green-600',
        text: `${lead.company} successfully acquired.`,
      }
    case 'Negotiation':
      return {
        icon: 'priority_high',
        color: 'text-[#b60056]',
        text: `Negotiation in progress with ${lead.company}.`,
      }
    case 'Proposal Sent':
      return {
        icon: 'description',
        color: 'text-[#a83900]',
        text: `Proposal sent to ${lead.company}.`,
      }
    case 'New':
      return {
        icon: 'person_add',
        color: 'text-[#685588]',
        text: `New lead: ${lead.company} added.`,
      }
    case 'Contacted':
      return {
        icon: 'person_add',
        color: 'text-[#685588]',
        text: `${lead.company} contacted by ${lead.assignedTo || 'team'}.`,
      }
    default:
      return {
        icon: 'info',
        color: 'text-gray-500',
        text: `${lead.company} updated.`,
      }
  }
}

export default function RecentActivity({ leads }: Props) {
  const recent = [...leads]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5)

  return (
    <div className="bg-[#e5e8f3] rounded-[2.5rem] p-8 xl:col-span-1">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-bold text-[#181c23]"
          style={{ fontSize: 20 }}
        >
          Recent Activity
        </h2>
        <Link
          href="/leads"
          className="text-[12px] font-bold text-[#a83900] hover:opacity-80"
        >
          View All
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {recent.map((lead) => {
          const a = activityFor(lead)
          return (
            <div key={lead.id} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200/60 flex items-center justify-center flex-shrink-0">
                <span
                  className={`material-symbols-outlined ${a.color}`}
                  style={{ fontSize: 20 }}
                >
                  {a.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#181c23] leading-snug">
                  {a.text}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 font-medium">
                  {relativeTime(lead.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        {recent.length === 0 && (
          <div className="text-[13px] text-gray-500">No recent activity.</div>
        )}
      </div>

      {/* Market Spotlight */}
      <div className="mt-8 bg-white rounded-3xl p-6 relative overflow-hidden">
        <div className="text-[11px] font-bold uppercase text-[#a83900] tracking-wider">
          Market Spotlight
        </div>
        <div className="mt-2 font-bold text-[17px] text-[#181c23]">
          Hokkaido Ski Resorts
        </div>
        <div className="mt-2 text-[12px] text-gray-500 leading-relaxed max-w-[80%]">
          Demand up 45% for upcoming season. Focus on premium lodge
          acquisitions.
        </div>
        <span
          className="material-symbols-outlined absolute right-3 bottom-3 text-[#181c23]"
          style={{ fontSize: 80, opacity: 0.1 }}
        >
          ac_unit
        </span>
      </div>
    </div>
  )
}
