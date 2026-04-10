'use client'

import type { Lead } from '@/types'

export default function PipelineStats({ leads }: { leads: Lead[] }) {
  const won = leads.filter((l) => l.status === 'Closed Won').length
  const lost = leads.filter((l) => l.status === 'Closed Lost').length
  const winRate =
    won + lost === 0 ? '—' : `${((won / (won + lost)) * 100).toFixed(1)}%`

  return (
    <div
      className="fixed flex items-center gap-5"
      style={{
        bottom: 32,
        right: 32,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 0,
        padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      <Stat
        label="Win Rate"
        value={winRate}
        color="#a83900"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        }
      />
      <div style={{ width: 1, height: 40, background: 'rgba(24,28,35,0.1)' }} />
      <Stat
        label="Velocity"
        value="14d"
        color="#685588"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12l5-3" />
          </svg>
        }
      />
    </div>
  )
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ color }}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span className="text-[16px] font-extrabold text-[#181c23]">
          {value}
        </span>
      </div>
    </div>
  )
}
