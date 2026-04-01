'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center gap-1.5 transition-colors duration-150"
        style={{ color: 'var(--text-muted)' }}
      >
        <Home size={14} />
        <span className="hover:underline">Home</span>
      </Link>

      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors duration-150 hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
