'use client'

import type { NodeProps } from '@xyflow/react'
import type { LaneNodeData } from './ia-types'

export function LaneNode({ data }: NodeProps) {
  const laneData = data as unknown as LaneNodeData

  return (
    <div
      className="relative pointer-events-none"
      style={{
        width: laneData.width,
        height: laneData.height,
      }}
    >
      {/* Lane background */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: laneData.color,
          opacity: 0.03,
        }}
      />
      {/* Lane border */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: `1px solid ${laneData.color}`,
          opacity: 0.1,
        }}
      />
      {/* Lane label */}
      <div
        className="absolute -top-3 left-4 flex items-center gap-2 rounded-md px-2.5 py-0.5"
        style={{ background: 'var(--bg-page)' }}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: laneData.color }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: laneData.color }}
        >
          {laneData.label}
        </span>
      </div>
    </div>
  )
}
