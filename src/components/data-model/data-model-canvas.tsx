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
import { Maximize2, Database, Plug } from 'lucide-react'
import { TableNode } from './table-node'
import { IntegrationNode } from './integration-node'
import { ENTITY_COLOR, INTEGRATION_COLOR } from './data-model-graph'

const nodeTypes = {
  tableNode: TableNode,
  integrationNode: IntegrationNode,
}

type DataModelCanvasProps = {
  initialNodes: Node[]
  initialEdges: Edge[]
  stats: { domainCount: number; integrationCount: number }
}

function DataModelCanvasInner({ initialNodes, initialEdges, stats }: DataModelCanvasProps) {
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
          <Database size={14} style={{ color: ENTITY_COLOR }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {stats.domainCount} entities
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <div className="flex items-center gap-1.5">
          <Plug size={14} style={{ color: INTEGRATION_COLOR }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {stats.integrationCount} integrations
          </span>
        </div>
        <div
          className="h-3"
          style={{ width: 1, background: 'var(--border-default)' }}
        />
        <button
          onClick={handleFitView}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-70"
          style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Maximize2 size={13} />
          Fit
        </button>
      </div>

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
          nodeColor={(node) => {
            if (node.type === 'integrationNode') return INTEGRATION_COLOR
            return ENTITY_COLOR
          }}
          maskColor="rgba(248, 248, 247, 0.7)"
          style={{ border: '1px solid var(--border-default)', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  )
}

export function DataModelCanvas(props: DataModelCanvasProps) {
  return (
    <ReactFlowProvider>
      <DataModelCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
