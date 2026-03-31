// src/components/data-model/database-schema-graph.ts

import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { DbmlSchema, DbmlTable, DbmlField } from './parse-dbml'

export const SCHEMA_TABLE_COLOR = '#0081F2' // blue
export const SCHEMA_JUNCTION_COLOR = '#F59E0B' // amber
export const SCHEMA_EDGE_COLOR = '#0081F2'

const TABLE_WIDTH = 380
const TABLE_HEADER = 40
const TABLE_ROW = 32
const TABLE_FOOTER = 32

export type DatabaseTableNodeData = {
  name: string
  fields: DbmlField[]
  indexes: string[]
  isJunction: boolean
}

export type DatabaseSchemaGraphData = {
  nodes: Node[]
  edges: Edge[]
  stats: {
    tableCount: number
    enumCount: number
  }
}

function isJunctionTable(table: DbmlTable): boolean {
  // Junction table heuristics:
  // 1. Name contains _link, _hbls, or similar patterns
  if (/_link|_hbls|_chain/.test(table.name)) return true

  // 2. Has exactly 2 foreign keys and few other fields
  const fkCount = table.fields.filter(f => f.isForeignKey).length
  const nonFkCount = table.fields.filter(f => !f.isForeignKey && !f.isPrimaryKey).length
  if (fkCount >= 2 && nonFkCount <= 1) return true

  return false
}

function computeTableHeight(table: DbmlTable): number {
  const fieldCount = table.fields.length
  const hasIndexes = table.indexes.length > 0
  return TABLE_HEADER + (fieldCount * TABLE_ROW) + (hasIndexes ? TABLE_FOOTER : 0)
}

function pickHandles(
  srcX: number, srcY: number,
  tgtX: number, tgtY: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtX - srcX
  const dy = tgtY - srcY

  // Prefer vertical routing for FK relationships (TB layout)
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

export function buildDatabaseSchemaGraph(schema: DbmlSchema): DatabaseSchemaGraphData {
  const { tables, relationships } = schema

  // Configure Dagre layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    nodesep: 70,
    ranksep: 120,
    marginx: 60,
    marginy: 60,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes
  tables.forEach(table => {
    g.setNode(table.name, {
      width: TABLE_WIDTH,
      height: computeTableHeight(table),
    })
  })

  // Add edges
  const addedEdges = new Set<string>()
  relationships.forEach(rel => {
    const key = [rel.fromTable, rel.toTable].sort().join('--')
    if (!addedEdges.has(key)) {
      g.setEdge(rel.fromTable, rel.toTable)
      addedEdges.add(key)
    }
  })

  // Run layout
  dagre.layout(g)

  // Build ReactFlow nodes
  const nodes: Node[] = tables.map(table => {
    const dagreNode = g.node(table.name)
    const isJunction = isJunctionTable(table)
    const height = computeTableHeight(table)

    return {
      id: table.name,
      type: 'databaseTableNode',
      position: {
        x: (dagreNode?.x ?? 0) - TABLE_WIDTH / 2,
        y: (dagreNode?.y ?? 0) - height / 2,
      },
      data: {
        name: table.name,
        fields: table.fields,
        indexes: table.indexes.map(idx => idx.fields.join(', ')),
        isJunction,
      } satisfies DatabaseTableNodeData,
    }
  })

  // Build edges
  const seenEdgeKeys = new Set<string>()
  const edges: Edge[] = []

  relationships.forEach(rel => {
    const key = [rel.fromTable, rel.toTable].sort().join('--')
    if (seenEdgeKeys.has(key)) return
    seenEdgeKeys.add(key)

    const srcNode = g.node(rel.fromTable)
    const tgtNode = g.node(rel.toTable)
    const handles = pickHandles(
      srcNode?.x ?? 0, srcNode?.y ?? 0,
      tgtNode?.x ?? 0, tgtNode?.y ?? 0,
    )

    edges.push({
      id: `schema-edge-${key}`,
      source: rel.fromTable,
      target: rel.toTable,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      style: {
        stroke: SCHEMA_EDGE_COLOR,
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 12,
        height: 12,
        color: SCHEMA_EDGE_COLOR,
      },
      label: rel.cardinality,
      labelStyle: {
        fontSize: 20,
        fontWeight: 700,
        fill: '#9CA3AF',
        fontFamily: 'var(--font-sans)',
      },
      labelBgStyle: {
        fill: 'var(--bg-page)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [6, 10] as [number, number],
      labelBgBorderRadius: 6,
    })
  })

  return {
    nodes,
    edges,
    stats: {
      tableCount: tables.length,
      enumCount: schema.enums.length,
    },
  }
}
