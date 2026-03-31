'use client'

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { IANodeData, DriftWarning } from './ia-types'
import { IANode } from './ia-node'
import { LaneNode } from './lane-node'

const nodeTypes = {
  ia: IANode,
  lane: LaneNode,
}

const statusMiniMapColors: Record<string, string> = {
  done: '#25BA3B',
  partial: '#F59E0B',
  'not-built': '#D1D5DB',
}

type IACanvasProps = {
  initialNodes: Node[]
  initialEdges: Edge[]
  drift: DriftWarning[]
  stats: { total: number; done: number; partial: number; notBuilt: number }
}

export function IACanvas({ initialNodes, initialEdges, drift, stats }: IACanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges)
  const [showDrift, setShowDrift] = useState(false)

  const nodeColor = useCallback((node: { data: Record<string, unknown> }) => {
    const d = node.data as unknown as IANodeData
    return statusMiniMapColors[d.status] ?? 'transparent'
  }, [])

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'ia') return
    fetch('/api/ia/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: node.id, x: node.position.x, y: node.position.y }),
    })
  }, [])

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'ia') return
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 1000 } : n))
  }, [setNodes])

  const onNodeMouseLeave = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'ia') return
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 0 } : n))
  }, [setNodes])

  return (
    <div className="relative h-full w-full" style={{ background: 'var(--bg-page)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,0.06)" />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(248,248,247,0.85)"
          style={{
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            borderRadius: 12,
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 flex items-center gap-4 rounded-xl px-4 py-2.5"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Status
        </span>
        {([
          ['Done', '#25BA3B'],
          ['Partial', '#F59E0B'],
          ['Not built', '#D1D5DB'],
        ] as const).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
          </div>
        ))}
        <div className="mx-1 h-3 w-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Edges
        </span>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="6" className="shrink-0">
            <circle cx="2" cy="3" r="2" fill="#858481" />
            <line x1="4" y1="3" x2="16" y2="3" stroke="#858481" strokeWidth="1.5" />
            <circle cx="18" cy="3" r="2" fill="#858481" />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            In-lane
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="6" className="shrink-0">
            <circle cx="2" cy="3" r="2" fill="#858481" opacity="0.4" />
            <line x1="4" y1="3" x2="16" y2="3" stroke="#858481" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
            <circle cx="18" cy="3" r="2" fill="#858481" opacity="0.4" />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Cross-actor
          </span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="absolute top-4 right-4 flex items-center gap-3 rounded-xl px-4 py-2.5"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {stats.total} screens
        </span>
        <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[12px] font-semibold" style={{ color: '#25BA3B' }}>
          {stats.done} done
        </span>
        <span className="text-[12px] font-semibold" style={{ color: '#F59E0B' }}>
          {stats.partial} partial
        </span>
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {stats.notBuilt} remaining
        </span>
        {drift.length > 0 && (
          <>
            <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowDrift(!showDrift)}>
              <div className="h-2 w-2 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>
                {drift.length} drift
              </span>
            </div>
          </>
        )}
      </div>

      {/* Drift dropdown panel */}
      {showDrift && drift.length > 0 && (
        <div
          className="absolute top-14 right-4 rounded-xl px-4 py-3 max-h-60 overflow-y-auto custom-scroll"
          style={{
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-overlay)',
            width: 320,
            zIndex: 10,
          }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Model Drift
          </div>
          {drift.map((d, i) => (
            <div key={i} className="text-[12px] py-1.5 border-b last:border-b-0" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}>
              {d.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
