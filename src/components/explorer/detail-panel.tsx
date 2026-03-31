'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Entity } from '@/domain/intent-model/types'
import type { EntityRelationships } from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'

// --- Shared sub-components ---

function TypeBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

// --- Item renderers ---

function EntityDetail({ entity, relationships }: {
  entity: Entity
  relationships?: EntityRelationships
}) {
  const [showTransitions, setShowTransitions] = useState(false)

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {entity.description}
      </p>

      {/* Fields table */}
      <div>
        <FieldLabel>Fields ({entity.key_fields.length})</FieldLabel>
        <div className="space-y-2">
          {entity.key_fields.map((f) => (
            <div key={f.name} className="py-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)' }}>{f.type}</span>
              </div>
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle */}
      <div>
        <FieldLabel>Lifecycle ({entity.lifecycle.states.length} states)</FieldLabel>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {entity.lifecycle.states.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="rounded px-2 py-0.5 text-xs font-mono font-medium"
                style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {s}
              </span>
              {i < entity.lifecycle.states.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
            </span>
          ))}
        </div>

        {entity.lifecycle.transitions.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowTransitions(!showTransitions)}
              className="text-xs font-medium transition-colors duration-200"
              style={{ color: 'var(--accent-blue)' }}
            >
              {showTransitions ? '▾ Hide transitions' : '▸ Show transitions'}
            </button>

            {showTransitions && (
              <table className="mt-2 w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '80px' }}>From</th>
                    <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '80px' }}>To</th>
                    <th className="py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {entity.lifecycle.transitions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: i < entity.lifecycle.transitions.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                      <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.from}</td>
                      <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.to}</td>
                      <td className="py-2 align-top text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Related summary */}
      {relationships && (
        <div>
          <FieldLabel>Related</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {relationships.rules.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: '#F59E0B18', color: '#F59E0B' }}>
                {relationships.rules.length} rules
              </span>
            )}
            {relationships.journeys.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: '#10B98118', color: '#10B981' }}>
                {relationships.journeys.length} journeys
              </span>
            )}
            {relationships.actors.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: '#8B5CF618', color: '#8B5CF6' }}>
                {relationships.actors.length} actors
              </span>
            )}
            {relationships.constraints.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: '#EF444418', color: '#EF4444' }}>
                {relationships.constraints.length} constraints
              </span>
            )}
            {relationships.openQuestions.length > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: '#EC489918', color: '#EC4899' }}>
                {relationships.openQuestions.length} questions
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main panel component ---

type DetailPanelItem = {
  type: 'entity'
  entity: Entity
  relationships?: EntityRelationships
}

type DetailPanelProps = {
  item: DetailPanelItem | null
  onClose: () => void
}

export function DetailPanel({ item, onClose }: DetailPanelProps) {
  if (!item) return null

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-10 flex flex-col"
      style={{
        width: 420,
        minWidth: 420,
        background: 'var(--bg-white)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
        animation: 'slideInRight 200ms ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge label="Entity" color={ENTITY_COLOR} />
          <h3 className="text-sm font-semibold truncate m-0" style={{ color: 'var(--text-primary)' }}>{item.entity.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 transition-colors duration-200 hover:bg-[var(--bg-gray-subtle)]"
        >
          <X size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 custom-scroll">
        <EntityDetail entity={item.entity} relationships={item.relationships} />
      </div>
    </div>
  )
}
