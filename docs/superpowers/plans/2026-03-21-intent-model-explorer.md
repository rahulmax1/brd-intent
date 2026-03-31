# Intent Model Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive graph-based explorer at `/` that visualizes entity relationships with satellite expansion and a detail panel.

**Architecture:** React Flow canvas with dagre layout for entity nodes. Cross-reference engine scans the model to derive entity-entity edges and entity-to-satellite relationships. Click an entity to show related rules/journeys/actors/constraints/questions as radial satellite nodes. Detail panel slides in from the right.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, @xyflow/react, @dagrejs/dagre, Tailwind CSS v4, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-21-intent-model-explorer-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/explorer/explorer-types.ts` | Type definitions for explorer nodes, edges, relationships |
| `src/components/explorer/explorer-graph.ts` | Pure function: model → nodes, edges, relationship map |
| `src/components/explorer/explorer-node.tsx` | Custom React Flow node for entities |
| `src/components/explorer/satellite-node.tsx` | Custom React Flow node for satellite items |
| `src/components/explorer/detail-panel.tsx` | Right-side slide-out panel with item renderers |
| `src/components/explorer/explorer-canvas.tsx` | Main canvas: React Flow + state management + keyboard shortcuts |
| `src/app/page.tsx` | Server component: loads model, renders NavSidebar + ExplorerCanvas |
| `src/components/review/nav-links.tsx` | Modified: add Explorer nav item + fix active state |

---

### Task 1: Types

**Files:**
- Create: `src/components/explorer/explorer-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
import type { Node, Edge } from '@xyflow/react'
import type {
  Actor, Entity, Journey, BusinessRule, Constraint, OpenQuestion,
} from '@/domain/intent-model/types'

// --- Node data types ---

export type ExplorerNodeData = {
  entityId: string
  name: string
  fieldCount: number
  stateCount: number
  description: string
}

export type SatelliteNodeData = {
  itemType: 'business_rule' | 'journey' | 'actor' | 'constraint' | 'open_question'
  itemId: string
  label: string
  item: BusinessRule | Journey | Actor | Constraint | OpenQuestion
}

// --- Relationship types ---

export type EntityRelationships = {
  entityEdges: { targetEntityId: string; reason: string }[]
  rules: BusinessRule[]
  journeys: Journey[]
  actors: Actor[]
  constraints: Constraint[]
  openQuestions: OpenQuestion[]
}

// --- Graph output ---

export type ExplorerGraphData = {
  entityNodes: Node<ExplorerNodeData>[]
  entityEdges: Edge[]
  relationshipMap: Map<string, EntityRelationships>
}

// --- Color constants ---

export const SATELLITE_COLORS: Record<SatelliteNodeData['itemType'], string> = {
  business_rule: '#F59E0B',
  journey: '#10B981',
  actor: '#8B5CF6',
  constraint: '#EF4444',
  open_question: '#EC4899',
}

export const SATELLITE_LABELS: Record<SatelliteNodeData['itemType'], string> = {
  business_rule: 'Rule',
  journey: 'Journey',
  actor: 'Actor',
  constraint: 'Constraint',
  open_question: 'Question',
}

export const ENTITY_COLOR = '#0081F2'
```

- [ ] **Step 2: Verify types compile**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `explorer-types.ts`

- [ ] **Step 3: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/explorer-types.ts
git commit -m "feat(explorer): add type definitions for model explorer"
```

---

### Task 2: Cross-Reference Engine

**Files:**
- Create: `src/components/explorer/explorer-graph.ts`
- Read: `src/domain/intent-model/types.ts` (IntentModel type)
- Read: `src/components/ia/ia-graph.ts` (reference for dagre usage)

- [ ] **Step 1: Create the graph builder**

This is the core logic. It takes the `IntentModel` and returns entity nodes (dagre-positioned), entity-entity edges, and a relationship map for satellite expansion.

```typescript
import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { IntentModel, Entity } from '@/domain/intent-model/types'
import type {
  ExplorerGraphData, ExplorerNodeData, EntityRelationships, SatelliteNodeData,
  SATELLITE_COLORS,
} from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'

const NODE_WIDTH = 200
const NODE_HEIGHT = 70

// --- Entity-to-entity edge detection ---

function findEntityEdges(entities: Entity[]): EntityRelationships['entityEdges'][] {
  // For each entity, find references to other entities in key_fields and transitions
  const entityNames = entities.map(e => ({
    id: e.id,
    // Use short name for matching (e.g. "HBL" not "House Bill of Lading (HBL)")
    names: [e.id, e.name.toLowerCase(), ...(e.name.match(/\(([^)]+)\)/)?.[1] ? [e.name.match(/\(([^)]+)\)/)![1].toLowerCase()] : [])],
  }))

  return entities.map(entity => {
    const edges: EntityRelationships['entityEdges'] = []
    const seen = new Set<string>()

    for (const other of entityNames) {
      if (other.id === entity.id) continue

      // Check key_fields type and description
      for (const field of entity.key_fields) {
        const text = `${field.type} ${field.description}`.toLowerCase()
        if (other.names.some(n => text.includes(n)) && !seen.has(other.id)) {
          edges.push({ targetEntityId: other.id, reason: `field: ${field.name}` })
          seen.add(other.id)
        }
      }

      // Check lifecycle transitions
      for (const t of entity.lifecycle.transitions) {
        const text = `${t.trigger} ${t.guard ?? ''}`.toLowerCase()
        if (other.names.some(n => text.includes(n)) && !seen.has(other.id)) {
          edges.push({ targetEntityId: other.id, reason: `transition: ${t.trigger}` })
          seen.add(other.id)
        }
      }
    }

    return edges
  })
}

// --- Satellite relationship detection ---

function findRelationships(entity: Entity, model: IntentModel): Omit<EntityRelationships, 'entityEdges'> {
  const names = [
    entity.id,
    entity.name.toLowerCase(),
    ...(entity.name.match(/\(([^)]+)\)/)?.[1] ? [entity.name.match(/\(([^)]+)\)/)![1].toLowerCase()] : []),
  ]
  const fieldNames = entity.key_fields.map(f => f.name)

  const matches = (text: string) => {
    const lower = text.toLowerCase()
    return names.some(n => {
      // Word-boundary-aware matching to avoid false positives
      const regex = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(lower)
    })
  }

  const rules = model.business_rules.filter(r =>
    r.applies_to.some(ref => {
      const lower = ref.toLowerCase()
      return names.some(n => lower.includes(n)) || fieldNames.some(f => lower.includes(f))
    }) || matches(r.description)
  )

  const journeys = model.journeys.filter(j =>
    matches(j.name) ||
    j.preconditions.some(p => matches(p)) ||
    j.steps.some(s => matches(s.title) || matches(s.detail))
  )

  const actors = model.actors.filter(a =>
    a.responsibilities.some(r => matches(r.description))
  )

  const constraints = model.constraints.filter(c => matches(c.constraint))

  const openQuestions = model.open_questions.filter(q =>
    matches(q.question) || matches(q.reason)
  )

  return { rules, journeys, actors, constraints, openQuestions }
}

// --- Dagre layout ---

function layoutEntities(entities: Entity[], entityEdgesPerEntity: EntityRelationships['entityEdges'][]): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120, marginx: 60, marginy: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entity of entities) {
    g.setNode(entity.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (let i = 0; i < entities.length; i++) {
    for (const edge of entityEdgesPerEntity[i]) {
      g.setEdge(entities[i].id, edge.targetEntityId)
    }
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const entity of entities) {
    const node = g.node(entity.id)
    if (node) {
      positions.set(entity.id, { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 })
    }
  }

  return positions
}

// --- Main export ---

export function buildExplorerGraph(model: IntentModel): ExplorerGraphData {
  const entityEdgesPerEntity = findEntityEdges(model.entities)
  const positions = layoutEntities(model.entities, entityEdgesPerEntity)

  const entityNodes: Node<ExplorerNodeData>[] = model.entities.map(entity => ({
    id: entity.id,
    type: 'explorer',
    position: positions.get(entity.id) ?? { x: 0, y: 0 },
    data: {
      entityId: entity.id,
      name: entity.name,
      fieldCount: entity.key_fields.length,
      stateCount: entity.lifecycle.states.length,
      description: entity.description,
    },
  }))

  // Deduplicate edges (if A→B and B→A both found, keep one)
  const edgeSet = new Set<string>()
  const entityEdges: Edge[] = []

  for (let i = 0; i < model.entities.length; i++) {
    for (const edge of entityEdgesPerEntity[i]) {
      const key = [model.entities[i].id, edge.targetEntityId].sort().join('--')
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        entityEdges.push({
          id: `e-${model.entities[i].id}-${edge.targetEntityId}`,
          source: model.entities[i].id,
          target: edge.targetEntityId,
          style: { stroke: '#858481', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as const, width: 12, height: 12, color: '#858481' },
          label: edge.reason,
          labelStyle: { fontSize: 10, fontWeight: 500, fill: '#858481' },
          labelBgStyle: { fill: 'var(--bg-page)', fillOpacity: 0.9 },
          labelBgPadding: [4, 6] as [number, number],
          labelBgBorderRadius: 4,
        })
      }
    }
  }

  // Build relationship map
  const relationshipMap = new Map<string, EntityRelationships>()
  for (let i = 0; i < model.entities.length; i++) {
    const entity = model.entities[i]
    const satellites = findRelationships(entity, model)
    relationshipMap.set(entity.id, {
      entityEdges: entityEdgesPerEntity[i],
      ...satellites,
    })
  }

  return { entityNodes, entityEdges, relationshipMap }
}

// --- Satellite node generation ---

export function buildSatelliteNodes(
  entityId: string,
  entityPosition: { x: number; y: number },
  relationships: EntityRelationships,
): { nodes: Node<SatelliteNodeData>[]; edges: Edge[] } {
  const nodes: Node<SatelliteNodeData>[] = []
  const edges: Edge[] = []

  // Collect all satellite items grouped by type
  const groups: { type: SatelliteNodeData['itemType']; items: { id: string; label: string; item: SatelliteNodeData['item'] }[] }[] = [
    { type: 'business_rule', items: relationships.rules.map(r => ({ id: r.id, label: r.id, item: r })) },
    { type: 'journey', items: relationships.journeys.map(j => ({ id: j.id, label: j.name, item: j })) },
    { type: 'actor', items: relationships.actors.map(a => ({ id: a.id, label: a.name, item: a })) },
    { type: 'constraint', items: relationships.constraints.map(c => ({ id: c.id, label: c.id, item: c })) },
    { type: 'open_question', items: relationships.openQuestions.map(q => ({ id: q.id, label: q.id, item: q })) },
  ].filter(g => g.items.length > 0)

  if (groups.length === 0) return { nodes, edges }

  const RADIUS = 250
  const centerX = entityPosition.x + NODE_WIDTH / 2
  const centerY = entityPosition.y + NODE_HEIGHT / 2
  const arcPerGroup = (2 * Math.PI) / groups.length

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const groupStartAngle = gi * arcPerGroup - Math.PI / 2 // Start from top
    const itemArc = arcPerGroup / (group.items.length + 1)

    for (let ii = 0; ii < group.items.length; ii++) {
      const item = group.items[ii]
      const angle = groupStartAngle + itemArc * (ii + 1)
      const x = centerX + RADIUS * Math.cos(angle) - 60 // offset for node width
      const y = centerY + RADIUS * Math.sin(angle) - 20 // offset for node height

      const nodeId = `sat-${entityId}-${item.id}`

      nodes.push({
        id: nodeId,
        type: 'satellite',
        position: { x, y },
        data: {
          itemType: group.type,
          itemId: item.id,
          label: item.label,
          item: item.item,
        },
      })

      edges.push({
        id: `se-${entityId}-${item.id}`,
        source: entityId,
        target: nodeId,
        style: {
          stroke: SATELLITE_COLORS[group.type],
          strokeWidth: 1,
          strokeDasharray: '6 4',
          opacity: 0.6,
        },
      })
    }
  }

  return { nodes, edges }
}
```

**Note:** The import at the top of the file should be:

```typescript
import { ENTITY_COLOR, SATELLITE_COLORS } from './explorer-types'
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/explorer-graph.ts
git commit -m "feat(explorer): add cross-reference engine and graph builder"
```

---

### Task 3: Entity Node Component

**Files:**
- Create: `src/components/explorer/explorer-node.tsx`
- Read: `src/components/ia/ia-node.tsx` (reference for styling pattern)

- [ ] **Step 1: Create the entity node**

```typescript
'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import type { ExplorerNodeData } from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'

export const ExplorerNode = memo(function ExplorerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ExplorerNodeData
  const [hovered, setHovered] = useState(false)

  const showTooltip = useCallback(() => setHovered(true), [])
  const hideTooltip = useCallback(() => setHovered(false), [])

  const isHighlighted = hovered || selected

  return (
    <div
      className="group relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div
        className="relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
        style={{
          background: 'var(--bg-white)',
          border: `1.5px solid ${isHighlighted ? ENTITY_COLOR : 'var(--border-default)'}`,
          boxShadow: selected
            ? `0 0 0 3px ${ENTITY_COLOR}33, 0 4px 16px rgba(0,0,0,0.08)`
            : hovered
              ? '0 4px 16px rgba(0,0,0,0.08)'
              : 'var(--shadow-subtle)',
          minWidth: 180,
          cursor: 'pointer',
        }}
      >
        <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${ENTITY_COLOR}14` }}
        >
          <Database size={16} style={{ color: ENTITY_COLOR }} strokeWidth={1.8} />
        </div>

        <div className="flex flex-col">
          <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {nodeData.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {nodeData.fieldCount} fields
            </span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {nodeData.stateCount} states
            </span>
          </div>
        </div>

        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      </div>

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 'calc(100% + 8px)', zIndex: 1000 }}
        >
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              width: 280,
            }}
          >
            <p className="text-[12px] leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
              {nodeData.description.length > 150
                ? nodeData.description.slice(0, 150) + '...'
                : nodeData.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/explorer-node.tsx
git commit -m "feat(explorer): add entity node component"
```

---

### Task 4: Satellite Node Component

**Files:**
- Create: `src/components/explorer/satellite-node.tsx`

- [ ] **Step 1: Create the satellite node**

```typescript
'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { SatelliteNodeData } from './explorer-types'
import { SATELLITE_COLORS, SATELLITE_LABELS } from './explorer-types'

export const SatelliteNode = memo(function SatelliteNode({ data }: NodeProps) {
  const nodeData = data as unknown as SatelliteNodeData
  const color = SATELLITE_COLORS[nodeData.itemType]
  const [hovered, setHovered] = useState(false)

  const showTooltip = useCallback(() => setHovered(true), [])
  const hideTooltip = useCallback(() => setHovered(false), [])

  // Get a short description for the tooltip
  const description = (() => {
    const item = nodeData.item
    if ('description' in item) return (item as { description: string }).description
    if ('constraint' in item) return (item as { constraint: string }).constraint
    if ('question' in item) return (item as { question: string }).question
    return ''
  })()

  return (
    <div
      className="group relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 cursor-pointer"
        style={{
          background: color,
          boxShadow: hovered ? `0 4px 12px ${color}44` : 'none',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />

        <span className="text-[10px] font-semibold uppercase tracking-wide text-white opacity-70">
          {SATELLITE_LABELS[nodeData.itemType]}
        </span>
        <span className="text-[12px] font-semibold text-white">
          {nodeData.label}
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 'calc(100% + 8px)', zIndex: 1000 }}
        >
          <div
            className="rounded-lg px-3 py-2"
            style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              width: 240,
            }}
          >
            <p className="text-[11px] leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
              {description.length > 120 ? description.slice(0, 120) + '...' : description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/satellite-node.tsx
git commit -m "feat(explorer): add satellite node component"
```

---

### Task 5: Detail Panel

**Files:**
- Create: `src/components/explorer/detail-panel.tsx`
- Read: `src/components/review/section-renderer.tsx` (reference for visual patterns)

- [ ] **Step 1: Create the detail panel with all renderers**

This is the largest file. It contains the panel shell + lightweight renderers for all 6 item types.

```typescript
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type {
  Actor, Entity, Journey, BusinessRule, Constraint, OpenQuestion,
} from '@/domain/intent-model/types'
import type { SatelliteNodeData, EntityRelationships } from './explorer-types'
import { SATELLITE_COLORS, SATELLITE_LABELS, ENTITY_COLOR } from './explorer-types'

// --- Shared sub-components ---

function TypeBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
}

function StateBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold"
      style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)', border: '1px solid rgba(0,129,242,0.15)' }}
    >
      {children}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

// --- Item renderers ---

function EntityDetail({ entity, relationships, onHighlightGroup }: {
  entity: Entity
  relationships?: EntityRelationships
  onHighlightGroup?: (type: SatelliteNodeData['itemType']) => void
}) {
  const [showTransitions, setShowTransitions] = useState(false)

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {entity.description}
      </p>

      {/* Fields table */}
      <div>
        <FieldLabel>Fields ({entity.key_fields.length})</FieldLabel>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th className="py-1.5 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)', width: '120px' }}>Name</th>
              <th className="py-1.5 pr-3 text-left font-medium" style={{ color: 'var(--text-muted)', width: '90px' }}>Type</th>
              <th className="py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {entity.key_fields.map((f, i) => (
              <tr key={f.name} style={{ borderBottom: i < entity.key_fields.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                <td className="py-2 pr-3 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</td>
                <td className="py-2 pr-3 align-top"><StateBadge>{f.type}</StateBadge></td>
                <td className="py-2 align-top text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lifecycle */}
      <div>
        <FieldLabel>Lifecycle ({entity.lifecycle.states.length} states)</FieldLabel>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {entity.lifecycle.states.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="rounded px-2 py-0.5 text-xs font-mono font-medium"
                style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {s}
              </span>
              {i < entity.lifecycle.states.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
            </span>
          ))}
        </div>

        {entity.lifecycle.transitions.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowTransitions(!showTransitions)}
              className="text-xs font-medium transition-colors duration-200"
              style={{ color: 'var(--accent-blue)' }}
            >
              {showTransitions ? '▾ Hide transitions' : '▸ Show transitions'}
            </button>

            {showTransitions && (
              <table className="mt-2 w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '80px' }}>From</th>
                    <th className="py-1.5 pr-2 text-left font-medium" style={{ color: 'var(--text-muted)', width: '80px' }}>To</th>
                    <th className="py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {entity.lifecycle.transitions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: i < entity.lifecycle.transitions.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                      <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.from}</td>
                      <td className="py-2 pr-2 align-top font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{t.to}</td>
                      <td className="py-2 align-top text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Related summary */}
      {relationships && (
        <div>
          <FieldLabel>Related</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {relationships.rules.length > 0 && (
              <button
                type="button"
                onClick={() => onHighlightGroup?.('business_rule')}
                className="text-xs font-medium px-2 py-1 rounded-md transition-colors duration-200 hover:opacity-80"
                style={{ background: '#F59E0B18', color: '#F59E0B' }}
              >
                {relationships.rules.length} rules
              </button>
            )}
            {relationships.journeys.length > 0 && (
              <button
                type="button"
                onClick={() => onHighlightGroup?.('journey')}
                className="text-xs font-medium px-2 py-1 rounded-md transition-colors duration-200 hover:opacity-80"
                style={{ background: '#10B98118', color: '#10B981' }}
              >
                {relationships.journeys.length} journeys
              </button>
            )}
            {relationships.actors.length > 0 && (
              <button
                type="button"
                onClick={() => onHighlightGroup?.('actor')}
                className="text-xs font-medium px-2 py-1 rounded-md transition-colors duration-200 hover:opacity-80"
                style={{ background: '#8B5CF618', color: '#8B5CF6' }}
              >
                {relationships.actors.length} actors
              </button>
            )}
            {relationships.constraints.length > 0 && (
              <button
                type="button"
                onClick={() => onHighlightGroup?.('constraint')}
                className="text-xs font-medium px-2 py-1 rounded-md transition-colors duration-200 hover:opacity-80"
                style={{ background: '#EF444418', color: '#EF4444' }}
              >
                {relationships.constraints.length} constraints
              </button>
            )}
            {relationships.openQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => onHighlightGroup?.('open_question')}
                className="text-xs font-medium px-2 py-1 rounded-md transition-colors duration-200 hover:opacity-80"
                style={{ background: '#EC489918', color: '#EC4899' }}
              >
                {relationships.openQuestions.length} questions
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActorDetail({ actor }: { actor: Actor }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{actor.description}</p>
      <div className="text-sm"><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Auth:</span> <span style={{ color: 'var(--text-secondary)' }}>{actor.auth}</span></div>
      <div>
        <FieldLabel>Responsibilities ({actor.responsibilities.length})</FieldLabel>
        {actor.responsibilities.map(r => (
          <div key={r.id} className="py-2 text-sm" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <span className="font-mono text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>{r.id}</span>
            <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function JourneyDetail({ journey }: { journey: Journey }) {
  return (
    <div className="space-y-3">
      <div className="text-sm"><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Actor:</span> <span style={{ color: 'var(--text-secondary)' }}>{journey.primary_actor}</span></div>
      {journey.preconditions.length > 0 && (
        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', color: '#92400E', border: '1px solid rgba(245,158,11,0.15)' }}>
          <span className="font-semibold">Preconditions: </span>{journey.preconditions.join(' · ')}
        </div>
      )}
      <div>
        {journey.steps.map(s => (
          <div key={s.order} className="flex gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--bg-blue-subtle)', color: 'var(--accent-blue)' }}>
              {s.order}
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
              <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-sm"><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Outcome:</span> <span style={{ color: 'var(--text-secondary)' }}>{journey.success_outcome}</span></div>
    </div>
  )
}

function RuleDetail({ rule }: { rule: BusinessRule }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StateBadge>{rule.id}</StateBadge>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rule.source}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{rule.description}</p>
      {rule.applies_to.length > 0 && (
        <div>
          <FieldLabel>Applies to</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {rule.applies_to.map(ref => (
              <span key={ref} className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-gray-subtle)', color: 'var(--text-secondary)' }}>
                {ref}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConstraintDetail({ constraint }: { constraint: Constraint }) {
  return (
    <div className="space-y-3">
      <StateBadge>{constraint.type}</StateBadge>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{constraint.constraint}</p>
    </div>
  )
}

function OpenQuestionDetail({ question }: { question: OpenQuestion }) {
  return (
    <div className="space-y-3">
      <StateBadge>{question.status}</StateBadge>
      <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>{question.question}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{question.reason}</p>
      {question.resolution && (
        <p className="text-sm px-2 py-1 rounded inline-block" style={{ background: 'rgba(37,186,59,0.08)', color: '#166534' }}>
          Resolution: {question.resolution}
        </p>
      )}
    </div>
  )
}

// --- Main panel component ---

type DetailPanelItem =
  | { type: 'entity'; entity: Entity; relationships?: EntityRelationships }
  | { type: 'satellite'; data: SatelliteNodeData }

type DetailPanelProps = {
  item: DetailPanelItem | null
  onClose: () => void
  onHighlightGroup?: (type: SatelliteNodeData['itemType']) => void
}

export function DetailPanel({ item, onClose, onHighlightGroup }: DetailPanelProps) {
  if (!item) return null

  const isEntity = item.type === 'entity'
  const color = isEntity ? ENTITY_COLOR : SATELLITE_COLORS[item.data.itemType]
  const typeLabel = isEntity ? 'Entity' : SATELLITE_LABELS[item.data.itemType]
  const name = isEntity ? item.entity.name : item.data.label

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-10 flex flex-col overflow-hidden"
      style={{
        width: 400,
        background: 'var(--bg-white)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
        animation: 'slideInRight 200ms ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge label={typeLabel} color={color} />
          <h3 className="text-sm font-semibold truncate m-0" style={{ color: 'var(--text-primary)' }}>{name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 transition-colors duration-200 hover:bg-[var(--bg-gray-subtle)]"
        >
          <X size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scroll">
        {isEntity ? (
          <EntityDetail entity={item.entity} relationships={item.relationships} onHighlightGroup={onHighlightGroup} />
        ) : (
          (() => {
            const d = item.data
            switch (d.itemType) {
              case 'actor': return <ActorDetail actor={d.item as Actor} />
              case 'journey': return <JourneyDetail journey={d.item as Journey} />
              case 'business_rule': return <RuleDetail rule={d.item as BusinessRule} />
              case 'constraint': return <ConstraintDetail constraint={d.item as Constraint} />
              case 'open_question': return <OpenQuestionDetail question={d.item as OpenQuestion} />
            }
          })()
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the slide-in animation to globals.css**

Add to the end of `src/app/globals.css`:

```css
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/detail-panel.tsx src/app/globals.css
git commit -m "feat(explorer): add detail panel with item renderers"
```

---

### Task 6: Explorer Canvas

**Files:**
- Create: `src/components/explorer/explorer-canvas.tsx`
- Read: `src/components/ia/ia-canvas.tsx` (reference for React Flow setup)

This is the main orchestration component — it manages selection state, satellite expansion, detail panel, and keyboard shortcuts.

- [ ] **Step 1: Create the canvas component**

```typescript
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
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { IntentModel, Entity } from '@/domain/intent-model/types'
import type { ExplorerNodeData, SatelliteNodeData, EntityRelationships } from './explorer-types'
import { ENTITY_COLOR, SATELLITE_COLORS, SATELLITE_LABELS } from './explorer-types'
import { buildExplorerGraph, buildSatelliteNodes } from './explorer-graph'
import { ExplorerNode } from './explorer-node'
import { SatelliteNode } from './satellite-node'
import { DetailPanel } from './detail-panel'

const nodeTypes = {
  explorer: ExplorerNode,
  satellite: SatelliteNode,
}

type DetailItem =
  | { type: 'entity'; entity: Entity; relationships?: EntityRelationships }
  | { type: 'satellite'; data: SatelliteNodeData }

export function ExplorerCanvas({ model }: { model: IntentModel }) {
  const graphData = useMemo(() => buildExplorerGraph(model), [model])

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.entityNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.entityEdges)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null)

  // Store base entity nodes/edges for resetting
  const baseNodes = useMemo(() => graphData.entityNodes, [graphData])
  const baseEdges = useMemo(() => graphData.entityEdges, [graphData])

  const clearSelection = useCallback(() => {
    setSelectedEntityId(null)
    setDetailItem(null)
    setNodes(baseNodes)
    setEdges(baseEdges)
  }, [baseNodes, baseEdges, setNodes, setEdges])

  const selectEntity = useCallback((entityId: string) => {
    const entity = model.entities.find(e => e.id === entityId)
    if (!entity) return

    const relationships = graphData.relationshipMap.get(entityId)
    if (!relationships) return

    setSelectedEntityId(entityId)

    // Find entity node position
    const entityNode = baseNodes.find(n => n.id === entityId)
    if (!entityNode) return

    // Build satellite nodes
    const { nodes: satNodes, edges: satEdges } = buildSatelliteNodes(
      entityId,
      entityNode.position,
      relationships,
    )

    // Dim other entities, highlight selected
    const updatedEntityNodes = baseNodes.map(n => ({
      ...n,
      selected: n.id === entityId,
      style: {
        ...n.style,
        opacity: n.id === entityId ? 1 : 0.3,
        transition: 'opacity 200ms ease-out',
      },
    }))

    // Dim entity-entity edges
    const dimmedEdges = baseEdges.map(e => ({
      ...e,
      style: { ...e.style, opacity: 0.15 },
    }))

    setNodes([...updatedEntityNodes, ...satNodes])
    setEdges([...dimmedEdges, ...satEdges])

    // Open detail panel for entity
    setDetailItem({
      type: 'entity',
      entity,
      relationships,
    })
  }, [model, graphData, baseNodes, baseEdges, setNodes, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'explorer') {
      const entityId = (node.data as unknown as ExplorerNodeData).entityId
      if (entityId === selectedEntityId) {
        clearSelection()
      } else {
        selectEntity(entityId)
      }
    } else if (node.type === 'satellite') {
      const data = node.data as unknown as SatelliteNodeData
      setDetailItem({ type: 'satellite', data })
    }
  }, [selectedEntityId, selectEntity, clearSelection])

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection()
      } else if (e.key === 'f' || e.key === 'F') {
        // Fit view handled by React Flow's fitView — trigger via ref if needed
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const entityIds = model.entities.map(e => e.id)
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
    + model.business_rules.length + model.constraints.length + model.open_questions.length
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
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,0.06)" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'satellite') {
              const d = node.data as unknown as SatelliteNodeData
              return SATELLITE_COLORS[d.itemType]
            }
            return ENTITY_COLOR
          }}
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
        {Object.entries(SATELLITE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {SATELLITE_LABELS[type as SatelliteNodeData['itemType']]}
            </span>
          </div>
        ))}
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
        <div className="flex items-center gap-1.5">
          <svg width="20" height="6" className="shrink-0">
            <line x1="2" y1="3" x2="18" y2="3" stroke="#858481" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
          </svg>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Related</span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="absolute top-4 right-4 flex items-center gap-3 rounded-xl px-4 py-2.5"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-float)',
          ...(detailItem ? { right: 416 } : {}),
        }}
      >
        <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-blue)' }}>
          v{model.meta.version}
        </span>
        <span className="text-[11px] font-medium capitalize" style={{ color: 'var(--text-muted)' }}>
          {model.meta.status}
        </span>
        <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {model.entities.length} entities · {model.business_rules.length} rules · {totalItems} total
        </span>
        {selectedRelationships && selectedEntityId && (
          <>
            <div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
            <span className="text-[11px] font-semibold" style={{ color: ENTITY_COLOR }}>
              {model.entities.find(e => e.id === selectedEntityId)?.name} —{' '}
              {selectedRelationships.rules.length} rules, {selectedRelationships.journeys.length} journeys, {selectedRelationships.actors.length} actors
            </span>
          </>
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onHighlightGroup={(type) => {
          // Could scroll to or highlight specific satellites — for now just a visual hook
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/explorer-canvas.tsx
git commit -m "feat(explorer): add main canvas with selection, satellites, and keyboard shortcuts"
```

---

### Task 7: Page Route & Nav Update

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/review/nav-links.tsx`

- [ ] **Step 1: Replace root page with explorer**

Replace `src/app/page.tsx` entirely:

```typescript
import { getCurrentModel } from '@/lib/model-store'
import { NavSidebar } from '@/components/review/nav-links'
import { ExplorerCanvas } from '@/components/explorer/explorer-canvas'

export const dynamic = 'force-dynamic'

export default async function ExplorerPage() {
  const model = await getCurrentModel()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <NavSidebar />
      <div className="flex-1 overflow-hidden">
        <ExplorerCanvas model={model} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Explorer to nav sidebar**

In `src/components/review/nav-links.tsx`:

1. Add `Network` to the lucide-react import
2. Add Explorer as the first item in `navItems`:
   ```typescript
   { label: 'Explorer', href: '/', icon: Network },
   ```
3. Update the `isActive` logic to handle `/` correctly. Change:
   ```typescript
   const isActive = item.href === '/review'
     ? pathname === '/review'
     : pathname.startsWith(item.href)
   ```
   To:
   ```typescript
   const isActive = item.href === '/'
     ? pathname === '/'
     : item.href === '/review'
       ? pathname === '/review'
       : pathname.startsWith(item.href)
   ```
4. Update the logo link from `/review` to `/`

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 4: Run the dev server and verify visually**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm dev`
Open: `http://localhost:4444`
Expected:
- Landing page shows the entity graph (11 entity nodes)
- Nav sidebar shows "Explorer" as first item, highlighted
- Clicking an entity shows satellites + detail panel
- Escape clears selection
- Arrow keys cycle through entities
- `/review` still works normally

- [ ] **Step 5: Run lint**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm lint`
Expected: No errors (fix any that appear)

- [ ] **Step 6: Commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/app/page.tsx src/components/review/nav-links.tsx
git commit -m "feat(explorer): wire up explorer page at / and add nav link"
```

---

### Task 8: Polish & Edge Cases

**Files:**
- Modify: `src/components/explorer/explorer-graph.ts` (fix any edge detection issues)
- Modify: `src/components/explorer/explorer-canvas.tsx` (fix any interaction issues)

- [ ] **Step 1: Test all 11 entities**

Click each entity in the explorer and verify:
- Satellites appear for entities that should have them
- Detail panel shows correct content
- No console errors

- [ ] **Step 2: Fix the `buildSatelliteNodes` import**

Ensure `explorer-graph.ts` imports `SATELLITE_COLORS` at the top level (not via dynamic import). The edge style in `buildSatelliteNodes` should reference `SATELLITE_COLORS[group.type]` directly.

- [ ] **Step 3: Test keyboard navigation**

- Press Arrow Right/Left to cycle entities
- Press Escape to clear
- Verify no focus trapping issues

- [ ] **Step 4: Run lint and fix**

Run: `cd /Users/rahul/DBiz/vbs-intent && pnpm lint`

- [ ] **Step 5: Final commit**

```bash
cd /Users/rahul/DBiz/vbs-intent
git add src/components/explorer/ src/app/page.tsx src/components/review/nav-links.tsx
git commit -m "feat(explorer): polish and edge case fixes"
```
