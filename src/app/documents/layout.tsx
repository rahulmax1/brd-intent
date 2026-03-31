'use client'

import { NavSidebar } from '@/components/review/nav-links'
import { PageLoading } from '@/components/review/page-loading'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <PageLoading />
      <NavSidebar />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
