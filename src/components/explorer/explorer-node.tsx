'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import type { ExplorerNodeData } from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'

export const ExplorerNode = memo(function ExplorerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ExplorerNodeData
  const [hovered, setHovered] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTooltip = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setHovered(true)
  }, [])

  const hideTooltip = useCallback(() => {
    hideTimeout.current = setTimeout(() => setHovered(false), 300)
  }, [])

  const isHighlighted = hovered || selected

  return (
    <div
      className="group relative"
      style={{ zIndex: hovered ? 9999 : 'auto' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div
        className="relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px solid ${isHighlighted ? ENTITY_COLOR : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${ENTITY_COLOR}33, 0 4px 16px rgba(0,0,0,0.08)`
            : hovered
              ? '0 4px 16px rgba(0,0,0,0.08)'
              : 'var(--shadow-subtle)',
          minWidth: 180,
          cursor: 'pointer',
        }}
      >
        <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${ENTITY_COLOR}14` }}
        >
          <Database size={16} style={{ color: ENTITY_COLOR }} strokeWidth={1.8} />
        </div>

        <div className="flex flex-col">
          <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {nodeData.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {nodeData.fieldCount} fields
            </span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {nodeData.stateCount} states
            </span>
          </div>
        </div>

        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      </div>

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ top: 'calc(100% + 8px)', zIndex: 99999 }}
        >
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              width: 280,
            }}
          >
            <p className="text-[12px] leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
              {nodeData.description.length > 150
                ? nodeData.description.slice(0, 150) + '...'
                : nodeData.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
})
