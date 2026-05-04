'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCommandPalette } from '@/components/ui/CommandPalette'
import { useI18n, LanguageToggle } from '@/lib/i18n'
import { useViewingAs } from '@/lib/use-viewing-as'
import type { Member } from '@/types'

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'page.dashboard',
  '/leads': 'page.leadManagement',
  '/pipeline': 'page.salesPipeline',
  '/reports': 'page.reports',
  '/crm': 'page.merchantCRM',
  '/lead-finder': 'page.leadFinder',
  '/deep-search': 'page.deepSearch',
  '/members': 'page.teamMembers',
}

function titleKeyFor(pathname: string | null): string {
  if (!pathname) return 'Headout Japan CRM'
  if (/^\/leads\/[^/]+/.test(pathname)) return 'page.merchantProfile'
  for (const [prefix, key] of Object.entries(TITLE_MAP)) {
    if (pathname.startsWith(prefix)) return key
  }
  return 'Headout Japan CRM'
}

type Props = {
  onMenuToggle?: () => void
}

export default function TopNav({ onMenuToggle }: Props) {
  const pathname = usePathname()
  const { t } = useI18n()
  const titleKey = titleKeyFor(pathname)
  const title = titleKey.startsWith('page.') ? t(titleKey) : titleKey
  const { open: openPalette } = useCommandPalette()
  return (
    <header
      className="sticky top-0 z-20 h-[52px] sm:h-[60px] flex items-center px-4 sm:px-6 lg:px-10 gap-3 sm:gap-6"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(24,28,35,0.06)',
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#181C23] -ml-1"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
      </button>

      <div className="font-display font-bold text-[13px] sm:text-[15px] text-[#181c23] truncate shrink-0">
        {title}
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <button
          type="button"
          onClick={openPalette}
          className="hidden sm:flex items-center gap-2.5 w-full max-w-[420px] px-4 py-2 rounded-none text-[13px] text-[#6B7280] hover:text-[#181C23] transition-colors cursor-pointer"
          style={{ background: '#EBEDF8' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            search
          </span>
          <span className="flex-1 text-left">{t('ui.search')}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-none bg-white text-[#6B7280] font-medium"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            ⌘K
          </span>
        </button>
        {/* Mobile search icon */}
        <button
          type="button"
          onClick={openPalette}
          className="sm:hidden w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#181C23]"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ViewingAsPicker />
        <LanguageToggle />
        <button
          className="hidden sm:flex w-9 h-9 items-center justify-center text-[#6B7280] hover:text-[#181C23] transition-colors"
          title="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            notifications
          </span>
        </button>
        <button
          className="hidden sm:flex w-9 h-9 items-center justify-center text-[#6B7280] hover:text-[#181C23] transition-colors"
          title="Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            settings
          </span>
        </button>
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-none text-white text-xs font-bold flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #A83900 0%, #FF5A00 100%)' }}
          aria-label="user"
        >
          SA
        </div>
      </div>
    </header>
  )
}

/** Small dropdown that lets the user pick which team member they
 *  currently identify as. Persists to localStorage via useViewingAs.
 *  Backbone for "My Leads" filter and (future) per-user views.
 */
function ViewingAsPicker() {
  const { name, setName } = useViewingAs()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (loaded) return
    fetch('/api/members')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (Array.isArray(rows)) setMembers(rows as Member[])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [loaded])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const options = (() => {
    const names = new Set<string>(members.map((m) => m.name).filter(Boolean))
    if (name) names.add(name)
    return Array.from(names).sort()
  })()

  return (
    <div ref={ref} className="hidden sm:block relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change which team member you're viewing the app as"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-none text-[11px] font-bold uppercase border border-gray-200 hover:border-[#a83900] hover:text-[#a83900] text-gray-600 transition-colors"
        style={{ letterSpacing: '0.1em' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
        <span className="text-[11px] font-semibold normal-case tracking-normal text-[#181c23]">
          {name}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 min-w-[200px] bg-white rounded-none py-1 border border-gray-200"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100">
            Viewing as
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-gray-400">No team members</div>
          ) : (
            options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setName(n)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f5f0e8] transition-colors ${
                  n === name ? 'font-bold text-[#a83900]' : 'text-[#181c23]'
                }`}
              >
                {n}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
