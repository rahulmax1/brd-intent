'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { ENTITY_COLOR } from './explorer-types'

// 3d-force-graph is a browser-only library — dynamic import
type ForceGraph3DInstance = {
  graphData: (data: { nodes: GraphNode[]; links: GraphLink[] }) => ForceGraph3DInstance
  nodeColor: (fn: (node: GraphNode) => string) => ForceGraph3DInstance
  nodeLabel: (fn: (node: GraphNode) => string) => ForceGraph3DInstance
  nodeVal: (fn: (node: GraphNode) => number) => ForceGraph3DInstance
  nodeThreeObject?: (fn: (node: GraphNode) => unknown) => ForceGraph3DInstance
  linkColor: (fn: (link: GraphLink) => string) => ForceGraph3DInstance
  linkWidth: (fn: (link: GraphLink) => number) => ForceGraph3DInstance
  linkOpacity: (val: number) => ForceGraph3DInstance
  linkDirectionalParticles: (val: number) => ForceGraph3DInstance
  linkDirectionalParticleSpeed: (val: number) => ForceGraph3DInstance
  backgroundColor: (val: string) => ForceGraph3DInstance
  width: (val: number) => ForceGraph3DInstance
  height: (val: number) => ForceGraph3DInstance
  onNodeClick: (fn: (node: GraphNode) => void) => ForceGraph3DInstance
  onNodeHover: (fn: (node: GraphNode | null) => void) => ForceGraph3DInstance
  d3Force: (name: string, force?: unknown) => unknown
  _destructor?: () => void
}

type GraphNode = {
  id: string
  name: string
  type: SectionType | 'entity'
  description: string
  group: string
  val: number
  x?: number
  y?: number
  z?: number
}

type GraphLink = {
  source: string
  target: string
  type: 'entity-entity' | 'rule-entity' | 'journey-actor' | 'actor-entity' | 'constraint-entity' | 'question-entity'
}

const TYPE_COLORS: Record<string, string> = {
  entity: ENTITY_COLOR,
  actor: '#8B5CF6',
  journey: '#10B981',
  business_rule: '#F59E0B',
  constraint: '#EF4444',
  open_question: '#EC4899',
}

const TYPE_LABELS: Record<string, string> = {
  entity: 'Entity',
  actor: 'Actor',
  journey: 'Journey',
  business_rule: 'Rule',
  constraint: 'Constraint',
  open_question: 'Question',
}

// --- Lucide icon SVG content (from lucide-react v0.577.0) ---

const ICON_SVG: Record<string, string> = {
  database: [
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>',
    '<path d="M3 5V19A9 3 0 0 0 21 19V5"/>',
    '<path d="M3 12A9 3 0 0 0 21 12"/>',
  ].join(''),
  user: [
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>',
    '<circle cx="12" cy="7" r="4"/>',
  ].join(''),
  route: [
    '<circle cx="6" cy="19" r="3"/>',
    '<path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
    '<circle cx="18" cy="5" r="3"/>',
  ].join(''),
  scale: [
    '<path d="M12 3v18"/>',
    '<path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/>',
    '<path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/>',
    '<path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/>',
    '<path d="M7 21h10"/>',
  ].join(''),
  shieldAlert: [
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    '<path d="M12 8v4"/>',
    '<path d="M12 16h.01"/>',
  ].join(''),
  circleHelp: [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>',
    '<path d="M12 17h.01"/>',
  ].join(''),
}

const TYPE_ICONS: Record<string, string> = {
  entity: 'database',
  actor: 'user',
  journey: 'route',
  business_rule: 'scale',
  constraint: 'shieldAlert',
  open_question: 'circleHelp',
}

// --- Icon texture helpers ---

// Darker shades of each type color for the icon stroke
const TYPE_ICON_COLORS: Record<string, string> = {
  entity: '#004A99',
  actor: '#5B21B6',
  journey: '#065F46',
  business_rule: '#92400E',
  constraint: '#991B1B',
  open_question: '#9D174D',
}

function buildIconSvg(iconContent: string, strokeColor: string): string {
  const s = 256
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <svg x="28" y="28" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${iconContent}
    </svg>
  </svg>`
}

function loadSvgTexture(
  THREE: typeof import('three'),
  svgMarkup: string,
): Promise<import('three').CanvasTexture> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      canvas.getContext('2d')!.drawImage(img, 0, 0, 256, 256)
      resolve(new THREE.CanvasTexture(canvas))
    }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
  })
}

async function loadAllIconTextures(THREE: typeof import('three')): Promise<Map<string, import('three').CanvasTexture>> {
  const cache = new Map<string, import('three').CanvasTexture>()

  // Map icon key back to its type to get the dark color
  const iconToType: Record<string, string> = {}
  for (const [type, iconKey] of Object.entries(TYPE_ICONS)) {
    iconToType[iconKey] = type
  }

  await Promise.all(
    Object.entries(ICON_SVG).map(([key, svg]) => {
      const type = iconToType[key] ?? 'entity'
      const darkColor = TYPE_ICON_COLORS[type] ?? '#333'
      return loadSvgTexture(THREE, buildIconSvg(svg, darkColor)).then(tex => cache.set(key, tex))
    }),
  )
  return cache
}

function buildGraphData(model: IntentModel): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  // Entities
  for (const e of model.entities) {
    nodes.push({
      id: `entity:${e.id}`,
      name: e.name,
      type: 'entity',
      description: e.description.slice(0, 150),
      group: 'entity',
      val: 8 + (e.key_fields?.length ?? 0),
    })
  }

  // Actors
  for (const a of model.actors) {
    nodes.push({
      id: `actor:${a.id}`,
      name: a.name,
      type: 'actor',
      description: a.description.slice(0, 150),
      group: 'actor',
      val: 6 + (a.responsibilities?.length ?? 0),
    })
  }

  // Journeys
  for (const j of model.journeys) {
    nodes.push({
      id: `journey:${j.id}`,
      name: j.name,
      type: 'journey',
      description: `${j.steps?.length ?? 0} steps — ${(j.success_outcome ?? '').slice(0, 100)}`,
      group: 'journey',
      val: 4 + (j.steps?.length ?? 0),
    })

    // Journey → primary actor
    const actorNodeId = j.primary_actor ? `actor:${j.primary_actor}` : ''
    if (actorNodeId && nodes.some(n => n.id === actorNodeId)) {
      links.push({ source: `journey:${j.id}`, target: actorNodeId, type: 'journey-actor' })
    }
  }

  // Business rules
  for (const r of model.businessRules) {
    nodes.push({
      id: `rule:${r.id}`,
      name: r.id,
      type: 'business_rule',
      description: r.description.slice(0, 150),
      group: 'business_rule',
      val: 8,
    })

    // Rule → applies_to entities/actors
    for (const ref of r.applies_to ?? []) {
      const entityId = `entity:${ref}`
      const actorId = `actor:${ref}`
      if (nodes.some(n => n.id === entityId)) {
        links.push({ source: `rule:${r.id}`, target: entityId, type: 'rule-entity' })
      } else if (nodes.some(n => n.id === actorId)) {
        links.push({ source: `rule:${r.id}`, target: actorId, type: 'rule-entity' })
      }
    }
  }

  // Constraints — link to entities mentioned in constraint text
  for (const c of model.constraints ?? []) {
    nodes.push({
      id: `constraint:${c.id}`,
      name: c.id,
      type: 'constraint',
      description: (c.constraint ?? '').slice(0, 150),
      group: 'constraint',
      val: 10,
    })

    for (const e of model.entities) {
      const names = [e.id, e.name.toLowerCase()]
      const abbr = e.name.match(/\(([A-Z][A-Z0-9]+)\)/)
      if (abbr) names.push(abbr[1].toLowerCase())
      if (names.some(n => (c.constraint ?? '').toLowerCase().includes(n))) {
        links.push({ source: `constraint:${c.id}`, target: `entity:${e.id}`, type: 'constraint-entity' })
      }
    }
  }

  // Open questions — link to entities mentioned in question text
  for (const q of model.openQuestions ?? []) {
    nodes.push({
      id: `question:${q.id}`,
      name: q.id,
      type: 'open_question',
      description: (q.question ?? '').slice(0, 150),
      group: 'open_question',
      val: 10,
    })

    for (const e of model.entities) {
      const names = [e.id, e.name.toLowerCase()]
      const abbr = e.name.match(/\(([A-Z][A-Z0-9]+)\)/)
      if (abbr) names.push(abbr[1].toLowerCase())
      if (names.some(n => (q.question ?? '').toLowerCase().includes(n) || (q.reason ?? '').toLowerCase().includes(n))) {
        links.push({ source: `question:${q.id}`, target: `entity:${e.id}`, type: 'question-entity' })
      }
    }
  }

  // Entity-to-entity edges (from field references)
  for (const entity of model.entities) {
    for (const other of model.entities) {
      if (entity.id === other.id) continue
      const otherNames = [other.id, other.name.toLowerCase()]
      const abbr = other.name.match(/\(([A-Z][A-Z0-9]+)\)/)
      if (abbr) otherNames.push(abbr[1].toLowerCase())

      const hasRef = (entity.key_fields ?? []).some(f => {
        const text = `${f.type} ${f.description}`.toLowerCase()
        return otherNames.some(n => text.includes(n))
      })

      if (hasRef) {
        const key = [entity.id, other.id].sort().join('--')
        if (!links.some(l => {
          const src = typeof l.source === 'string' ? l.source : ''
          const tgt = typeof l.target === 'string' ? l.target : ''
          return [src.replace('entity:', ''), tgt.replace('entity:', '')].sort().join('--') === key
        })) {
          links.push({ source: `entity:${entity.id}`, target: `entity:${other.id}`, type: 'entity-entity' })
        }
      }
    }
  }

  return { nodes, links }
}

const ALL_TYPES = Object.keys(TYPE_COLORS) as Array<keyof typeof TYPE_COLORS>

export function Graph3D({ model }: { model: IntentModel }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraph3DInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const fullGraphData = useRef(buildGraphData(model))

  const toggleType = useCallback((type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const toggleNode = useCallback((nodeId: string) => {
    setHiddenNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  // Update graph data when filters change
  useEffect(() => {
    if (!graphRef.current) return
    const { nodes, links } = fullGraphData.current
    const visibleNodes = nodes.filter(n => !hiddenTypes.has(n.type) && !hiddenNodes.has(n.id))
    const visibleIds = new Set(visibleNodes.map(n => n.id))
    const visibleLinks = links.filter(l => {
      const src = typeof l.source === 'string' ? l.source : (l.source as unknown as GraphNode)?.id
      const tgt = typeof l.target === 'string' ? l.target : (l.target as unknown as GraphNode)?.id
      return visibleIds.has(src) && visibleIds.has(tgt)
    })
    graphRef.current.graphData({ nodes: visibleNodes, links: visibleLinks })
  }, [hiddenTypes, hiddenNodes])

  useEffect(() => {
    if (!containerRef.current) return

    let destroyed = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('3d-force-graph').then(async (mod: any) => {
      if (destroyed || !containerRef.current) return

      const ForceGraph3D = mod.default || mod
      const { nodes, links } = buildGraphData(model)

       
      const THREE = await import('three')

      // Load icon textures
      const textures = await loadAllIconTextures(THREE)
      if (destroyed || !containerRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph: any = ForceGraph3D()(containerRef.current)
      graph.graphData({ nodes, links })
        .backgroundColor('#F8F8F7')
        .nodeLabel((node: GraphNode) => `
          <div style="background:rgba(0,0,0,0.9);color:white;padding:10px 14px;border-radius:10px;font-family:DM Sans Variable,sans-serif;max-width:280px;font-size:12px;line-height:1.5;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.3)">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;margin-bottom:2px">${TYPE_LABELS[node.type] ?? node.type}</div>
            <div style="font-weight:600;margin-bottom:4px">${node.name}</div>
            <div style="opacity:0.8">${node.description}</div>
          </div>
        `)
        .nodeVal((node: GraphNode) => node.val)
        .nodeThreeObject((node: GraphNode) => {
          const color = TYPE_COLORS[node.type] ?? '#888'
          const group = new THREE.Group()

          // Translucent sphere
          const radius = 4 + Math.min(node.val, 15) * 0.3
          const geometry = new THREE.SphereGeometry(radius, 24, 16)
          const material = new THREE.MeshPhongMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            shininess: 60,
            depthWrite: false,
          })
          group.add(new THREE.Mesh(geometry, material))

          // Icon sprite inside the sphere — solid, no transparency
          const iconKey = TYPE_ICONS[node.type]
          const iconTex = iconKey ? textures.get(iconKey) : undefined
          if (iconTex) {
            const iconMat = new THREE.SpriteMaterial({ map: iconTex, transparent: true, depthWrite: true })
            const iconSprite = new THREE.Sprite(iconMat)
            const iconSize = radius * 1.1
            iconSprite.scale.set(iconSize, iconSize, 1)
            group.add(iconSprite)
          }

          // Text label above sphere
          const scale = 2
          const canvasW = 512 * scale
          const canvasH = 96 * scale
          const fontSize = 24 * scale
          const lineHeight = 30 * scale
          const maxWidth = 480 * scale
          const maxLines = 3

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          canvas.width = canvasW
          canvas.height = canvasH
          ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.fillStyle = '#34322D'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'

          const words = node.name.split(' ')
          const lines: string[] = []
          let currentLine = ''

          for (const word of words) {
            const test = currentLine ? `${currentLine} ${word}` : word
            if (ctx.measureText(test).width > maxWidth && currentLine) {
              lines.push(currentLine)
              currentLine = word
              if (lines.length >= maxLines) break
            } else {
              currentLine = test
            }
          }
          if (currentLine && lines.length < maxLines) {
            lines.push(currentLine)
          } else if (lines.length >= maxLines) {
            lines[maxLines - 1] = lines[maxLines - 1] + '\u2026'
          }

          const totalHeight = lines.length * lineHeight
          const startY = (canvasH - totalHeight) / 2
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], canvasW / 2, startY + i * lineHeight)
          }

          const texture = new THREE.CanvasTexture(canvas)
          texture.needsUpdate = true
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
          const sprite = new THREE.Sprite(spriteMat)
          const spriteW = 28
          const spriteH = spriteW * (canvasH / canvasW)
          sprite.scale.set(spriteW, spriteH, 1)
          sprite.position.set(0, radius + 2 + spriteH / 2, 0)
          group.add(sprite)

          return group
        })
        .nodeThreeObjectExtend(false)
        .linkColor((link: GraphLink) => {
          if (link.type === 'entity-entity') return '#9CA3AF'
          if (link.type === 'rule-entity') return '#F59E0B66'
          if (link.type === 'journey-actor') return '#10B98166'
          if (link.type === 'constraint-entity') return '#EF444466'
          if (link.type === 'question-entity') return '#EC489966'
          return '#85848144'
        })
        .linkWidth((link: GraphLink) => link.type === 'entity-entity' ? 2 : 1)
        .linkOpacity(0.4)
        .linkDirectionalParticles(0)
        .linkDirectionalParticleWidth(3)
        .linkDirectionalParticleSpeed(0.008)
        .linkDirectionalParticleColor((link: GraphLink) => {
          if (link.type === 'entity-entity') return '#0081F2'
          if (link.type === 'rule-entity') return '#F59E0B'
          if (link.type === 'journey-actor') return '#10B981'
          if (link.type === 'constraint-entity') return '#EF4444'
          if (link.type === 'question-entity') return '#EC4899'
          return '#858481'
        })
        .onNodeClick((node: GraphNode) => {
          handleNodeClick(node)

          // Send 1 particle per direct edge from the clicked node only
          // No cascading — particles show only the clicked node's connections
          const graphData = graph.graphData()
          const allLinks = graphData.links

          const getNodeId = (n: unknown) =>
            typeof n === 'string' ? n : (n as GraphNode)?.id ?? ''

          // Find all links connected to this node
          const directLinks = allLinks.filter((link: GraphLink) => {
            const src = getNodeId(link.source)
            const tgt = getNodeId(link.target)
            return src === node.id || tgt === node.id
          })

          // Emit 1 particle per direct connection, staggered
          for (let i = 0; i < directLinks.length; i++) {
            setTimeout(() => {
              graph.emitParticle(directLinks[i])
            }, i * 80)
          }
        })

      // Tighter forces — bring nodes closer, strong center pull for orphans
      const charge = graph.d3Force('charge')
      if (charge?.strength) charge.strength(-60)
      const linkForce = graph.d3Force('link')
      if (linkForce?.distance) linkForce.distance(25)
      const center = graph.d3Force('center')
      if (center?.strength) center.strength(2)

      // Pre-compute entire layout before first render — no live animation
      graph.warmupTicks(300)
      graph.cooldownTicks(0)
      graph.d3VelocityDecay(0.8)

      // Fix tooltip container — library adds .graph-tooltip with its own bg
      const style = document.createElement('style')
      style.textContent = '.graph-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }'
      containerRef.current.appendChild(style)

      const rect = containerRef.current.getBoundingClientRect()
      graph.width(rect.width).height(rect.height)

      graphRef.current = graph

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          graph.width(entry.contentRect.width).height(entry.contentRect.height)
        }
      })
      resizeObserver.observe(containerRef.current)

      return () => {
        resizeObserver.disconnect()
      }
    })

    return () => {
      destroyed = true
      if (graphRef.current?._destructor) {
        graphRef.current._destructor()
      }
      graphRef.current = null
    }
  }, [model, handleNodeClick])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Category toggles */}
      <div
        className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl px-3 py-2"
        style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        {ALL_TYPES.map(type => {
          const color = TYPE_COLORS[type]
          const isHidden = hiddenTypes.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200"
              style={{
                opacity: isHidden ? 0.35 : 1,
                background: isHidden ? 'transparent' : `${color}12`,
              }}
              title={`${isHidden ? 'Show' : 'Hide'} ${TYPE_LABELS[type]}s`}
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[11px] font-medium" style={{ color: isHidden ? 'var(--text-muted)' : color }}>
                {TYPE_LABELS[type]}
              </span>
            </button>
          )
        })}
        <div className="mx-1 h-4 w-px" style={{ background: 'var(--border-default)' }} />
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="text-[11px] font-medium px-2 py-1 rounded-lg transition-colors duration-200"
          style={{ color: showFilters ? 'var(--accent-blue)' : 'var(--text-muted)' }}
        >
          {showFilters ? '▾ Nodes' : '▸ Nodes'}
        </button>
      </div>

      {/* Individual node toggles */}
      {showFilters && (
        <div
          className="absolute bottom-16 left-4 rounded-xl overflow-hidden"
          style={{
            width: 260,
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide sticky top-0 z-10" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-white)' }}>
            Toggle individual nodes
          </div>
          <div className="overflow-y-auto custom-scroll" style={{ maxHeight: '80vh' }}>
            {ALL_TYPES.filter(type => !hiddenTypes.has(type)).map(type => {
              const color = TYPE_COLORS[type]
              const nodesOfType = fullGraphData.current.nodes.filter(n => n.type === type)
              if (nodesOfType.length === 0) return null
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color, background: `${color}08` }}>
                    {TYPE_LABELS[type]}s
                  </div>
                  {nodesOfType.map(node => {
                    const isHidden = hiddenNodes.has(node.id)
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => toggleNode(node.id)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left transition-all duration-150 hover:bg-[var(--bg-gray-subtle)]"
                        style={{ opacity: isHidden ? 0.4 : 1 }}
                      >
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: isHidden ? 'var(--text-muted)' : color }}
                        />
                        <span className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {node.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected node detail */}
      {selectedNode && (
        <div
          className="absolute top-4 right-4 rounded-xl p-4"
          style={{
            width: 340,
            background: 'var(--bg-white)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
              style={{ background: `${TYPE_COLORS[selectedNode.type]}18`, color: TYPE_COLORS[selectedNode.type] }}
            >
              {TYPE_LABELS[selectedNode.type]}
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="ml-auto text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
          <h3 className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
            {selectedNode.name}
          </h3>
          <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
            {selectedNode.description}
          </p>
        </div>
      )}
    </div>
  )
}
