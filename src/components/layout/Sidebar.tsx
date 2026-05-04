'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useI18n } from '@/lib/i18n'

const NAV_GROUPS = [
  {
    labelKey: 'nav.overview',
    items: [
      { labelKey: 'nav.dashboard', href: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    labelKey: 'nav.acquisition',
    items: [
      { labelKey: 'nav.leadFinder', href: '/lead-finder', icon: 'person_search' },
      { labelKey: 'nav.deepSearch', href: '/deep-search', icon: 'travel_explore' },
      { labelKey: 'nav.leads', href: '/leads', icon: 'groups' },
    ],
  },
  {
    labelKey: 'nav.sales',
    items: [
      { labelKey: 'nav.pipeline', href: '/pipeline', icon: 'hub' },
      { labelKey: 'nav.crm', href: '/crm', icon: 'contacts' },
      { labelKey: 'nav.reports', href: '/reports', icon: 'bar_chart' },
    ],
  },
  {
    labelKey: 'nav.intelligence',
    items: [
      { labelKey: 'nav.news', href: '/news', icon: 'newspaper' },
    ],
  },
  {
    labelKey: 'nav.team',
    items: [
      { labelKey: 'nav.members', href: '/members', icon: 'person_add' },
    ],
  },
]

type SidebarProps = {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col py-6 px-4"
      style={{
        background: '#FDFAF5',
        borderRight: '1px solid rgba(24,28,35,0.06)',
      }}
    >
      {/* Wordmark */}
      <div className="px-3 mb-5">
        <div
          className="font-display font-extrabold text-[22px] leading-none text-[#1A1A1A]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('sidebar.title')}
        </div>
        <div className="mt-1.5 text-[10px] tracking-[0.22em] text-[#1A1A1A] font-bold">
          {t('sidebar.subtitle')}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey}>
            <div className="px-3 py-2 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-[0.18em] mt-3 first:mt-0">
              {t(group.labelKey)}
            </div>
            {group.items.map((item) => {
              const active = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  onClick={onNavigate}
                  className={`relative flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium rounded-none transition-colors ${
                    active
                      ? 'bg-[#E8E0D0] text-[#1A1A1A] font-semibold'
                      : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                  }`}
                  style={
                    active
                      ? { boxShadow: 'inset 3px 0 0 0 #2D2D2D' }
                      : undefined
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    {item.icon}
                  </span>
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: user + sign out */}
      <div
        className="pt-3 mt-auto flex flex-col gap-1"
        style={{ borderTop: '1px solid rgba(24,28,35,0.06)' }}
      >
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div
            className="w-8 h-8 flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: '#A83900' }}
          >
            SA
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-[#181C23] leading-tight">
              Seungjun Ahn
            </span>
            <span className="text-[10px] text-[#6B7280]">
              Head of BD Japan
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A] rounded-none w-full transition-colors"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18 }}
          >
            logout
          </span>
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  )
}
