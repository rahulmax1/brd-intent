// src/components/data-model/database-table-node.tsx

'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Key, ArrowRight, Database } from 'lucide-react'
import type { DatabaseTableNodeData } from './database-schema-graph'
import { SCHEMA_TABLE_COLOR, SCHEMA_JUNCTION_COLOR } from './database-schema-graph'

export const DatabaseTableNode = memo(function DatabaseTableNode({ data, selected }: NodeProps) {
  const d = data as unknown as DatabaseTableNodeData
  const [hoveredField, setHoveredField] = useState<number | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFieldTooltip = useCallback((idx: number) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setHoveredField(idx)
  }, [])

  const hideFieldTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHoveredField(null), 200)
  }, [])

  const accentColor = d.isJunction ? SCHEMA_JUNCTION_COLOR : SCHEMA_TABLE_COLOR

  return (
    <div className="relative" style={{ width: 380 }}>
      {/* Handles - all 4 edges */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Top} id="top-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Left} id="left-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} id="bottom-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Right} id="right-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px solid ${selected ? accentColor : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${accentColor}33, 0 4px 16px rgba(0,0,0,0.08)`
            : 'var(--shadow-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: '1px solid var(--border-default)',
            borderLeft: `4px solid ${accentColor}`,
          }}
        >
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {d.name}
          </span>
          <span
            className="ml-2 shrink-0 text-[12px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {d.fields.length}↓
          </span>
        </div>

        {/* Field rows */}
        <div>
          {d.fields.map((field, idx) => (
            <div
              key={idx}
              className="relative flex items-center gap-2 px-3 py-1"
              style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-page)',
                minHeight: 32,
              }}
              onMouseEnter={() => showFieldTooltip(idx)}
              onMouseLeave={hideFieldTooltip}
            >
              {/* Badges */}
              <div className="flex items-center gap-1 shrink-0">
                {field.isPrimaryKey && (
                  <Key size={12} style={{ color: '#EAB308' }} />
                )}
                {field.isForeignKey && (
                  <ArrowRight size={12} style={{ color: '#3B82F6' }} />
                )}
                {!field.isPrimaryKey && !field.isForeignKey && field.isUnique && (
                  <Database size={12} style={{ color: '#6B7280' }} />
                )}
              </div>

              {/* Field name */}
              <span className="flex-1 font-mono text-[13px]" style={{ color: 'var(--text-primary)' }}>
                {field.name}
              </span>

              {/* Type */}
              <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {field.type}
              </span>

              {/* Constraint dots */}
              <div className="flex items-center gap-0.5 shrink-0">
                {!field.isNullable && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#EF4444' }}
                    title="NOT NULL"
                  />
                )}
                {field.isUnique && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#8B5CF6' }}
                    title="UNIQUE"
                  />
                )}
                {field.hasDefault && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: '#10B981' }}
                    title="HAS DEFAULT"
                  />
                )}
              </div>

              {/* Tooltip */}
              {hoveredField === idx && (field.note || field.foreignKeyRef) && (
                <div
                  className="absolute left-full top-0 z-50 ml-2 pointer-events-none"
                  style={{ width: 220 }}
                >
                  <div
                    className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                    style={{
                      background: 'var(--bg-white)',
                      border: '1px solid var(--border-default)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {field.note && <div>{field.note}</div>}
                    {field.foreignKeyRef && (
                      <div className="mt-1 text-[10px]" style={{ color: '#3B82F6' }}>
                        → {field.foreignKeyRef.table}.{field.foreignKeyRef.field}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indexes footer */}
        {d.indexes.length > 0 && (
          <div
            className="px-3 py-1.5 text-[11px]"
            style={{
              borderTop: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            Indexes: {d.indexes.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
})
