'use client'

import { useMemo } from 'react'
import { ReactFlow, Background, Controls, Node, Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { IntentModel } from '@/domain/intent-model/types'

// Node components
function ActorNode({ data }: { data: { label: string; description: string; isPrimary?: boolean } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border min-w-[160px] text-center"
      style={{
        background: data.isPrimary ? '#EEEDFE' : '#F1EFE8',
        borderColor: data.isPrimary ? '#534AB7' : '#5F5E5A',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function EntityNode({ data }: { data: { label: string; description: string; isCore?: boolean } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border min-w-[180px]"
      style={{
        background: data.isCore ? '#E6F1FB' : '#FAECE7',
        borderColor: data.isCore ? '#185FA5' : '#993C1D',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function JourneyNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border min-w-[180px]"
      style={{
        background: '#E1F5EE',
        borderColor: '#0F6E56',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {data.description}
      </div>
    </div>
  )
}

function RuleNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-lg border min-w-[160px]"
      style={{
        background: '#F1EFE8',
        borderColor: '#5F5E5A',
        borderWidth: '1px',
      }}
    >
      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {data.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
    const nodeSpacing = 220
    const sectionGap = 160

    // Helper to add section
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
    addSection('ACTORS')
    const actorStartY = yOffset
    const actors = model.actors?.slice(0, 4) || []
    actors.forEach((actor, i) => {
      nodes.push({
        id: `actor-${actor.id}`,
        type: 'actor',
        position: { x: xPadding + i * nodeSpacing, y: actorStartY },
        data: {
          label: actor.name,
          description: actor.description?.split('\n')[0]?.substring(0, 40) || '',
          isPrimary: i === 0,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })
    })

    // Actor connections: LSP -> P4TC delegation
    if (actors.length > 1) {
      edges.push({
        id: 'e-actor-delegate',
        source: `actor-${actors[0].id}`,
        target: `actor-${actors[1].id}`,
        label: 'delegate',
        style: { stroke: '#534AB7', strokeWidth: 2 },
        labelStyle: { fontSize: 11, fill: '#534AB7' },
      })
    }

    // ACFS manages all
    if (actors.length > 0) {
      edges.push({
        id: 'e-actor-manages',
        source: `actor-${actors[actors.length - 1].id}`,
        target: `actor-${actors[0].id}`,
        label: 'manages',
        style: { stroke: '#888780', strokeWidth: 1, strokeDasharray: '4 3' },
        labelStyle: { fontSize: 11, fill: '#888780' },
        type: 'smoothstep',
      })
    }

    yOffset = actorStartY + sectionGap

    // CORE ENTITIES
    addSection('CORE ENTITIES')
    const coreStartY = yOffset
    const coreEntities = model.entities?.filter(e =>
      ['HBL', 'Booking', 'Pickup Slot', 'PickupSlot'].includes(e.name)
    ).slice(0, 3) || []

    coreEntities.forEach((entity, i) => {
      nodes.push({
        id: `entity-${entity.id}`,
        type: 'entity',
        position: { x: xPadding + i * nodeSpacing, y: coreStartY },
        data: {
          label: entity.name,
          description: entity.description?.substring(0, 45) || '',
          isCore: true,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // Connect entities left to right
      if (i > 0) {
        edges.push({
          id: `e-entity-${i}`,
          source: `entity-${coreEntities[i - 1].id}`,
          target: `entity-${entity.id}`,
          label: i === 1 ? 'booked in' : 'occupies',
          style: { stroke: '#378ADD', strokeWidth: 2 },
          labelStyle: { fontSize: 11, fill: '#378ADD' },
        })
      }
    })

    // Actor to Entity connections
    if (actors.length > 0 && coreEntities.length > 0) {
      // LSP views HBLs
      edges.push({
        id: 'e-lsp-views-hbl',
        source: `actor-${actors[0].id}`,
        target: `entity-${coreEntities[0].id}`,
        label: 'views',
        style: { stroke: '#534AB7', strokeWidth: 1, strokeDasharray: '4 3' },
        labelStyle: { fontSize: 11, fill: '#534AB7' },
        type: 'smoothstep',
      })

      // ACFS configures Pickup Slots
      if (coreEntities.length > 2) {
        edges.push({
          id: 'e-acfs-configures',
          source: `actor-${actors[actors.length - 1].id}`,
          target: `entity-${coreEntities[2].id}`,
          label: 'configures',
          style: { stroke: '#0F6E56', strokeWidth: 1, strokeDasharray: '4 3' },
          labelStyle: { fontSize: 11, fill: '#0F6E56' },
          type: 'smoothstep',
        })
      }
    }

    yOffset = coreStartY + sectionGap

    // HBL LIFECYCLE
    addSection('HBL MILESTONE FLOW')
    const lifecycleStartY = yOffset
    const milestones = ['on vessel', 'at wharf', 'in yard', 'unpacked ✓', 'collected']
    milestones.forEach((milestone, i) => {
      nodes.push({
        id: `milestone-${i}`,
        type: 'lifecycle',
        position: { x: xPadding + i * 140, y: lifecycleStartY },
        data: {
          label: milestone,
          isFinal: i === milestones.length - 1,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      if (i > 0) {
        edges.push({
          id: `e-milestone-${i}`,
          source: `milestone-${i - 1}`,
          target: `milestone-${i}`,
          style: { stroke: '#185FA5', strokeWidth: 2 },
          animated: true,
        })
      }
    })
    yOffset = lifecycleStartY + 120

    // SUPPORTING ENTITIES
    addSection('SUPPORTING ENTITIES')
    const supportStartY = yOffset
    const supportingEntities = model.entities?.filter(e =>
      !['HBL', 'Booking', 'Pickup Slot', 'PickupSlot'].includes(e.name)
    ).slice(0, 4) || []

    supportingEntities.forEach((entity, i) => {
      nodes.push({
        id: `support-${entity.id}`,
        type: 'entity',
        position: { x: xPadding + i * 200, y: supportStartY },
        data: {
          label: entity.name,
          description: entity.description?.substring(0, 35) || '',
          isCore: false,
        },
      })
    })

    // Core to Supporting entity connections
    if (coreEntities.length > 0 && supportingEntities.length > 0) {
      // HBL to first supporting (Delivery Order)
      edges.push({
        id: 'e-hbl-to-support',
        source: `entity-${coreEntities[0].id}`,
        target: `support-${supportingEntities[0].id}`,
        style: { stroke: '#D85A30', strokeWidth: 1, strokeDasharray: '4 3' },
        type: 'smoothstep',
      })

      // Booking to supporting entities
      if (coreEntities.length > 1 && supportingEntities.length > 1) {
        edges.push({
          id: 'e-booking-to-support',
          source: `entity-${coreEntities[1].id}`,
          target: `support-${supportingEntities[1].id}`,
          style: { stroke: '#D85A30', strokeWidth: 1, strokeDasharray: '4 3' },
          type: 'smoothstep',
        })
      }

      if (coreEntities.length > 1 && supportingEntities.length > 2) {
        edges.push({
          id: 'e-booking-to-payment',
          source: `entity-${coreEntities[1].id}`,
          target: `support-${supportingEntities[2].id}`,
          style: { stroke: '#D85A30', strokeWidth: 1, strokeDasharray: '4 3' },
          type: 'smoothstep',
        })
      }

      // Pickup Slot to Site
      if (coreEntities.length > 2 && supportingEntities.length > 3) {
        edges.push({
          id: 'e-slot-to-site',
          source: `entity-${coreEntities[2].id}`,
          target: `support-${supportingEntities[3].id}`,
          style: { stroke: '#888780', strokeWidth: 1, strokeDasharray: '4 3' },
          type: 'smoothstep',
        })
      }
    }

    yOffset = supportStartY + sectionGap

    // KEY JOURNEYS
    addSection('KEY JOURNEYS')
    const journeyStartY = yOffset
    const journeys = model.journeys?.slice(0, 6) || []
    journeys.forEach((journey, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      nodes.push({
        id: `journey-${journey.id}`,
        type: 'journey',
        position: { x: xPadding + col * 240, y: journeyStartY + row * 110 },
        data: {
          label: journey.name,
          description: journey.success_outcome?.substring(0, 40) || '',
        },
      })
    })
    const journeyRows = Math.ceil(journeys.length / 3)
    yOffset = journeyStartY + journeyRows * 110 + 40

    // BUSINESS RULES
    addSection('BUSINESS RULES (selected)')
    const ruleStartY = yOffset
    const rules = model.businessRules?.slice(0, 6) || []
    rules.forEach((rule, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      nodes.push({
        id: `rule-${rule.id}`,
        type: 'rule',
        position: { x: xPadding + col * 220, y: ruleStartY + row * 110 },
        data: {
          label: rule.id,
          description: rule.description?.substring(0, 40) || '',
        },
      })
    })

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
