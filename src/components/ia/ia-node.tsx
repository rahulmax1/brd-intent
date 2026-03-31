'use client'

import { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { IANodeData } from './ia-types'
import { ICON_MAP } from './ia-icons'

const statusColors = {
  done: '#25BA3B',
  partial: '#F59E0B',
  'not-built': '#D1D5DB',
} as const

const statusLabels = {
  done: 'Done',
  partial: 'Partial',
  'not-built': 'Not built',
} as const

export function IANode({ data }: NodeProps) {
  const nodeData = data as unknown as IANodeData
  const Icon = ICON_MAP[nodeData.iconName] ?? ICON_MAP.HelpCircle
  const statusColor = statusColors[nodeData.status]
  const [hovered, setHovered] = useState(false)
  const isShared = nodeData.actor === 'shared'

  const showTooltip = useCallback(() => setHovered(true), [])
  const hideTooltip = useCallback(() => setHovered(false), [])

  return (
    <div
      className="group relative"
      style={{ zIndex: hovered ? 1000 : 'auto' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div
        className="relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-all duration-200"
        style={{
          background: isShared ? 'transparent' : 'var(--bg-white)',
          border: `1px ${isShared ? 'dashed' : 'solid'} ${hovered ? 'var(--accent-blue)' : isShared ? 'var(--border-dark)' : 'var(--border-default)'}`,
          boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
          minWidth: 160,
          cursor: 'default',
          opacity: isShared ? 0.7 : 1,
        }}
      >
        <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />

        {/* Status dot — top right corner */}
        <div
          className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full"
          style={{
            background: statusColor,
            boxShadow: nodeData.status === 'not-built' ? 'inset 0 0 0 1.5px var(--border-dark)' : 'none',
          }}
        />

        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: isShared ? 'transparent' : 'var(--bg-gray-subtle)' }}
        >
          <Icon size={15} style={{ color: 'var(--text-secondary)' }} strokeWidth={isShared ? 1.4 : 1.8} />
        </div>

        <span
          className="text-[13px] font-medium leading-tight"
          style={{ color: isShared ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {nodeData.label}
        </span>

        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      </div>

      {/* Hover tooltip with arrow */}
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 'calc(100% + 8px)',
            zIndex: 1000,
          }}
        >
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: -6,
              width: 12,
              height: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: 'var(--bg-white)',
                border: '1px solid var(--border-default)',
                transform: 'rotate(45deg) translate(1px, 1px)',
                transformOrigin: 'center',
              }}
            />
          </div>
          {/* Card */}
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              width: 280,
            }}
          >
            {/* Status label in tooltip */}
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: statusColor }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: statusColor }}
              >
                {statusLabels[nodeData.status]}
              </span>
            </div>
            <p
              className="text-[12px] leading-relaxed m-0"
              style={{ color: 'var(--text-secondary)', border: 'none', padding: 0 }}
            >
              {nodeData.description}
            </p>
            {nodeData.refs && nodeData.refs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {nodeData.refs.map(ref => (
                  <span
                    key={ref}
                    className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: 'var(--bg-blue-subtle)',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {ref}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
