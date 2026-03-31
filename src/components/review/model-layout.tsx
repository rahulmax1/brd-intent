'use client'

import { usePathname } from 'next/navigation'
import { NavSidebar } from '@/components/review/nav-links'
import { ChatPanel } from '@/components/ai/prompt-drawer'
import { PageLoading } from '@/components/review/page-loading'
import { ChatPanelWrapper, ModelToolbar, ContentWrapper, ContentCard } from '@/components/review/layout-shell'

export function ModelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Show AI editor on model review pages, architecture, and data model
  const showAIEditor = (
    pathname === '/consensus' ||
    pathname === '/actors' ||
    pathname === '/entities' ||
    pathname === '/journeys' ||
    pathname === '/rules' ||
    pathname === '/constraints' ||
    pathname === '/questions' ||
    pathname === '/architecture' ||
    pathname === '/data-model'
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
