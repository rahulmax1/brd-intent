'use client'

import { NavSidebar } from '@/components/review/nav-links'
import { PageLoading } from '@/components/review/page-loading'
import { ModelToolbar, ContentWrapper, ContentCard } from '@/components/review/layout-shell'

export function SimpleLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <PageLoading />

      <NavSidebar />

      <ContentWrapper>
        {title && (
          <ModelToolbar>
            <div className="flex h-[54px] shrink-0 items-center px-3 pl-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h2>
            </div>
          </ModelToolbar>
        )}

        <ContentCard>
          {children}
        </ContentCard>

        <div className="h-3 shrink-0" />
      </ContentWrapper>
    </div>
  )
}
