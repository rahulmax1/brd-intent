// src/components/data-model/database-schema-canvas.tsx

'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize2, Table, List } from 'lucide-react'
import { DatabaseTableNode } from './database-table-node'
import { DatabaseEnumPanel } from './database-enum-panel'
import { SCHEMA_TABLE_COLOR } from './database-schema-graph'
import type { DbmlEnum } from './parse-dbml'

const nodeTypes = {
  databaseTableNode: DatabaseTableNode,
}

type DatabaseSchemaCanvasProps = {
  initialNodes: Node[]
  initialEdges: Edge[]
  enums: DbmlEnum[]
  stats: { tableCount: number; enumCount: number }
}

function DatabaseSchemaCanvasInner({ initialNodes, initialEdges, enums, stats }: DatabaseSchemaCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const { fitView } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.08, maxZoom: 1, duration: 300 })
  }, [fitView])

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg px-3 py-2"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <Table size={14} style={{ color: SCHEMA_TABLE_COLOR }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {stats.tableCount} tables
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <div className="flex items-center gap-1.5">
          <List size={14} style={{ color: '#8B5CF6' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {stats.enumCount} enums
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <button
          onClick={handleFitView}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-70"
          style={{ color: '#0081F2', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Maximize2 size={13} />
          Fit
        </button>
      </div>

      {/* Constraint legend */}
      <div
        className="absolute left-4 top-20 z-10 rounded-lg px-3 py-2"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Constraints
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#EF4444' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>NOT NULL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#8B5CF6' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>UNIQUE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#10B981' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>HAS DEFAULT</span>
          </div>
        </div>
      </div>

      {/* Enum panel */}
      <DatabaseEnumPanel enums={enums} />

      {/* ReactFlow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-default)" />
        <MiniMap
          nodeColor={() => SCHEMA_TABLE_COLOR}
          maskColor="rgba(248, 248, 247, 0.7)"
          style={{ border: '1px solid var(--border-default)', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  )
}

export function DatabaseSchemaCanvas(props: DatabaseSchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <DatabaseSchemaCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
