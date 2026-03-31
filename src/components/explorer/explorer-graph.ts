import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { IntentModel, Entity } from '@/domain/intent-model/types'
import type { ExplorerGraphData, ExplorerNodeData, EntityRelationships } from './explorer-types'
import { ENTITY_COLOR } from './explorer-types'
import type { ExplorerPositions } from '@/lib/explorer-positions-store'

// --- Layout constants ---

const NODE_WIDTH = 200
const NODE_HEIGHT = 70
// --- Handle selection ---
// Pick source (right|bottom) and target (left|top) handles based on relative position

function pickHandles(
  srcX: number, srcY: number,
  tgtX: number, tgtY: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtX - srcX
  const dy = tgtY - srcY

  // If target is more below than beside, use bottom→top
  if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top' }
  }
  // If target is more above than beside, use top→bottom (source top, target bottom)
  // But spec says source can only be right|bottom, target can only be left|top
  // So for "above" targets, use right→top
  if (Math.abs(dy) > Math.abs(dx) && dy < 0) {
    return { sourceHandle: 'right', targetHandle: 'top' }
  }
  // Default: horizontal — right→left
  return { sourceHandle: 'right', targetHandle: 'left' }
}

// --- Edge style constants ---

const ENTITY_EDGE_STYLE = {
  stroke: '#9CA3AF',
  strokeWidth: 1.5,
}

const ENTITY_ARROW = {
  type: 'arrowclosed' as const,
  width: 10,
  height: 10,
  color: '#9CA3AF',
}

// --- Helper: extract abbreviation from entity name ---
// e.g. "House Bill of Lading (HBL)" -> "HBL"

function extractAbbreviation(name: string): string | null {
  const match = name.match(/\(([A-Z][A-Z0-9]+)\)/)
  return match ? match[1] : null
}

// --- Helper: build word-boundary regex for a term ---

function wordBoundaryRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

// --- findEntityEdges ---
// Scans key_fields descriptions and lifecycle transition triggers/guards
// for references to other entities (by id, lowercase name, or abbreviation).

export function findEntityEdges(
  entities: Entity[],
): Map<string, EntityRelationships['entityEdges']> {
  const result = new Map<string, EntityRelationships['entityEdges']>()

  for (const entity of entities) {
    const edges: EntityRelationships['entityEdges'] = []

    for (const other of entities) {
      if (other.id === entity.id) continue

      const abbrev = extractAbbreviation(other.name)
      const patterns = [
        wordBoundaryRegex(other.id),
        wordBoundaryRegex(other.name.replace(/\s*\([^)]+\)/, '').trim()),
        ...(abbrev ? [wordBoundaryRegex(abbrev)] : []),
      ]

      const matchesAny = (text: string) => patterns.some((re) => re.test(text))

      // Scan key_fields descriptions
      const fieldReason = entity.key_fields.find((f) => matchesAny(f.description))
      if (fieldReason) {
        edges.push({
          targetEntityId: other.id,
          reason: `field "${fieldReason.name}" references ${other.name}`,
        })
        continue
      }

      // Scan lifecycle transitions (trigger + guard)
      const transitionReason = entity.lifecycle.transitions.find(
        (t) => matchesAny(t.trigger) || (t.guard ? matchesAny(t.guard) : false),
      )
      if (transitionReason) {
        edges.push({
          targetEntityId: other.id,
          reason: `transition "${transitionReason.from} → ${transitionReason.to}" references ${other.name}`,
        })
      }
    }

    result.set(entity.id, edges)
  }

  return result
}

// --- findRelationships ---
// Finds model items that reference the given entity.

export function findRelationships(entity: Entity, model: IntentModel): EntityRelationships {
  const abbrev = extractAbbreviation(entity.name)
  const baseName = entity.name.replace(/\s*\([^)]+\)/, '').trim()
  const patterns = [
    wordBoundaryRegex(entity.id),
    wordBoundaryRegex(baseName),
    ...(abbrev ? [wordBoundaryRegex(abbrev)] : []),
  ]

  const matchesAny = (text: string) => patterns.some((re) => re.test(text))

  // Business rules: check applies_to list and description
  const rules = model.businessRules.filter((br) => {
    if (br.applies_to.some((ref) => matchesAny(ref))) return true
    if (matchesAny(br.description)) return true
    return false
  })

  // Journeys: check name, preconditions, step titles and details
  const journeys = model.journeys.filter((j) => {
    if (matchesAny(j.name)) return true
    if (j.preconditions.some((p) => matchesAny(p))) return true
    if (j.steps.some((s) => matchesAny(s.title) || matchesAny(s.detail))) return true
    return false
  })

  // Actors: check responsibilities
  const actors = model.actors.filter((a) =>
    a.responsibilities.some((r) => matchesAny(r.description)),
  )

  // Constraints: check constraint text
  const constraints = model.constraints.filter((c) => matchesAny(c.constraint))

  // Open questions: only show unresolved ones (resolved = already incorporated into the model)
  const openQuestions = model.openQuestions.filter(
    (oq) => oq.status !== 'resolved' && (matchesAny(oq.question) || matchesAny(oq.reason)),
  )

  // Entity edges are computed separately — return empty here
  return {
    entityEdges: [],
    rules,
    journeys,
    actors,
    constraints,
    openQuestions,
  }
}

// --- layoutEntities ---
// Runs dagre layout on entity nodes using their cross-reference edges.

function layoutEntities(
  entities: Entity[],
  entityEdgesPerEntity: Map<string, EntityRelationships['entityEdges']>,
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'LR',
    nodesep: 80,
    ranksep: 120,
    marginx: 60,
    marginy: 60,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entity of entities) {
    g.setNode(entity.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const addedEdges = new Set<string>()
  for (const entity of entities) {
    const edges = entityEdgesPerEntity.get(entity.id) ?? []
    for (const edge of edges) {
      const key = [entity.id, edge.targetEntityId].sort().join('--')
      if (!addedEdges.has(key)) {
        g.setEdge(entity.id, edge.targetEntityId)
        addedEdges.add(key)
      }
    }
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const entity of entities) {
    const node = g.node(entity.id)
    if (node) {
      positions.set(entity.id, {
        x: node.x - NODE_WIDTH / 2,
        y: node.y - NODE_HEIGHT / 2,
      })
    }
  }

  return positions
}

// --- buildExplorerGraph ---
// Main export. Returns dagre-positioned entity nodes, deduplicated edges,
// and a relationship map for each entity.

export function buildExplorerGraph(model: IntentModel, savedPositions?: ExplorerPositions): ExplorerGraphData {
  const { entities } = model

  // Step 1: compute cross-reference edges per entity
  const entityEdgesPerEntity = findEntityEdges(entities)

  // Step 2: compute full relationships per entity
  const relationshipMap = new Map<string, EntityRelationships>()
  for (const entity of entities) {
    const rels = findRelationships(entity, model)
    rels.entityEdges = entityEdgesPerEntity.get(entity.id) ?? []
    relationshipMap.set(entity.id, rels)
  }

  // Step 3: dagre layout
  const positions = layoutEntities(entities, entityEdgesPerEntity)

  // Step 4: build entity nodes (saved positions override dagre)
  const entityNodes: Node<ExplorerNodeData>[] = entities.map((entity) => ({
    id: entity.id,
    type: 'explorer',
    position: savedPositions?.[entity.id] ?? positions.get(entity.id) ?? { x: 0, y: 0 },
    data: {
      entityId: entity.id,
      name: entity.name,
      fieldCount: entity.key_fields.length,
      stateCount: entity.lifecycle.states.length,
      description: entity.description,
    },
  }))

  // Step 5: build deduplicated entity-to-entity edges
  // Sort source+target to avoid A→B and B→A duplicates
  const seenEdgeKeys = new Set<string>()
  const entityEdges: Edge[] = []

  for (const entity of entities) {
    const edges = entityEdgesPerEntity.get(entity.id) ?? []
    for (const edge of edges) {
      const key = [entity.id, edge.targetEntityId].sort().join('--')
      if (seenEdgeKeys.has(key)) continue
      seenEdgeKeys.add(key)

      const srcPos = positions.get(entity.id) ?? { x: 0, y: 0 }
      const tgtPos = positions.get(edge.targetEntityId) ?? { x: 0, y: 0 }
      const handles = pickHandles(srcPos.x, srcPos.y, tgtPos.x, tgtPos.y)

      entityEdges.push({
        id: `entity-edge-${key}`,
        source: entity.id,
        target: edge.targetEntityId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        style: ENTITY_EDGE_STYLE,
        markerEnd: ENTITY_ARROW,
        label: edge.reason.length > 40 ? edge.reason.slice(0, 40) + '…' : edge.reason,
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
    entityNodes,
    entityEdges,
    relationshipMap,
  }
}

// Export ENTITY_COLOR for use in canvas
export { ENTITY_COLOR }
