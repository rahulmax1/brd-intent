'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Box, Route, Scale, Lock, HelpCircle, LayoutDashboard } from 'lucide-react'

type Tab = {
  label: string
  href: string
  icon: typeof Users
}

const tabs: Tab[] = [
  { label: 'Consensus', href: '/consensus', icon: LayoutDashboard },
  { label: 'Actors', href: '/actors', icon: Users },
  { label: 'Entities', href: '/entities', icon: Box },
  { label: 'Journeys', href: '/journeys', icon: Route },
  { label: 'Business Rules', href: '/rules', icon: Scale },
  { label: 'Constraints', href: '/constraints', icon: Lock },
  { label: 'Open Questions', href: '/questions', icon: HelpCircle },
]

export function ModelTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 px-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2"
            style={{
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderColor: isActive ? 'var(--accent-blue)' : 'transparent',
              marginBottom: '-1px',
            }}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
