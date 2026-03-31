'use client'

import { usePathname } from 'next/navigation'

const FULL_WIDTH_ROUTES = [
  '/review/docs', '/review/diff', '/review/ia', '/review/brd', '/review/data-model',
  '/documents', '/versions', '/architecture', '/brd', '/data-model'
]

function isFullWidthPage(pathname: string) {
  return FULL_WIDTH_ROUTES.some(r => pathname.startsWith(r))
}

export function ChatPanelWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hidden = isFullWidthPage(pathname)
  return (
    <div
      className="transition-[width,opacity] duration-200 overflow-hidden shrink-0"
      style={{
        width: hidden ? 0 : undefined,
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : undefined,
      }}
    >
      {children}
    </div>
  )
}

export function ModelToolbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isFullWidthPage(pathname)) return null
  return <>{children}</>
}

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${isFullWidthPage(pathname) ? 'mr-0' : ''}`}>
      {children}
    </div>
  )
}

export function ContentCard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isFullWidthPage(pathname)) {
    return (
      <div
        className="flex-1 overflow-hidden"
        style={{ background: 'var(--bg-white)' }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className="ml-1 flex-1 overflow-y-auto rounded-xl custom-scroll"
      style={{
        background: 'var(--bg-card-gray)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  )
}
