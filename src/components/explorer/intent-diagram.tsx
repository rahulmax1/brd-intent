'use client'

import { useMemo } from 'react'
import { ReactFlow, Background, Controls, Node, Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { IntentModel } from '@/domain/intent-model/types'

// Node components
function ActorNode({ data }: { data: { label: string; description: string; isPrimary?: boolean } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border w-[230px] text-center"
      style={{
        background: data.isPrimary ? '#EEEDFE' : '#F1EFE8',
        borderColor: data.isPrimary ? '#534AB7' : '#5F5E5A',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function EntityNode({ data }: { data: { label: string; description: string; isCore?: boolean } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border w-[230px]"
      style={{
        background: data.isCore ? '#E6F1FB' : '#FAECE7',
        borderColor: data.isCore ? '#185FA5' : '#993C1D',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function JourneyNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border w-[230px]"
      style={{
        background: '#E1F5EE',
        borderColor: '#0F6E56',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function RuleNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border w-[230px]"
      style={{
        background: '#F1EFE8',
        borderColor: '#5F5E5A',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function LifecycleNode({ data }: { data: { label: string; isFinal?: boolean } }) {
  return (
    <div
      className="px-3 py-2 rounded border text-xs font-medium text-center min-w-[100px]"
      style={{
        background: data.isFinal ? '#E1F5EE' : '#E6F1FB',
        borderColor: data.isFinal ? '#0F6E56' : '#185FA5',
        borderWidth: '1px',
      }}
    >
      {data.label}
    </div>
  )
}

function SectionLabel({ data }: { data: { label: string } }) {
  return (
    <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
      {data.label}
    </div>
  )
}

const nodeTypes = {
  actor: ActorNode,
  entity: EntityNode,
  journey: JourneyNode,
  rule: RuleNode,
  lifecycle: LifecycleNode,
  section: SectionLabel,
}

export function IntentDiagram({ model }: { model: IntentModel }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    let yOffset = 20
    const xPadding = 50
    const nodeSpacing = 260
    const sectionGap = 160

    const addSection = (label: string) => {
      nodes.push({
        id: `section-${label}`,
        type: 'section',
        position: { x: xPadding, y: yOffset },
        data: { label },
        draggable: false,
        selectable: false,
      })
      yOffset += 35
    }

    // ACTORS
    const actors = model.actors?.slice(0, 6) ?? []
    if (actors.length > 0) {
      addSection('ACTORS')
      const actorStartY = yOffset
      actors.forEach((actor, i) => {
        nodes.push({
          id: `actor-${actor.id}`,
          type: 'actor',
          position: { x: xPadding + i * nodeSpacing, y: actorStartY },
          data: {
            label: actor.name,
            description: actor.description?.split('\n')[0]?.substring(0, 80) || '',
            isPrimary: i === 0,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        })
      })
      yOffset = actorStartY + sectionGap
    }

    // ENTITIES
    const entities = model.entities?.slice(0, 8) ?? []
    if (entities.length > 0) {
      addSection('ENTITIES')
      const entityStartY = yOffset
      const cols = Math.min(entities.length, 4)
      entities.forEach((entity, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        nodes.push({
          id: `entity-${entity.id}`,
          type: 'entity',
          position: { x: xPadding + col * 260, y: entityStartY + row * 120 },
          data: {
            label: entity.name,
            description: entity.description?.substring(0, 80) || '',
            isCore: true,
          },
        })
      })
      const entityRows = Math.ceil(entities.length / cols)
      yOffset = entityStartY + entityRows * 120 + 60
    }

    // LIFECYCLE — show for entities that have states
    const entitiesWithLifecycle = entities.filter(
      (e) => e.lifecycle?.states && e.lifecycle.states.length > 0,
    ).slice(0, 2)

    for (const entity of entitiesWithLifecycle) {
      const states = entity.lifecycle.states
      addSection(`${entity.name.toUpperCase()} LIFECYCLE`)
      const lcStartY = yOffset
      states.forEach((state, i) => {
        nodes.push({
          id: `lc-${entity.id}-${i}`,
          type: 'lifecycle',
          position: { x: xPadding + i * 140, y: lcStartY },
          data: {
            label: state,
            isFinal: i === states.length - 1,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        })

        if (i > 0) {
          edges.push({
            id: `e-lc-${entity.id}-${i}`,
            source: `lc-${entity.id}-${i - 1}`,
            target: `lc-${entity.id}-${i}`,
            style: { stroke: '#185FA5', strokeWidth: 2 },
            animated: true,
          })
        }
      })
      yOffset = lcStartY + 120
    }

    // KEY JOURNEYS
    const journeys = model.journeys?.slice(0, 6) ?? []
    if (journeys.length > 0) {
      addSection('KEY JOURNEYS')
      const journeyStartY = yOffset
      journeys.forEach((journey, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        nodes.push({
          id: `journey-${journey.id}`,
          type: 'journey',
          position: { x: xPadding + col * 260, y: journeyStartY + row * 120 },
          data: {
            label: journey.name,
            description: (journey.success_outcome ?? '').substring(0, 80),
          },
        })
      })
      const journeyRows = Math.ceil(journeys.length / 3)
      yOffset = journeyStartY + journeyRows * 120 + 40
    }

    // BUSINESS RULES
    const rules = model.businessRules?.slice(0, 6) ?? []
    if (rules.length > 0) {
      addSection('BUSINESS RULES')
      const ruleStartY = yOffset
      rules.forEach((rule, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        nodes.push({
          id: `rule-${rule.id}`,
          type: 'rule',
          position: { x: xPadding + col * 260, y: ruleStartY + row * 120 },
          data: {
            label: rule.id,
            description: rule.description?.substring(0, 80) || '',
          },
        })
      })
    }

    return { nodes, edges }
  }, [model])

  return (
    <div className="h-full w-full" style={{ background: 'var(--bg-page)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-default)" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
