'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { projectConfig } from '@/lib/project-config'
import {
  Home,
  Users,
  Box,
  Route,
  Scale,
  Lock,
  HelpCircle,
  LayoutDashboard,
  Network,
  FileText,
  ClipboardList,
  Code,
  Map,
  TableProperties,
  GitCompare,
  Settings,
  Sparkles,
  Layers,
  ExternalLink,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: typeof Home
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const topLevelItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
]

type NavParent = {
  label: string
  href: string
  icon: typeof Home
  children?: NavItem[]
}

type NavGroupWithParent = {
  label: string
  items: (NavItem | NavParent)[]
}

const navGroups: NavGroupWithParent[] = [
  {
    label: 'BRD & Discussions',
    items: [
      { label: 'Current BRD', href: '/brd-current', icon: FileText },
    ],
  },
  {
    label: 'Intent Model',
    items: [
      { label: 'Consensus', href: '/consensus', icon: LayoutDashboard },
      { label: '3D Explorer', href: '/explorer', icon: Network },
      { label: 'Version History', href: '/versions', icon: GitCompare },
    ],
  },
  {
    label: 'Derived Artefacts',
    items: [
      { label: 'Generated BRD', href: '/brd', icon: ClipboardList },
      { label: 'Simple Version', href: '/simple', icon: Sparkles },
      { label: 'Info Architecture', href: '/architecture', icon: Map },
      { label: 'DB Schema', href: '/data-model', icon: TableProperties },
      { label: 'API Specs', href: '/api-spec', icon: Code },
      { label: 'Screens List', href: '/screens', icon: Layers },
    ],
  },
]

function NavGroup({ group, pathname }: { group: NavGroupWithParent; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5 mb-3">
      <div className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {group.label}
      </div>
      {group.items.map(item => {
        const Icon = item.icon
        const isParent = 'children' in item
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`nav-item flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-200 ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
            {isParent && item.children && (
              <div className="flex flex-col gap-0.5 mt-0.5 ml-3">
                {item.children.map(child => {
                  const ChildIcon = child.icon
                  const isChildActive = pathname === child.href

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`nav-item flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-200 ${isChildActive ? 'nav-item-active' : ''}`}
                    >
                      <ChildIcon size={14} />
                      <span>{child.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <nav className="nav-sidebar flex w-[200px] shrink-0 flex-col py-3 px-2">
      {/* Logo — links home */}
      <Link href="/" className="mb-4 flex items-center gap-2.5 px-2 no-underline">
        <div className="nav-logo flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold">
          {projectConfig.iconLetter}
        </div>
        <span className="nav-title text-sm font-semibold">
          {projectConfig.shortName}
        </span>
      </Link>

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {/* Top level items */}
        <div className="flex flex-col gap-0.5 mb-2">
          {topLevelItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200 ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Grouped items */}
        {navGroups.map(group => (
          <NavGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </div>

      {/* Bottom: settings */}
      <Link
        href="#"
        className="nav-item nav-item-muted flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200"
      >
        <Settings size={18} />
        <span>Settings</span>
      </Link>
    </nav>
  )
}
