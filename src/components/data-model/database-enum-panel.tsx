// src/components/data-model/database-enum-panel.tsx

'use client'

import { useState } from 'react'
import { List, X } from 'lucide-react'
import type { DbmlEnum } from './parse-dbml'

type DatabaseEnumPanelProps = {
  enums: DbmlEnum[]
}

export function DatabaseEnumPanel({ enums }: DatabaseEnumPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEnums = enums.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) {
    return (
      <div className="absolute right-4 top-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <List size={16} />
          <span>Enums ({enums.length})</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="absolute right-0 top-0 z-20 flex h-full flex-col overflow-hidden transition-all duration-200"
      style={{
        width: 280,
        background: 'var(--bg-white)',
        borderLeft: '3px solid #8B5CF6',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Enums ({enums.length})
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 transition-colors hover:bg-gray-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      {enums.length > 5 && (
        <div className="px-3 py-2 shrink-0">
          <input
            type="text"
            placeholder="Search enums..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-md px-2 py-1 text-sm"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-page)',
            }}
          />
        </div>
      )}

      {/* Enum list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-3">
          {filteredEnums.map(enumDef => (
            <div
              key={enumDef.name}
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--bg-page)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* Enum header */}
              <div
                className="flex items-center justify-between px-2 py-1.5"
                style={{
                  background: 'var(--bg-white)',
                  borderLeft: '3px solid #8B5CF6',
                }}
              >
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {enumDef.name}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  [{enumDef.values.length}]
                </span>
              </div>

              {/* Enum values */}
              <div className="px-2 py-1.5">
                {enumDef.values.map(value => (
                  <div
                    key={value}
                    className="text-[11px] py-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    • {value}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
