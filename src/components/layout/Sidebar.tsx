'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leads', href: '/leads' },
  { label: 'Members', href: '/members' },
  { label: 'CRM', href: '#' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Reports', href: '#' },
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
      style={{ background: '#f1f3fe' }}
    >
      <div className="px-3 mb-10">
        <div className="font-display font-extrabold text-[22px] leading-none text-[#a83900]">
          Acquisition
        </div>
        <div className="mt-1 text-[10px] tracking-[0.18em] text-gray-500 font-semibold">
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
              className={`relative px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                active
                  ? 'bg-white text-[#a83900]'
                  : 'text-gray-600 hover:text-[#a83900]'
              }`}
              style={
                active
                  ? { boxShadow: 'inset 3px 0 0 0 #a83900' }
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
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-[#a83900]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
