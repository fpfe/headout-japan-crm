'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Lead Finder', href: '/lead-finder' },
  { label: 'Deep Search', href: '/deep-search' },
  { label: 'Leads', href: '/leads' },
  { label: 'Members', href: '/members' },
  { label: 'CRM', href: '/crm' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Reports', href: '/reports' },
]

const FOOTER = [
  { label: 'Settings', href: '/settings' },
  { label: 'Support', href: '/support' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col py-7 px-4"
      style={{ background: '#FDFAF5' }}
    >
      <div className="px-3 mb-10">
        <div className="font-display font-extrabold text-[22px] leading-none text-[#1A1A1A]">
          Acquisition
        </div>
        <div className="mt-1 text-[10px] tracking-[0.18em] text-[#1A1A1A] font-semibold">
          JAPAN MARKET
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href !== '#' && pathname?.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative px-4 py-2.5 text-sm font-medium rounded-none transition-colors ${
                active
                  ? 'bg-[#E8E0D0] text-[#1A1A1A]'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
              }`}
              style={
                active
                  ? { boxShadow: 'inset 3px 0 0 0 #2D2D2D' }
                  : undefined
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {FOOTER.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A]"
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 text-sm text-[#5b4137] hover:bg-white/50 rounded-none w-full transition-colors"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20 }}
          >
            logout
          </span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
