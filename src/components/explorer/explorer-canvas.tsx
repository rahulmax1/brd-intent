'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { IntentModel } from '@/domain/intent-model/types'
import type { ExplorerNodeData, EntityRelationships } from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'
import { buildExplorerGraph } from './explorer-graph'
import { ExplorerNode } from './explorer-node'
import { DetailPanel } from './detail-panel'
import type { ExplorerPositions } from '@/lib/explorer-positions-store'

const nodeTypes = {
  explorer: ExplorerNode,
}

type DetailItem =
  | { type: 'entity'; entity: import('@/domain/intent-model/types').Entity; relationships?: EntityRelationships }

export function ExplorerCanvas({ model, savedPositions }: { model: IntentModel; savedPositions: ExplorerPositions }) {
  const graphData = useMemo(() => buildExplorerGraph(model, savedPositions), [model, savedPositions])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graphData.entityNodes as Node[])
  const [edges, , onEdgesChange] = useEdgesState(graphData.entityEdges)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null)

  const selectEntity = useCallback((entityId: string) => {
    const entity = model.entities.find(e => e.id === entityId)
    if (!entity) return

    const relationships = graphData.relationshipMap.get(entityId)
    if (!relationships) return

    setSelectedEntityId(entityId)
    setDetailItem({ type: 'entity', entity, relationships })
  }, [model, graphData])

  const clearSelection = useCallback(() => {
    setSelectedEntityId(null)
    setDetailItem(null)
  }, [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'explorer') return
    const entityId = (node.data as unknown as ExplorerNodeData).entityId
    if (entityId === selectedEntityId) {
      clearSelection()
    } else {
      selectEntity(entityId)
    }
  }, [selectedEntityId, selectEntity, clearSelection])

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Persist position on drag stop
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'explorer') return
    fetch('/api/explorer/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: node.id, x: node.position.x, y: node.position.y }),
    })
  }, [])

  // Elevate hovered node so tooltip renders above siblings
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 9999 } : n))
  }, [setNodes])

  const onNodeMouseLeave = useCallback((_: React.MouseEvent, node: Node) => {
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, zIndex: 0 } : n))
  }, [setNodes])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const entityIds = model.entities.map(ent => ent.id)
        if (entityIds.length === 0) return
        const currentIdx = selectedEntityId ? entityIds.indexOf(selectedEntityId) : -1
        const nextIdx = e.key === 'ArrowRight'
          ? (currentIdx + 1) % entityIds.length
          : (currentIdx - 1 + entityIds.length) % entityIds.length
        selectEntity(entityIds[nextIdx])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearSelection, selectEntity, selectedEntityId, model.entities])

  // Stats
  const totalItems = model.actors.length + model.entities.length + model.journeys.length
    + model.businessRules.length + (model.constraints?.length ?? 0) + (model.openQuestions?.length ?? 0)
  const selectedRelationships = selectedEntityId ? graphData.relationshipMap.get(selectedEntityId) : null

  return (
    <div className="relative h-full w-full" style={{ background: 'var(--bg-page)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,0.06)" />
        <MiniMap
          nodeColor={() => ENTITY_COLOR}
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
          Nodes
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: ENTITY_COLOR }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Entity</span>
        </div>
        <div className="mx-1 h-3 w-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Edges
        </span>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="6" className="shrink-0">
            <line x1="2" y1="3" x2="18" y2="3" stroke="#858481" strokeWidth="1.5" />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Relationship</span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="absolute top-4 right-4 flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-float)',
          ...(detailItem ? { right: 436 } : {}),
        }}
      >
        <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-blue)' }}>
          v{model.meta?.version ?? 1}
        </span>
        <span className="text-[11px] font-medium capitalize" style={{ color: 'var(--text-muted)' }}>
          {model.meta?.status ?? 'draft'}
        </span>
        <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {model.entities.length} entities · {model.businessRules.length} rules · {totalItems} total
        </span>
        {selectedRelationships && selectedEntityId && (
          <>
            <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
            <span className="text-[11px] font-semibold" style={{ color: ENTITY_COLOR }}>
              {model.entities.find(ent => ent.id === selectedEntityId)?.name} —{' '}
              {selectedRelationships.rules.length} rules, {selectedRelationships.journeys.length} journeys, {selectedRelationships.actors.length} actors
            </span>
          </>
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  )
}
