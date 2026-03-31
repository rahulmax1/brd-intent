import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { IntentModel } from '@/domain/intent-model/types'
import type { IAPositions, IANodeData, LaneNodeData, DriftWarning } from './ia-types'

// --- Layout constants ---

const LANE_WIDTH = 1160
const NODE_WIDTH = 180
const NODE_HEIGHT = 50

// --- Edge style constants ---

const SOLID_EDGE_STYLE = {
  stroke: '#858481',
  strokeWidth: 1.5,
}

const DASHED_EDGE_STYLE = {
  stroke: '#858481',
  strokeWidth: 1.2,
  strokeDasharray: '6 4',
  opacity: 0.4,
}

const ARROW_SOLID = {
  type: 'arrowclosed' as const,
  width: 12,
  height: 12,
  color: '#858481',
}

const ARROW_DASHED = {
  type: 'arrowclosed' as const,
  width: 10,
  height: 10,
  color: '#858481',
}

const LABEL_STYLE = {
  fontSize: 10,
  fontWeight: 500,
  fill: '#858481',
  fontFamily: 'var(--font-sans)',
}

const LABEL_BG_STYLE = {
  fill: 'var(--bg-page)',
  fillOpacity: 0.9,
}

// --- Result type ---

export type IAGraphResult = {
  nodes: Node[]
  edges: Edge[]
  drift: DriftWarning[]
  stats: {
    total: number
    done: number
    partial: number
    notBuilt: number
  }
}

// --- Main export ---

export function buildIAGraph(model: IntentModel, positions: IAPositions): IAGraphResult {
  const { _screens, _edges, _lanes, ...positionOverrides } = positions

  // Build lookup: responsibility id -> actor id + description
  const responsibilityMap = new Map<string, { actorId: string; description: string }>()
  for (const actor of model.actors) {
    for (const resp of actor.responsibilities) {
      responsibilityMap.set(resp.id, { actorId: actor.id, description: resp.description })
    }
  }

  // Build lookup: actor id -> actor
  const actorMap = new Map(model.actors.map((a) => [a.id, a]))

  // Build lookup: responsibility id -> business rule ids that apply to it
  const rulesByRef = new Map<string, string[]>()
  for (const rule of model.businessRules) {
    for (const ref of rule.applies_to) {
      const existing = rulesByRef.get(ref) ?? []
      existing.push(rule.id)
      rulesByRef.set(ref, existing)
    }
  }

  // Track which responsibility ids are referenced by screens
  const referencedResponsibilities = new Set<string>()

  // --- Detect drift ---
  const drift: DriftWarning[] = []

  // Collect all model actor ids
  const modelActorIds = new Set(model.actors.map((a) => a.id))

  for (const [screenId, screen] of Object.entries(_screens)) {
    for (const ref of screen.refs) {
      referencedResponsibilities.add(ref)

      // Stale ref: only check responsibility-format refs (contain ':')
      // Journey IDs, BR-*, OQ-*, C-* are informational tags, not responsibility mappings
      if (ref.includes(':') && !responsibilityMap.has(ref)) {
        drift.push({
          type: 'stale-ref',
          message: `Screen '${screenId}' references '${ref}' which does not exist in the model`,
        })
      }
    }

    // Removed actor: screen references actor not in model (except 'shared')
    if (screen.actor !== 'shared' && !modelActorIds.has(screen.actor)) {
      drift.push({
        type: 'removed-actor',
        message: `Screen '${screenId}' references actor '${screen.actor}' which is not in the model`,
      })
    }
  }

  // Unmapped responsibilities: in model but not referenced by any screen
  // Exclude driver (no portal access)
  for (const actor of model.actors) {
    if (actor.id === 'driver') continue
    for (const resp of actor.responsibilities) {
      if (!referencedResponsibilities.has(resp.id)) {
        drift.push({
          type: 'unmapped-responsibility',
          message: `Responsibility '${resp.id}' (${actor.id}) is not referenced by any screen`,
        })
      }
    }
  }

  // --- Determine which nodes need dagre layout ---
  const needsDagre = new Set<string>()
  for (const screenId of Object.keys(_screens)) {
    if (!positionOverrides[screenId]) {
      needsDagre.add(screenId)
    }
  }

  // Run dagre layout for unpositioned nodes
  const dagrePositions = new Map<string, { x: number; y: number }>()
  if (needsDagre.size > 0) {
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: 'LR',
      nodesep: 40,
      ranksep: 80,
      marginx: 40,
      marginy: 40,
    })
    g.setDefaultEdgeLabel(() => ({}))

    for (const screenId of needsDagre) {
      g.setNode(screenId, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }

    for (const edgeDef of Object.values(_edges)) {
      if (needsDagre.has(edgeDef.source) && needsDagre.has(edgeDef.target)) {
        g.setEdge(edgeDef.source, edgeDef.target)
      }
    }

    dagre.layout(g)

    for (const screenId of needsDagre) {
      const node = g.node(screenId)
      if (node) {
        dagrePositions.set(screenId, {
          x: node.x - NODE_WIDTH / 2,
          y: node.y - NODE_HEIGHT / 2,
        })
      }
    }
  }

  // --- Generate lane nodes ---
  const laneNodes: Node<LaneNodeData>[] = Object.entries(_lanes).map(([laneId, lane]) => ({
    id: `lane-${laneId}`,
    type: 'lane',
    position: { x: 0, y: lane.y },
    data: {
      label: lane.label ?? laneId,
      color: lane.color,
      width: LANE_WIDTH,
      height: lane.height,
    },
    draggable: false,
    selectable: false,
    connectable: false,
    zIndex: -1,
    style: { width: LANE_WIDTH, height: lane.height },
  }))

  // --- Generate screen nodes ---
  const screenNodes: Node<IANodeData>[] = Object.entries(_screens).map(([screenId, screen]) => {
    // Derive description: join descriptions of all matched responsibilities
    const descParts: string[] = []
    for (const ref of screen.refs) {
      const resp = responsibilityMap.get(ref)
      if (resp) {
        descParts.push(resp.description)
      }
    }
    const description = descParts.join(' · ')

    // Derive business rule refs that apply to any of this screen's refs
    const brRefs = new Set<string>()
    for (const ref of screen.refs) {
      const rules = rulesByRef.get(ref) ?? []
      for (const ruleId of rules) {
        brRefs.add(ruleId)
      }
    }

    // Icon name passed as string — resolved client-side
    const iconName = screen.icon

    // Resolve position
    const override = positionOverrides[screenId]
    const position = override
      ? { x: override.x, y: override.y }
      : (dagrePositions.get(screenId) ?? { x: 0, y: 0 })

    return {
      id: screenId,
      type: 'ia',
      position,
      data: {
        label: screen.label,
        iconName,
        status: screen.status,
        actor: screen.actor,
        description,
        refs: screen.refs,
      },
    }
  })

  // --- Generate edges ---
  const edges: Edge[] = Object.entries(_edges).map(([edgeId, edgeDef]) => {
    const isCross = edgeDef.cross === true

    const edgeStyle = isCross ? DASHED_EDGE_STYLE : SOLID_EDGE_STYLE
    const markerEnd = isCross ? ARROW_DASHED : ARROW_SOLID

    const edge: Edge = {
      id: edgeId,
      source: edgeDef.source,
      target: edgeDef.target,
      sourceHandle: edgeDef.sourceHandle ?? 'right',
      targetHandle: edgeDef.targetHandle ?? 'left',
      style: edgeStyle,
      markerEnd,
    }

    if (edgeDef.label) {
      edge.label = edgeDef.label
      edge.labelStyle = LABEL_STYLE
      edge.labelBgStyle = LABEL_BG_STYLE
      edge.labelBgPadding = [4, 6]
      edge.labelBgBorderRadius = 4
    }

    return edge
  })

  // --- Compute stats ---
  const screenList = Object.values(_screens)
  const stats = {
    total: screenList.length,
    done: screenList.filter((s) => s.status === 'done').length,
    partial: screenList.filter((s) => s.status === 'partial').length,
    notBuilt: screenList.filter((s) => s.status === 'not-built').length,
  }

  return {
    nodes: [...laneNodes, ...screenNodes],
    edges,
    drift,
    stats,
  }
}
