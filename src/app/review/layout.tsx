'use client'

import { usePathname } from 'next/navigation'
import { NavSidebar } from '@/components/review/nav-links'
import { ChatPanel } from '@/components/ai/prompt-drawer'
import { PageLoading } from '@/components/review/page-loading'
import { ChatPanelWrapper, ModelToolbar, ContentWrapper, ContentCard } from '@/components/review/layout-shell'

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Show AI editor only on Intent Model pages
  const showAIEditor = (
    pathname === '/review' ||
    pathname === '/review/ia' ||
    pathname === '/review/data-model' ||
    (pathname.startsWith('/review/') &&
     !pathname.includes('/api-endpoints') &&
     !pathname.includes('/brd') &&
     !pathname.includes('/docs') &&
     !pathname.includes('/diff'))
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <PageLoading />

      <NavSidebar />

      <div className="flex flex-1 overflow-hidden">
        <ContentWrapper>
          <ModelToolbar>
            <div className="flex h-[54px] shrink-0 items-center px-3 pl-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Intent Model
              </h2>
            </div>
          </ModelToolbar>

          <ContentCard>
            {children}
          </ContentCard>

          <div className="h-3 shrink-0" />
        </ContentWrapper>

        {showAIEditor && (
          <ChatPanelWrapper>
            <ChatPanel />
          </ChatPanelWrapper>
        )}
      </div>
    </div>
  )
}
