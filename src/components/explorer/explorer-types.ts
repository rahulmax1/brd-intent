import type { Node, Edge } from '@xyflow/react'
import type {
  Actor, Journey, BusinessRule, Constraint, OpenQuestion,
} from '@/domain/intent-model/types'

// --- Node data types ---

export type ExplorerNodeData = {
  entityId: string
  name: string
  fieldCount: number
  stateCount: number
  description: string
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

export const ENTITY_COLOR = '#0081F2'
