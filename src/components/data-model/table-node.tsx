'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { TableNodeData } from './data-model-graph'
import { ENTITY_COLOR } from './data-model-graph'

export const TableNode = memo(function TableNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableNodeData
  const [hoveredField, setHoveredField] = useState<number | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFieldTooltip = useCallback((idx: number) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setHoveredField(idx)
  }, [])

  const hideFieldTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHoveredField(null), 200)
  }, [])

  return (
    <div className="relative" style={{ width: 360 }}>
      {/* Handles — each position has both source and target for flexible edge routing */}
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
          border: `1.5px solid ${selected ? ENTITY_COLOR : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${ENTITY_COLOR}33, 0 4px 16px rgba(0,0,0,0.08)`
            : 'var(--shadow-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: '1px solid var(--border-default)',
            borderLeft: `4px solid ${ENTITY_COLOR}`,
          }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {d.name}
          </span>
          {d.states.length > 0 && (
            <span
              className="ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${ENTITY_COLOR}14`, color: ENTITY_COLOR }}
            >
              {d.states.length} states
            </span>
          )}
        </div>

        {/* Field rows */}
        <div>
          {d.fields.map((field, idx) => (
            <div
              key={field.name}
              className="relative flex items-center justify-between px-3 py-1"
              style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-page)',
                minHeight: 28,
              }}
              onMouseEnter={() => showFieldTooltip(idx)}
              onMouseLeave={hideFieldTooltip}
            >
              <span className="flex items-center gap-1.5 font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {field.warn && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: '#F59E0B' }}
                  />
                )}
                {field.name}
              </span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {field.type}
              </span>

              {/* Field description tooltip */}
              {hoveredField === idx && field.description && (
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
                    {field.description}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Lifecycle footer */}
        {d.states.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1 px-3 py-1.5"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            {d.states.map(state => (
              <span
                key={state}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'var(--bg-page)',
                  color: 'var(--text-muted)',
                }}
              >
                {state}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
