'use client'

import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bare = pathname?.startsWith('/login')

  return (
    <SessionProvider>
      {bare ? (
        children
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 ml-[220px] flex flex-col">
            <TopNav />
            <main className="flex-1 px-10 py-8">{children}</main>
          </div>
        </div>
      )}
    </SessionProvider>
  )
}
