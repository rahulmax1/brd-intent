import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { IntentModel, Entity, Field } from '@/domain/intent-model/types'
import { findEntityEdges } from '@/components/explorer/explorer-graph'

// --- Types ---

export type TableNodeData = {
  entityId: string
  name: string
  fields: Field[]
  states: string[]
  isIntegration: boolean
  description: string
}

export const ENTITY_COLOR = '#0081F2'
export const INTEGRATION_COLOR = '#6B7280'

// --- Dimensions ---

const TABLE_WIDTH = 360
const TABLE_HEADER = 40
const TABLE_ROW = 28
const TABLE_FOOTER = 32
const INTEGRATION_WIDTH = 280
const INTEGRATION_HEIGHT = 56

function tableHeight(entity: Entity): number {
  const footer = entity.lifecycle.states.length > 0 ? TABLE_FOOTER : 0
  return TABLE_HEADER + entity.key_fields.length * TABLE_ROW + footer
}

// --- Handle selection (adapted from explorer-graph.ts for TB layout) ---

function pickHandles(
  srcX: number, srcY: number,
  tgtX: number, tgtY: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtX - srcX
  const dy = tgtY - srcY

  // TB layout: vertical is dominant
  // Handle IDs: default type handles use bare name (e.g. 'top' = target, 'bottom' = source)
  // Opposite-type handles use suffix (e.g. 'top-src' = source at top, 'bottom-tgt' = target at bottom)
  if (Math.abs(dy) >= Math.abs(dx) && dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top' }
  }
  if (Math.abs(dy) >= Math.abs(dx) && dy < 0) {
    return { sourceHandle: 'top-src', targetHandle: 'bottom-tgt' }
  }
  if (dx > 0) {
    return { sourceHandle: 'right', targetHandle: 'left' }
  }
  return { sourceHandle: 'left-src', targetHandle: 'right-tgt' }
}

// --- Edge style ---

const EDGE_STYLE = {
  stroke: '#9CA3AF',
  strokeWidth: 1.5,
}

const EDGE_ARROW = {
  type: 'arrowclosed' as const,
  width: 10,
  height: 10,
  color: '#9CA3AF',
}

// --- Main builder ---

export type DataModelGraphData = {
  nodes: Node[]
  edges: Edge[]
  stats: { domainCount: number; integrationCount: number }
}

export function buildDataModelGraph(model: IntentModel): DataModelGraphData {
  const domainEntities = model.entities.filter(e => !e.is_integration)
  const integrationEntities = model.entities.filter(e => e.is_integration)

  // Infer edges using existing explorer logic
  const entityEdgesMap = findEntityEdges(model.entities)

  // Dagre layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 100,
    marginx: 60,
    marginy: 60,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entity of domainEntities) {
    g.setNode(entity.id, { width: TABLE_WIDTH, height: tableHeight(entity) })
  }
  for (const entity of integrationEntities) {
    g.setNode(entity.id, { width: INTEGRATION_WIDTH, height: INTEGRATION_HEIGHT })
  }

  const addedEdges = new Set<string>()
  for (const entity of model.entities) {
    const edges = entityEdgesMap.get(entity.id) ?? []
    for (const edge of edges) {
      const key = [entity.id, edge.targetEntityId].sort().join('--')
      if (!addedEdges.has(key)) {
        g.setEdge(entity.id, edge.targetEntityId)
        addedEdges.add(key)
      }
    }
  }

  dagre.layout(g)

  // Build nodes
  const nodes: Node[] = []

  for (const entity of [...domainEntities, ...integrationEntities]) {
    const dagreNode = g.node(entity.id)
    const isIntegration = entity.is_integration === true
    const w = isIntegration ? INTEGRATION_WIDTH : TABLE_WIDTH
    const h = isIntegration ? INTEGRATION_HEIGHT : tableHeight(entity)

    nodes.push({
      id: entity.id,
      type: isIntegration ? 'integrationNode' : 'tableNode',
      position: {
        x: (dagreNode?.x ?? 0) - w / 2,
        y: (dagreNode?.y ?? 0) - h / 2,
      },
      data: {
        entityId: entity.id,
        name: entity.name,
        fields: entity.key_fields,
        states: entity.lifecycle.states,
        isIntegration,
        description: entity.description,
      } satisfies TableNodeData,
    })
  }

  // Build integration direction lookup
  const integrationDirection = new Map<string, 'inbound' | 'outbound'>()
  for (const entity of integrationEntities) {
    const text = `${entity.name} ${entity.description} ${entity.key_fields.map(f => f.description).join(' ')}`
    integrationDirection.set(entity.id, /inbound/i.test(text) ? 'inbound' : 'outbound')
  }

  // Build edges
  const seenEdgeKeys = new Set<string>()
  const edges: Edge[] = []

  for (const entity of model.entities) {
    const entityEdges = entityEdgesMap.get(entity.id) ?? []
    for (const edge of entityEdges) {
      const key = [entity.id, edge.targetEntityId].sort().join('--')
      if (seenEdgeKeys.has(key)) continue
      seenEdgeKeys.add(key)

      // Determine correct source/target for data flow direction
      // Inbound integrations → domain entity (integration is source)
      // Domain entity → outbound integrations (integration is target)
      let source = entity.id
      let target = edge.targetEntityId

      const srcDir = integrationDirection.get(entity.id)
      const tgtDir = integrationDirection.get(edge.targetEntityId)
      if (tgtDir === 'inbound') {
        // Target is inbound integration, flip so integration is source
        source = edge.targetEntityId
        target = entity.id
      } else if (srcDir === 'outbound') {
        // Source is outbound integration, flip so domain entity is source
        source = edge.targetEntityId
        target = entity.id
      }

      const srcNode = g.node(source)
      const tgtNode = g.node(target)
      const handles = pickHandles(
        srcNode?.x ?? 0, srcNode?.y ?? 0,
        tgtNode?.x ?? 0, tgtNode?.y ?? 0,
      )

      const label = edge.reason.length > 25 ? edge.reason.slice(0, 25) + '…' : edge.reason

      edges.push({
        id: `dm-edge-${key}`,
        source,
        target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        style: EDGE_STYLE,
        markerEnd: EDGE_ARROW,
        label,
        labelStyle: {
          fontSize: 10,
          fontWeight: 500,
          fill: '#9CA3AF',
          fontFamily: 'var(--font-sans)',
        },
        labelBgStyle: {
          fill: 'var(--bg-page)',
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      })
    }
  }

  return {
    nodes,
    edges,
    stats: {
      domainCount: domainEntities.length,
      integrationCount: integrationEntities.length,
    },
  }
}
