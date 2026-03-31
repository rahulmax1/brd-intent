'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plug } from 'lucide-react'
import type { TableNodeData } from './data-model-graph'
import { INTEGRATION_COLOR } from './data-model-graph'

export const IntegrationNode = memo(function IntegrationNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableNodeData

  // Infer direction from name or field descriptions
  const searchText = `${d.name} ${d.description} ${d.fields.map(f => f.description).join(' ')}`
  const isInbound = /inbound/i.test(searchText)
  const isOneTime = /one-time/i.test(searchText)
  const direction = isOneTime ? 'One-time' : isInbound ? 'Inbound' : 'Outbound'

  return (
    <div className="relative" style={{ width: 'max-content' }}>
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Top} id="top-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Left} id="left-src" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} id="bottom-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Right} id="right-tgt" className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-3"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px dashed ${selected ? INTEGRATION_COLOR : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${INTEGRATION_COLOR}33, 0 4px 16px rgba(0,0,0,0.08)`
            : 'var(--shadow-subtle)',
          minHeight: 56,
        }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${INTEGRATION_COLOR}14` }}
        >
          <Plug size={14} style={{ color: INTEGRATION_COLOR }} strokeWidth={1.8} />
        </div>
        <div className="flex flex-col">
          <span
            className="text-[12px] font-semibold whitespace-nowrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {d.name}
          </span>
          <span
            className="text-[10px] italic"
            style={{ color: 'var(--text-muted)' }}
          >
            {direction}
          </span>
        </div>
      </div>
    </div>
  )
})
