'use client'

import { usePathname } from 'next/navigation'

function titleFor(pathname: string | null): string {
  if (!pathname) return 'Kinetic CRM'
  if (/^\/leads\/[^/]+/.test(pathname)) return 'Merchant Profile'
  if (pathname.startsWith('/leads')) return 'Lead Management'
  if (pathname.startsWith('/pipeline')) return 'Sales Pipeline'
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/reports')) return 'Reports'
  return 'Kinetic CRM'
}

export default function TopNav() {
  const pathname = usePathname()
  const title = titleFor(pathname)
  return (
    <header
      className="sticky top-0 z-20 h-[60px] flex items-center px-10 gap-6"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="font-display font-bold text-[15px] text-[#181c23]">
        {title}
      </div>

      <div className="flex-1 flex justify-center">
        <div
          className="flex items-center gap-2 w-[420px] px-4 py-2 rounded-md text-sm text-gray-500"
          style={{ background: '#ebedf8' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="flex-1">Search commands or leads...</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-white text-gray-500 font-medium">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-[#a83900]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
        </button>
        <button className="text-gray-500 hover:text-[#a83900] text-sm font-semibold">⌘</button>
        <div
          className="w-9 h-9 rounded-full brand-gradient text-white text-xs font-bold flex items-center justify-center"
          aria-label="user"
        >
          KS
        </div>
      </div>
    </header>
  )
}
