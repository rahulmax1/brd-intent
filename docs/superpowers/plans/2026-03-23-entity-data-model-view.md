# Entity Data Model View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/review/data-model` route that renders intent model entities as ERD-style table cards in React Flow, so the team can visually verify the dev team's database schema against the intent model.

**Architecture:** Server component page reads intent model, passes to a client React Flow canvas. A graph builder transforms entities into dagre-laid-out nodes (table cards with field rows) and edges (inferred from field descriptions). Follows the same pattern as the existing IA Map page.

**Tech Stack:** Next.js app router, @xyflow/react, @dagrejs/dagre, lucide-react, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-23-entity-data-model-view-design.md`

---

### Task 1: Graph Builder

**Files:**
- Create: `src/components/data-model/data-model-graph.ts`

This is the pure data transformation — no UI. It takes the intent model and returns React Flow nodes + edges with dagre positions.

- [ ] **Step 1: Create the graph builder**

```ts
// src/components/data-model/data-model-graph.ts
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

const TABLE_WIDTH = 280
const TABLE_HEADER = 40
const TABLE_ROW = 28
const TABLE_FOOTER = 32
const INTEGRATION_WIDTH = 200
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
  if (Math.abs(dy) >= Math.abs(dx) && dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top' }
  }
  if (Math.abs(dy) >= Math.abs(dx) && dy < 0) {
    return { sourceHandle: 'top', targetHandle: 'bottom' }
  }
  if (dx > 0) {
    return { sourceHandle: 'right', targetHandle: 'left' }
  }
  return { sourceHandle: 'left', targetHandle: 'right' }
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

  // Build edges
  const seenEdgeKeys = new Set<string>()
  const edges: Edge[] = []

  for (const entity of model.entities) {
    const entityEdges = entityEdgesMap.get(entity.id) ?? []
    for (const edge of entityEdges) {
      const key = [entity.id, edge.targetEntityId].sort().join('--')
      if (seenEdgeKeys.has(key)) continue
      seenEdgeKeys.add(key)

      const srcNode = g.node(entity.id)
      const tgtNode = g.node(edge.targetEntityId)
      const handles = pickHandles(
        srcNode?.x ?? 0, srcNode?.y ?? 0,
        tgtNode?.x ?? 0, tgtNode?.y ?? 0,
      )

      const label = edge.reason.length > 25 ? edge.reason.slice(0, 25) + '…' : edge.reason

      edges.push({
        id: `dm-edge-${key}`,
        source: entity.id,
        target: edge.targetEntityId,
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
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build 2>&1 | head -20`

This should compile clean — no JSX, pure data transform.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-model/data-model-graph.ts
git commit -m "feat(data-model): add graph builder for ERD visualization"
```

---

### Task 2: Table Node Component

**Files:**
- Create: `src/components/data-model/table-node.tsx`

The main visual component — an ERD-style table card showing entity name, field rows, and lifecycle states.

- [ ] **Step 1: Create the table node**

```tsx
// src/components/data-model/table-node.tsx
'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { TableNodeData } from './data-model-graph'
import { ENTITY_COLOR } from './data-model-graph'

export const TableNode = memo(function TableNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableNodeData
  const [hoveredField, setHoveredField] = useState<number | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFieldTooltip = useCallback((idx: number) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setHoveredField(idx)
  }, [])

  const hideFieldTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHoveredField(null), 200)
  }, [])

  return (
    <div className="relative" style={{ width: 280 }}>
      {/* Handles */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px solid ${selected ? ENTITY_COLOR : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${ENTITY_COLOR}33, 0 4px 16px rgba(0,0,0,0.08)`
            : 'var(--shadow-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: '1px solid var(--border-default)',
            borderLeft: `4px solid ${ENTITY_COLOR}`,
          }}
        >
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {d.name}
          </span>
          {d.states.length > 0 && (
            <span
              className="ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${ENTITY_COLOR}14`, color: ENTITY_COLOR }}
            >
              {d.states.length} states
            </span>
          )}
        </div>

        {/* Field rows */}
        <div>
          {d.fields.map((field, idx) => (
            <div
              key={field.name}
              className="relative flex items-center justify-between px-3 py-1"
              style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-page)',
                minHeight: 28,
              }}
              onMouseEnter={() => showFieldTooltip(idx)}
              onMouseLeave={hideFieldTooltip}
            >
              <span className="flex items-center gap-1.5 font-mono text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {field.warn && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: '#F59E0B' }}
                  />
                )}
                {field.name}
              </span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {field.type}
              </span>

              {/* Field description tooltip */}
              {hoveredField === idx && field.description && (
                <div
                  className="absolute left-full top-0 z-50 ml-2 pointer-events-none"
                  style={{ width: 220 }}
                >
                  <div
                    className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                    style={{
                      background: 'var(--bg-white)',
                      border: '1px solid var(--border-default)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {field.description}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Lifecycle footer */}
        {d.states.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1 px-3 py-1.5"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            {d.states.map(state => (
              <span
                key={state}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'var(--bg-page)',
                  color: 'var(--text-muted)',
                }}
              >
                {state}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add src/components/data-model/table-node.tsx
git commit -m "feat(data-model): add ERD table node component"
```

---

### Task 3: Integration Node Component

**Files:**
- Create: `src/components/data-model/integration-node.tsx`

Simpler node for integration entities (Maximus, AGS, Payment, Email).

- [ ] **Step 1: Create the integration node**

```tsx
// src/components/data-model/integration-node.tsx
'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plug } from 'lucide-react'
import type { TableNodeData } from './data-model-graph'
import { INTEGRATION_COLOR } from './data-model-graph'

export const IntegrationNode = memo(function IntegrationNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableNodeData

  // Infer direction from description
  const isInbound = /inbound/i.test(d.description)
  const direction = isInbound ? 'Inbound' : 'Outbound'

  return (
    <div className="relative" style={{ width: 200 }}>
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

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
        <div className="flex flex-col min-w-0">
          <span
            className="text-[12px] font-semibold truncate"
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/data-model/integration-node.tsx
git commit -m "feat(data-model): add integration node component"
```

---

### Task 4: Canvas Component

**Files:**
- Create: `src/components/data-model/data-model-canvas.tsx`

The React Flow wrapper that registers node types and renders the graph.

- [ ] **Step 1: Create the canvas**

```tsx
// src/components/data-model/data-model-canvas.tsx
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
        nodesDraggable={false}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/data-model/data-model-canvas.tsx
git commit -m "feat(data-model): add React Flow canvas with toolbar"
```

---

### Task 5: Page Route + Navigation

**Files:**
- Create: `src/app/review/data-model/page.tsx`
- Modify: `src/components/review/nav-links.tsx`
- Modify: `src/components/review/layout-shell.tsx`

Wire everything together — page route, sidebar nav item, full-width layout.

- [ ] **Step 1: Create the page route**

```tsx
// src/app/review/data-model/page.tsx
import { getCurrentModel } from '@/lib/model-store'
import { DataModelCanvas } from '@/components/data-model/data-model-canvas'
import { buildDataModelGraph } from '@/components/data-model/data-model-graph'

export default async function DataModelPage() {
  const model = await getCurrentModel()
  const { nodes, edges, stats } = buildDataModelGraph(model)

  return (
    <div className="h-full w-full overflow-hidden">
      <DataModelCanvas
        initialNodes={nodes}
        initialEdges={edges}
        stats={stats}
      />
    </div>
  )
}
```

- [ ] **Step 2: Add nav item to sidebar**

In `src/components/review/nav-links.tsx`:

1. Add import: `TableProperties` to the lucide-react import
2. Add nav item after IA Map, before Diff:
```ts
{ label: 'Data Model', href: '/review/data-model', icon: TableProperties },
```
3. Update Consensus `isActive` — add `&& !pathname.startsWith('/review/data-model')` to the exclusion chain

- [ ] **Step 3: Add to full-width routes**

In `src/components/review/layout-shell.tsx`, add `'/review/data-model'` to the `FULL_WIDTH_ROUTES` array.

- [ ] **Step 4: Verify in browser**

Run: open `http://localhost:4444/review/data-model`

Expected: ERD-style diagram with 7 domain entity table cards and 4 integration nodes, connected by relationship edges. Nav sidebar shows "Data Model" as active. No chat panel visible.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/review/data-model/page.tsx src/components/review/nav-links.tsx src/components/review/layout-shell.tsx
git commit -m "feat(data-model): add ERD view route and navigation"
```
