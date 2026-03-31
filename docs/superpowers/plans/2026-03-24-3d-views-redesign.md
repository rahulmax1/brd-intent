# 3D Views Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three tech-demo 3D views with four polished, frosted-glass-card views (Galaxy, Flows, Anatomy, Domains) using React Three Fiber + Drei.

**Architecture:** Each view is a React component that receives `IntentModel` as a prop, transforms it into view-specific data structures, then renders canvas-textured billboarded planes in a shared R3F scene. Shared components (glass card, connection line, scene wrapper) live in `views-3d/shared/`. The four views replace the current `3d` tab's sub-views in `explorer-tabs.tsx`.

**Tech Stack:** React Three Fiber, Drei, d3-force-3d, @react-three/postprocessing, Three.js

**Spec:** `docs/superpowers/specs/2026-03-24-3d-views-redesign-design.md`

---

## File Structure

```
src/components/explorer/views-3d/
  shared/
    glass-card.tsx          — canvas-textured billboarded plane, type-colored edge strip
    glass-platform.tsx      — tilted plane with multi-row content (Domains only)
    connection-line.tsx     — curved bezier line with color/animation/visibility props
    scene-wrapper.tsx       — R3F Canvas, lighting, OrbitControls, SSAO, fog, on-demand rendering
    card-texture.ts         — offscreen canvas renderer (icon + text + stat → CanvasTexture)
    types.ts                — shared types (CardNode, ConnectionEdge, ViewProps, etc.)
    constants.ts            — colors, sizes, animation durations
  galaxy/
    galaxy-view.tsx         — Galaxy view component
    galaxy-data.ts          — IntentModel → GalaxyNode[] + GalaxyEdge[]
  flows/
    flows-view.tsx          — Flows view component
    flows-data.ts           — IntentModel + Journey → FlowStep[] + BranchCard[]
    journey-selector.tsx    — glass sidebar listing journeys
  anatomy/
    anatomy-view.tsx        — Anatomy view component
    anatomy-data.ts         — IntentModel + Entity → AnatomyLayout (main panel, rail, orbiting cards)
    entity-selector.tsx     — glass sidebar listing entities
  domains/
    domains-view.tsx        — Domains view component
    domains-data.ts         — IntentModel → DomainPlatform[] + floating entities + threads
```

**Modified files:**
- `src/components/explorer/explorer-tabs.tsx` — replace 3D sub-tabs
- `package.json` — add R3F/Drei/postprocessing/d3-force-3d, remove 3d-force-graph

**Removed files:**
- `src/components/explorer/graph-3d.tsx`
- `src/components/explorer/graph-3d-lifecycle.tsx`
- `src/components/explorer/graph-3d-actors.tsx`

---

## Task 1: Dependencies & project setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new dependencies**

```bash
pnpm add @react-three/fiber @react-three/drei @react-three/postprocessing d3-force-3d
```

Note: `@types/d3-force-3d` does not exist on npm. We add a declaration file in Task 2.

- [ ] **Step 2: Remove old dependency**

```bash
pnpm remove 3d-force-graph
```

- [ ] **Step 3: Copy DM Sans font to public directory**

```bash
mkdir -p public/fonts
```

Then copy `DM_Sans/DMSans-Variable.ttf` (or download from Google Fonts) into `public/fonts/DMSans-Variable.ttf`. This is needed for Drei `<Text>` cluster labels.

- [ ] **Step 4: Verify build still works**

```bash
pnpm lint && npx tsc --noEmit
```

Expected: lint warnings (pre-existing), no new errors. The old 3D components still import `3d-force-graph` dynamically so they may show import errors — that's fine, they'll be removed in Task 9.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml public/fonts/
git commit -m "chore: add R3F/Drei/postprocessing deps, remove 3d-force-graph, add DM Sans font"
```

---

## Task 2: Shared types & constants

**Files:**
- Create: `src/components/explorer/views-3d/shared/types.ts`
- Create: `src/components/explorer/views-3d/shared/constants.ts`
- Create: `src/components/explorer/views-3d/shared/d3-force-3d.d.ts`

- [ ] **Step 1: Create d3-force-3d type declarations**

```typescript
// d3-force-3d.d.ts
declare module 'd3-force-3d' {
  export function forceSimulation(nodes?: any[], numDimensions?: number): any
  export function forceManyBody(): any
  export function forceLink(links?: any[]): any
  export function forceCenter(x?: number, y?: number, z?: number): any
  export function forceRadial(radius: number, x?: number, y?: number, z?: number): any
}
```

- [ ] **Step 2: Create types**

```typescript
// types.ts
import type { IntentModel } from '@/domain/intent-model/types'

export type ItemType = 'entity' | 'actor' | 'journey' | 'rule' | 'constraint' | 'question'

export type CardSize = 'large' | 'medium' | 'small'

export type CardNode = {
  id: string
  name: string
  type: ItemType
  stat: string            // e.g. "6 fields · 5 states"
  icon: string            // lucide icon name
  size: CardSize
  position: [number, number, number]
  deferred?: boolean
}

export type ConnectionEdge = {
  id: string
  from: string            // CardNode id
  to: string              // CardNode id
  color?: string          // override default gray
  visible?: boolean       // Galaxy hides by default
  animated?: boolean
  thickness?: number
}

export type ViewProps = {
  model: IntentModel
}
```

- [ ] **Step 2: Create constants**

```typescript
// constants.ts
export const TYPE_COLORS: Record<string, string> = {
  entity: '#0081F2',
  actor: '#8B5CF6',
  journey: '#10B981',
  rule: '#F59E0B',
  constraint: '#EF4444',
  question: '#EC4899',
}

export const CARD_SIZES = {
  large:  { width: 8, height: 6 },
  medium: { width: 4, height: 3 },
  small:  { width: 2.5, height: 2 },
} as const

export const CANVAS_BG = '#F8F8F7'
export const FOG_COLOR = '#F0F0EE'
export const CONNECTION_DEFAULT_COLOR = '#D4D4D4'
export const CARD_OPACITY = 0.8
export const DEFERRED_OPACITY = 0.5

export const ANIMATION = {
  hoverScale: 1.05,
  transitionMs: 300,
  staggerMs: 80,
  stepThroughMs: 2000,
  particleSpeed: 0.008,
  orbitSpeed: 0.001,
} as const

export const ICON_MAP: Record<string, string> = {
  entity: 'database',
  actor: 'user',
  journey: 'route',
  rule: 'scale',
  constraint: 'shield-alert',
  question: 'circle-help',
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add shared types and constants for glass card system"
```

---

## Task 3: Card texture renderer

**Files:**
- Create: `src/components/explorer/views-3d/shared/card-texture.ts`

This is the core rendering engine — draws card content to an offscreen canvas, returns a Three.js `CanvasTexture`.

- [ ] **Step 1: Create card-texture.ts**

```typescript
// card-texture.ts
import { CanvasTexture } from 'three'
import { TYPE_COLORS, CARD_SIZES, type CardSize } from './constants'
import type { ItemType } from './types'

const TEXTURE_SCALE = 2  // 2x for retina
const FONT = '500 {{size}}px "DM Sans", sans-serif'
const EDGE_STRIP_WIDTH = 8  // 4px * TEXTURE_SCALE

// Lucide icon SVG paths — same set used by existing 3D views
const ICON_SVGS: Record<string, string> = {
  database: '<path d="M4 6c0-1.1 3.6-2 8-2s8 .9 8 2v12c0 1.1-3.6 2-8 2s-8-.9-8-2V6z"/><ellipse cx="12" cy="6" rx="8" ry="2"/><path d="M4 6v6c0 1.1 3.6 2 8 2s8-.9 8-2V6"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'circle-help': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
}

type CardTextureOptions = {
  name: string
  type: ItemType
  stat: string
  icon: string
  size: CardSize
  deferred?: boolean
}

export function createCardTexture(opts: CardTextureOptions): CanvasTexture {
  const dim = CARD_SIZES[opts.size]
  const w = dim.width * 40 * TEXTURE_SCALE
  const h = dim.height * 40 * TEXTURE_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const opacity = opts.deferred ? 0.5 : 0.8
  const color = TYPE_COLORS[opts.type] || '#999'

  // Background — frosted white
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
  roundRect(ctx, 0, 0, w, h, 16 * TEXTURE_SCALE)
  ctx.fill()

  // Border
  ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`
  ctx.lineWidth = 2
  roundRect(ctx, 0, 0, w, h, 16 * TEXTURE_SCALE)
  ctx.stroke()

  // Left edge strip
  ctx.fillStyle = color
  if (opts.deferred) {
    // Dashed strip for deferred items
    const stripW = EDGE_STRIP_WIDTH
    const dashH = 12 * TEXTURE_SCALE
    const gapH = 6 * TEXTURE_SCALE
    for (let y = 16 * TEXTURE_SCALE; y < h - 16 * TEXTURE_SCALE; y += dashH + gapH) {
      const segH = Math.min(dashH, h - 16 * TEXTURE_SCALE - y)
      ctx.fillRect(0, y, stripW, segH)
    }
  } else {
    roundRectLeft(ctx, 0, 0, EDGE_STRIP_WIDTH, h, 16 * TEXTURE_SCALE)
    ctx.fill()
  }

  // Icon
  const iconSize = opts.size === 'small' ? 18 : 24
  const iconX = EDGE_STRIP_WIDTH + 12 * TEXTURE_SCALE
  const iconY = 14 * TEXTURE_SCALE
  drawIcon(ctx, opts.icon, iconX, iconY, iconSize * TEXTURE_SCALE, color)

  // Name
  const nameSize = opts.size === 'small' ? 12 : 14
  ctx.fillStyle = '#34322D'
  ctx.font = FONT.replace('{{size}}', String(nameSize * TEXTURE_SCALE))
  const nameX = iconX + iconSize * TEXTURE_SCALE + 8 * TEXTURE_SCALE
  const nameY = iconY + iconSize * TEXTURE_SCALE * 0.75
  const maxNameW = w - nameX - 12 * TEXTURE_SCALE
  ctx.fillText(truncate(opts.name, ctx, maxNameW), nameX, nameY)

  // Stat
  if (opts.stat) {
    const statSize = opts.size === 'small' ? 10 : 11
    ctx.fillStyle = '#858481'
    ctx.font = FONT.replace('{{size}}', String(statSize * TEXTURE_SCALE))
    const statY = nameY + (nameSize + 6) * TEXTURE_SCALE
    ctx.fillText(truncate(opts.stat, ctx, maxNameW), nameX, statY)
  }

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectLeft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Pre-rendered icon bitmaps — loaded once at module init, used sync after
const iconBitmapCache = new Map<string, ImageBitmap>()
let iconsReady = false

export async function preloadIcons(): Promise<void> {
  if (iconsReady) return
  const entries = Object.entries(ICON_SVGS)
  await Promise.all(entries.map(async ([key, paths]) => {
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const bitmap = await createImageBitmap(blob)
    iconBitmapCache.set(key, bitmap)
  }))
  iconsReady = true
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number, _color: string) {
  const bitmap = iconBitmapCache.get(icon)
  if (!bitmap) return
  ctx.drawImage(bitmap, x, y, size, size)
}

function truncate(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) t = t.slice(0, -1)
  return t + '...'
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep views-3d
```

Expected: no errors from new files.

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add offscreen canvas card texture renderer"
```

---

## Task 4: Scene wrapper

**Files:**
- Create: `src/components/explorer/views-3d/shared/scene-wrapper.tsx`

- [ ] **Step 1: Create scene-wrapper.tsx**

```typescript
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { CANVAS_BG, FOG_COLOR } from './constants'

type SceneWrapperProps = {
  children: React.ReactNode
  orbitEnabled?: boolean
  autoRotate?: boolean
}

export function SceneWrapper({ children, orbitEnabled = true, autoRotate = false }: SceneWrapperProps) {
  return (
    <div className="w-full h-full" style={{ background: CANVAS_BG }}>
      <Canvas
        gl={{ powerPreference: 'high-performance', alpha: false, antialias: true }}
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
        camera={{ position: [0, 8, 20], fov: 50, near: 0.1, far: 200 }}
        frameloop="demand"
      >
        <color attach="background" args={[CANVAS_BG]} />
        <fog attach="fog" args={[FOG_COLOR, 40, 100]} />

        {/* Lighting — soft ambient + upper-left directional */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[-5, 8, 5]} intensity={0.5} castShadow={false} />

        {/* Subtle environment map for glass reflections */}
        <Environment preset="city" environmentIntensity={0.15} />

        {children}

        <OrbitControls
          enabled={orbitEnabled}
          autoRotate={autoRotate}
          autoRotateSpeed={0.3}
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={80}
          makeDefault
        />

        <EffectComposer>
          <SSAO
            radius={0.4}
            intensity={15}
            luminanceInfluence={0.6}
            color="#000000"
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep scene-wrapper
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add R3F scene wrapper with lighting, fog, SSAO"
```

---

## Task 5: Glass card component

**Files:**
- Create: `src/components/explorer/views-3d/shared/glass-card.tsx`

- [ ] **Step 1: Create glass-card.tsx**

```typescript
'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createCardTexture } from './card-texture'
import { CARD_SIZES, TYPE_COLORS, ANIMATION, CARD_OPACITY, DEFERRED_OPACITY } from './constants'
import type { CardNode } from './types'

type GlassCardProps = {
  node: CardNode
  selected?: boolean
  faded?: boolean
  onClick?: (id: string) => void
  onDoubleClick?: (id: string) => void
  onHover?: (id: string | null) => void
}

export function GlassCard({ node, selected, faded, onClick, onDoubleClick, onHover }: GlassCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const invalidate = useThree(s => s.invalidate)

  const dim = CARD_SIZES[node.size]
  const color = TYPE_COLORS[node.type] || '#999'

  const texture = useMemo(
    () => createCardTexture({
      name: node.name,
      type: node.type,
      stat: node.stat,
      icon: node.icon || 'database',
      size: node.size,
      deferred: node.deferred,
    }),
    [node.name, node.type, node.stat, node.icon, node.size, node.deferred]
  )

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: node.deferred ? DEFERRED_OPACITY : CARD_OPACITY,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.05,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.05,
    })
    return mat
  }, [texture, node.deferred])

  // Animate scale on hover
  useFrame(() => {
    if (!meshRef.current) return
    const targetScale = hovered ? ANIMATION.hoverScale : 1.0
    const currentScale = meshRef.current.scale.x
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15)
    if (Math.abs(newScale - currentScale) > 0.001) {
      meshRef.current.scale.setScalar(newScale)
      invalidate()
    }

    // Fade when not selected
    const targetOpacity = faded ? 0.4 : (node.deferred ? DEFERRED_OPACITY : CARD_OPACITY)
    if (Math.abs(material.opacity - targetOpacity) > 0.01) {
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1)
      invalidate()
    }
  })

  const handlePointerOver = useCallback(() => {
    setHovered(true)
    onHover?.(node.id)
    document.body.style.cursor = 'pointer'
    invalidate()
  }, [node.id, onHover, invalidate])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    onHover?.(null)
    document.body.style.cursor = 'auto'
    invalidate()
  }, [onHover, invalidate])

  return (
    <Billboard position={node.position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh
        ref={meshRef}
        material={material}
        onClick={(e) => { e.stopPropagation(); onClick?.(node.id) }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(node.id) }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[dim.width, dim.height]} />
      </mesh>

      {/* Selection glow ring */}
      {selected && (
        <mesh>
          <planeGeometry args={[dim.width + 0.3, dim.height + 0.3]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </Billboard>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep glass-card
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add glass card component with hover/select/fade states"
```

---

## Task 6: Connection line component

**Files:**
- Create: `src/components/explorer/views-3d/shared/connection-line.tsx`

- [ ] **Step 1: Create connection-line.tsx**

```typescript
'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { CONNECTION_DEFAULT_COLOR } from './constants'

type ConnectionLineProps = {
  from: [number, number, number]
  to: [number, number, number]
  color?: string
  visible?: boolean
  animated?: boolean
  thickness?: number
  opacity?: number
}

export function ConnectionLine({
  from,
  to,
  color = CONNECTION_DEFAULT_COLOR,
  visible = true,
  animated = false,
  thickness = 1,
  opacity = 0.6,
}: ConnectionLineProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const invalidate = useThree(s => s.invalidate)
  const progressRef = useRef([0, 0.33, 0.66])

  const curve = useMemo(() => {
    const mid: [number, number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.5,
      (from[2] + to[2]) / 2,
    ]
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    )
  }, [from, to])

  // Points for Drei <Line> — supports actual lineWidth via MeshLine
  const linePoints = useMemo(() => curve.getPoints(32), [curve])

  // Animate particles along the curve
  useFrame(() => {
    if (!animated || !particlesRef.current || !visible) return
    const positions = particlesRef.current.geometry.attributes.position
    for (let i = 0; i < 3; i++) {
      progressRef.current[i] = (progressRef.current[i] + 0.008) % 1
      const pt = curve.getPoint(progressRef.current[i])
      positions.setXYZ(i, pt.x, pt.y, pt.z)
    }
    positions.needsUpdate = true
    invalidate()
  })

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(9) // 3 particles × 3 coords
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  if (!visible) return null

  return (
    <group>
      {/* Drei <Line> uses MeshLine — supports actual variable lineWidth unlike WebGL */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={thickness}
        transparent
        opacity={opacity}
      />

      {animated && (
        <points ref={particlesRef} geometry={particleGeometry}>
          <pointsMaterial color={color} size={0.15} transparent opacity={0.8} />
        </points>
      )}
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add bezier connection line with particle animation"
```

---

## Task 7: Galaxy data transformer

**Files:**
- Create: `src/components/explorer/views-3d/galaxy/galaxy-data.ts`

- [ ] **Step 1: Create galaxy-data.ts**

This transforms `IntentModel` into nodes and edges for the Galaxy view, then runs a seeded d3-force-3d simulation to compute positions.

```typescript
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceRadial,
} from 'd3-force-3d'
import type { IntentModel } from '@/domain/intent-model/types'
import type { CardNode, ConnectionEdge, ItemType } from '../shared/types'
import { ICON_MAP } from '../shared/constants'

type SimNode = CardNode & { fx?: number; fy?: number; fz?: number; x: number; y: number; z: number }

// Zone centers for type clustering
const ZONE_CENTERS: Record<ItemType, [number, number, number]> = {
  entity:     [0, 0, 0],
  actor:      [-12, 6, -4],
  journey:    [12, 2, -2],
  rule:       [0, -8, 2],
  constraint: [-10, -6, 6],
  question:   [10, -6, 6],
}

// Deterministic seed from model content
function hashSeed(model: IntentModel): number {
  const str = `${model.meta.version}-${model.actors.length}-${model.entities.length}-${model.journeys.length}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Simple seeded random
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export type GalaxyData = {
  nodes: CardNode[]
  edges: ConnectionEdge[]
}

export function buildGalaxyData(model: IntentModel): GalaxyData {
  const nodes: SimNode[] = []
  const edges: ConnectionEdge[] = []

  // --- Build nodes ---
  for (const e of model.entities) {
    const isIntegration = e.is_integration
    nodes.push({
      id: e.id,
      name: e.name,
      type: 'entity',
      stat: `${e.key_fields.length} fields · ${e.lifecycle.states.length} states`,
      icon: ICON_MAP.entity,
      size: isIntegration ? 'small' : 'medium',
      deferred: e.deferred,
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  for (const a of model.actors) {
    nodes.push({
      id: a.id,
      name: a.name,
      type: 'actor',
      stat: `${a.responsibilities.length} responsibilities`,
      icon: ICON_MAP.actor,
      size: 'medium',
      deferred: a.deferred,
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  for (const j of model.journeys) {
    nodes.push({
      id: j.id,
      name: j.name,
      type: 'journey',
      stat: `${j.steps.length} steps · ${j.primary_actor}`,
      icon: ICON_MAP.journey,
      size: 'medium',
      deferred: j.deferred,
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  for (const r of model.business_rules) {
    nodes.push({
      id: r.id,
      name: r.description.slice(0, 60),
      type: 'rule',
      stat: `applies to ${r.applies_to.length}`,
      icon: ICON_MAP.rule,
      size: 'small',
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  for (const c of model.constraints) {
    nodes.push({
      id: c.id,
      name: c.constraint.slice(0, 60),
      type: 'constraint',
      stat: c.type,
      icon: ICON_MAP.constraint,
      size: 'small',
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  for (const q of model.open_questions) {
    nodes.push({
      id: q.id,
      name: q.question.slice(0, 60),
      type: 'question',
      stat: q.status,
      icon: ICON_MAP.question,
      size: 'small',
      position: [0, 0, 0],
      x: 0, y: 0, z: 0,
    })
  }

  // --- Build edges (cross-references) ---
  const nodeIds = new Set(nodes.map(n => n.id))

  // Journey → primary actor
  for (const j of model.journeys) {
    const actorNode = nodes.find(n => n.type === 'actor' && model.actors.find(a => a.id === n.id && a.name.toLowerCase().includes(j.primary_actor.toLowerCase())))
    if (actorNode) {
      edges.push({ id: `${j.id}-${actorNode.id}`, from: j.id, to: actorNode.id })
    }
  }

  // Rule → entities (by applies_to text matching)
  for (const r of model.business_rules) {
    for (const e of model.entities) {
      const nameLC = e.name.toLowerCase()
      if (r.applies_to.some(a => a.toLowerCase().includes(nameLC) || nameLC.includes(a.toLowerCase()))) {
        edges.push({ id: `${r.id}-${e.id}`, from: r.id, to: e.id })
      }
    }
  }

  // Entity → entity (field description text matching)
  for (const e of model.entities) {
    for (const f of e.key_fields) {
      for (const other of model.entities) {
        if (other.id === e.id) continue
        if (f.description.toLowerCase().includes(other.name.toLowerCase())) {
          edges.push({ id: `${e.id}-${other.id}-${f.name}`, from: e.id, to: other.id })
        }
      }
    }
  }

  // --- Run force simulation ---
  const seed = hashSeed(model)
  const rand = seededRandom(seed)

  // Initialize positions near zone centers with jitter
  for (const node of nodes) {
    const center = ZONE_CENTERS[node.type]
    node.x = center[0] + (rand() - 0.5) * 6
    node.y = center[1] + (rand() - 0.5) * 6
    node.z = center[2] + (rand() - 0.5) * 6
  }

  const simLinks = edges.map(e => ({ source: e.from, target: e.to }))

  const sim = forceSimulation(nodes, 3)
    .force('charge', forceManyBody().strength(-60))
    .force('link', forceLink(simLinks).id((d: SimNode) => d.id).distance(25))
    .force('center', forceCenter(0, 0, 0).strength(0.05))

  // Per-type radial forces toward zone centers
  for (const type of Object.keys(ZONE_CENTERS) as ItemType[]) {
    const center = ZONE_CENTERS[type]
    sim.force(`radial-${type}`, forceRadial(
      8, center[0], center[1], center[2]
    ).strength((d: SimNode) => d.type === type ? 0.3 : 0))
  }

  sim.tick(300)
  sim.stop()

  // Lock positions
  const finalNodes: CardNode[] = nodes.map(n => ({
    id: n.id,
    name: n.name,
    type: n.type,
    stat: n.stat,
    icon: n.icon,
    size: n.size,
    deferred: n.deferred,
    position: [n.x, n.y, n.z] as [number, number, number],
  }))

  return { nodes: finalNodes, edges }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep galaxy-data
```

Note: `d3-force-3d` types may need adjustment — if `@types/d3-force-3d` doesn't exist, add a `declare module 'd3-force-3d'` in a `.d.ts` file.

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add Galaxy data transformer with seeded d3-force-3d layout"
```

---

## Task 8: Galaxy view component

**Files:**
- Create: `src/components/explorer/views-3d/galaxy/galaxy-view.tsx`

- [ ] **Step 1: Create galaxy-view.tsx**

```typescript
'use client'

import { useMemo, useState, useCallback } from 'react'
import { Text } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { SceneWrapper } from '../shared/scene-wrapper'
import { GlassCard } from '../shared/glass-card'
import { ConnectionLine } from '../shared/connection-line'
import { buildGalaxyData } from './galaxy-data'
import { TYPE_COLORS, ANIMATION } from '../shared/constants'
import type { ViewProps, ItemType } from '../shared/types'

const ZONE_LABELS: { type: ItemType; label: string; position: [number, number, number] }[] = [
  { type: 'entity', label: 'Entities', position: [0, -2, -3] },
  { type: 'actor', label: 'Actors', position: [-12, 3, -7] },
  { type: 'journey', label: 'Journeys', position: [12, -1, -5] },
  { type: 'rule', label: 'Rules', position: [0, -11, -1] },
  { type: 'constraint', label: 'Constraints', position: [-10, -9, 3] },
  { type: 'question', label: 'Questions', position: [10, -9, 3] },
]

export function GalaxyView({ model }: ViewProps) {
  const data = useMemo(() => buildGalaxyData(model), [model])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<ItemType>>(new Set())
  const [presenting, setPresenting] = useState(false)

  const activeId = selectedId || hoveredId

  // Which nodes are connected to the active node
  const connectedIds = useMemo(() => {
    if (!activeId) return new Set<string>()
    const ids = new Set<string>()
    for (const e of data.edges) {
      if (e.from === activeId) ids.add(e.to)
      if (e.to === activeId) ids.add(e.from)
    }
    ids.add(activeId)
    return ids
  }, [activeId, data.edges])

  const nodePositionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (const n of data.nodes) map.set(n.id, n.position)
    return map
  }, [data.nodes])

  const toggleType = useCallback((type: ItemType) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  return (
    <div className="relative w-full h-full">
      <SceneWrapper autoRotate={presenting}>
        {/* Cluster labels */}
        {ZONE_LABELS.map(({ type, label, position }) => (
          !hiddenTypes.has(type) && (
            <Text
              key={type}
              position={position}
              fontSize={3}
              color={TYPE_COLORS[type]}
              fillOpacity={0.15}
              anchorX="center"
              anchorY="middle"
              font="/fonts/DMSans-Variable.ttf"
            >
              {label}
            </Text>
          )
        ))}

        {/* Cards */}
        {data.nodes.map(node => (
          !hiddenTypes.has(node.type) && (
            <GlassCard
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              faded={!!activeId && !connectedIds.has(node.id)}
              onClick={(id) => setSelectedId(prev => prev === id ? null : id)}
              onHover={setHoveredId}
            />
          )
        ))}

        {/* Connections — visible only when a node is active */}
        {data.edges.map(edge => {
          const fromPos = nodePositionMap.get(edge.from)
          const toPos = nodePositionMap.get(edge.to)
          if (!fromPos || !toPos) return null
          if (hiddenTypes.has(data.nodes.find(n => n.id === edge.from)?.type as ItemType)) return null
          if (hiddenTypes.has(data.nodes.find(n => n.id === edge.to)?.type as ItemType)) return null

          const isActive = activeId && (edge.from === activeId || edge.to === activeId)
          const edgeColor = isActive
            ? TYPE_COLORS[data.nodes.find(n => n.id === activeId)?.type || 'entity']
            : undefined

          return (
            <ConnectionLine
              key={edge.id}
              from={fromPos}
              to={toPos}
              visible={!!isActive}
              color={edgeColor}
              animated={!!selectedId && isActive}
            />
          )
        })}
      </SceneWrapper>

      {/* Filter bar — HTML overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {(['entity', 'actor', 'journey', 'rule', 'constraint', 'question'] as ItemType[]).map(type => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200"
            style={{
              background: hiddenTypes.has(type) ? 'transparent' : TYPE_COLORS[type] + '18',
              color: TYPE_COLORS[type],
              border: `1.5px solid ${TYPE_COLORS[type]}${hiddenTypes.has(type) ? '40' : ''}`,
              opacity: hiddenTypes.has(type) ? 0.5 : 1,
            }}
          >
            {type === 'question' ? 'Questions' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
          </button>
        ))}

        <button
          onClick={() => setPresenting(p => !p)}
          className="px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ml-2"
          style={{
            background: presenting ? '#002C61' : 'rgba(0,0,0,0.05)',
            color: presenting ? '#fff' : '#858481',
            border: '1.5px solid transparent',
          }}
        >
          {presenting ? 'Stop' : 'Present'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep galaxy-view
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/
git commit -m "feat(3d): add Galaxy view with filter bar and presentation mode"
```

---

## Task 9: Wire Galaxy into explorer tabs & remove old views

**Files:**
- Modify: `src/components/explorer/explorer-tabs.tsx`
- Remove: `src/components/explorer/graph-3d.tsx`
- Remove: `src/components/explorer/graph-3d-lifecycle.tsx`
- Remove: `src/components/explorer/graph-3d-actors.tsx`

- [ ] **Step 1: Update explorer-tabs.tsx**

Replace the `VIEWS_3D` array and 3D tab content rendering. Change the `view3d` state type to `'galaxy' | 'flows' | 'anatomy' | 'domains'`. Replace the three old component imports with the new `GalaxyView`. (Flows, Anatomy, Domains will be placeholder divs for now.)

Key changes:
- `VIEWS_3D` becomes: `[{ id: 'galaxy', label: 'Galaxy' }, { id: 'flows', label: 'Flows' }, { id: 'anatomy', label: 'Anatomy' }, { id: 'domains', label: 'Domains' }]`
- Remove dynamic imports of `Graph3D`, `Graph3DLifecycle`, `Graph3DActors`
- Add: `import { GalaxyView } from './views-3d/galaxy/galaxy-view'`
- 3D tab content: Galaxy renders `<GalaxyView model={model} />`, others show placeholder text

- [ ] **Step 2: Delete old 3D view files**

```bash
rm src/components/explorer/graph-3d.tsx src/components/explorer/graph-3d-lifecycle.tsx src/components/explorer/graph-3d-actors.tsx
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 4: Test in browser**

Open `http://localhost:4444`, click the 3D tab, select Galaxy. Verify:
- Glass cards render with correct colors and type clustering
- Hover highlights connections
- Click selects, fades unrelated cards
- Filter pills work
- Present mode auto-orbits

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/explorer-tabs.tsx src/components/explorer/views-3d/
git rm src/components/explorer/graph-3d.tsx src/components/explorer/graph-3d-lifecycle.tsx src/components/explorer/graph-3d-actors.tsx
git commit -m "feat(3d): wire Galaxy view into explorer tabs, remove old 3D views"
```

---

## Task 10: Flows data transformer

**Files:**
- Create: `src/components/explorer/views-3d/flows/flows-data.ts`

- [ ] **Step 1: Create flows-data.ts**

Transforms a single `Journey` + the full model into step cards with branching entity/actor/rule cards. Uses text matching to infer step→item relationships.

```typescript
import type { IntentModel, Journey } from '@/domain/intent-model/types'
import type { CardNode, ConnectionEdge, ItemType } from '../shared/types'
import { ICON_MAP } from '../shared/constants'

export type FlowsData = {
  stepCards: CardNode[]
  branchCards: CardNode[]
  edges: ConnectionEdge[]
  railPoints: [number, number, number][]
}

const STEP_SPACING = 6
const Z_AMPLITUDE = 1.5
const BRANCH_OFFSET_Y = 4
const BRANCH_OFFSET_X = 2.5

export function buildFlowsData(journey: Journey, model: IntentModel): FlowsData {
  const stepCards: CardNode[] = []
  const branchCards: CardNode[] = []
  const edges: ConnectionEdge[] = []
  const railPoints: [number, number, number][] = []

  // Build step cards along S-curved rail
  for (let i = 0; i < journey.steps.length; i++) {
    const step = journey.steps[i]
    const x = i * STEP_SPACING
    const z = Math.sin(i * 0.6) * Z_AMPLITUDE
    const pos: [number, number, number] = [x, 0, z]

    railPoints.push(pos)

    stepCards.push({
      id: `step-${step.order}`,
      name: `${step.order}. ${step.title}`,
      type: 'journey',
      stat: step.detail.slice(0, 50),
      icon: ICON_MAP.journey,
      size: 'medium',
      position: pos,
    })

    // Infer related items by text matching
    const text = `${step.title} ${step.detail} ${step.precondition || ''}`.toLowerCase()

    // Actors — primary actor always links to step 1, then text match
    let branchY = BRANCH_OFFSET_Y
    for (const actor of model.actors) {
      const isLinked = (i === 0 && actor.name.toLowerCase().includes(journey.primary_actor.toLowerCase()))
        || text.includes(actor.name.toLowerCase())
      if (isLinked) {
        const branchId = `branch-actor-${actor.id}-step-${step.order}`
        branchCards.push({
          id: branchId,
          name: actor.name,
          type: 'actor',
          stat: `${actor.responsibilities.length} resp.`,
          icon: ICON_MAP.actor,
          size: 'small',
          position: [x, branchY, z],
          deferred: actor.deferred,
        })
        edges.push({ id: `edge-${branchId}`, from: `step-${step.order}`, to: branchId })
        branchY += 3
      }
    }

    // Entities
    let branchYDown = -BRANCH_OFFSET_Y
    for (const entity of model.entities) {
      if (text.includes(entity.name.toLowerCase())) {
        const branchId = `branch-entity-${entity.id}-step-${step.order}`
        branchCards.push({
          id: branchId,
          name: entity.name,
          type: 'entity',
          stat: `${entity.key_fields.length} fields`,
          icon: ICON_MAP.entity,
          size: 'small',
          position: [x - BRANCH_OFFSET_X, branchYDown, z],
          deferred: entity.deferred,
        })
        edges.push({ id: `edge-${branchId}`, from: `step-${step.order}`, to: branchId })
        branchYDown -= 3
      }
    }

    // Rules
    let branchYRule = -BRANCH_OFFSET_Y
    for (const rule of model.business_rules) {
      const ruleText = `${rule.description} ${rule.applies_to.join(' ')}`.toLowerCase()
      if (text.includes(rule.id.toLowerCase()) || ruleText.includes(step.title.toLowerCase())) {
        const branchId = `branch-rule-${rule.id}-step-${step.order}`
        branchCards.push({
          id: branchId,
          name: rule.description.slice(0, 40),
          type: 'rule',
          stat: rule.id,
          icon: ICON_MAP.rule,
          size: 'small',
          position: [x + BRANCH_OFFSET_X, branchYRule, z],
        })
        edges.push({ id: `edge-${branchId}`, from: `step-${step.order}`, to: branchId })
        branchYRule -= 3
      }
    }
  }

  return { stepCards, branchCards, edges, railPoints }
}

// Idle state: all journeys as cards in a grid
export function buildFlowsIdleData(model: IntentModel): CardNode[] {
  const cols = 4
  return model.journeys.map((j, i) => ({
    id: j.id,
    name: j.name,
    type: 'journey' as ItemType,
    stat: `${j.steps.length} steps · ${j.primary_actor}`,
    icon: ICON_MAP.journey,
    size: 'medium' as const,
    deferred: j.deferred,
    position: [
      (i % cols) * 5 - (cols * 5) / 2 + 2.5,
      -Math.floor(i / cols) * 4 + 4,
      0,
    ] as [number, number, number],
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/explorer/views-3d/flows/
git commit -m "feat(3d): add Flows data transformer with text-matching heuristic"
```

---

## Task 11: Flows view component + journey selector

**Files:**
- Create: `src/components/explorer/views-3d/flows/flows-view.tsx`
- Create: `src/components/explorer/views-3d/flows/journey-selector.tsx`

- [ ] **Step 1: Create journey-selector.tsx**

```typescript
'use client'

import type { Journey } from '@/domain/intent-model/types'

type JourneySelectorProps = {
  journeys: Journey[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function JourneySelector({ journeys, selectedId, onSelect }: JourneySelectorProps) {
  return (
    <div
      className="absolute left-4 top-4 bottom-4 w-56 z-10 rounded-xl overflow-y-auto custom-scroll"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#858481' }}>
          Journeys
        </p>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left px-2 py-1.5 text-xs rounded-md mb-2 transition-colors"
            style={{ color: '#0081F2' }}
          >
            ← All journeys
          </button>
        )}
        {journeys.map(j => (
          <button
            key={j.id}
            onClick={() => onSelect(j.id)}
            className="w-full text-left px-2 py-2 text-xs rounded-md transition-colors mb-0.5"
            style={{
              background: selectedId === j.id ? 'rgba(0,129,242,0.08)' : 'transparent',
              color: selectedId === j.id ? '#0081F2' : '#34322D',
              fontWeight: selectedId === j.id ? 600 : 400,
            }}
          >
            <span className="block truncate">{j.name}</span>
            <span className="text-[10px]" style={{ color: '#858481' }}>
              {j.steps.length} steps · {j.primary_actor}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create flows-view.tsx**

```typescript
'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { SceneWrapper } from '../shared/scene-wrapper'
import { GlassCard } from '../shared/glass-card'
import { ConnectionLine } from '../shared/connection-line'
import { buildFlowsData, buildFlowsIdleData } from './flows-data'
import { JourneySelector } from './journey-selector'
import { TYPE_COLORS, ANIMATION } from '../shared/constants'
import type { ViewProps } from '../shared/types'

export function FlowsView({ model }: ViewProps) {
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const journey = selectedJourneyId
    ? model.journeys.find(j => j.id === selectedJourneyId)
    : null

  const flowData = useMemo(
    () => journey ? buildFlowsData(journey, model) : null,
    [journey, model]
  )

  const idleCards = useMemo(
    () => !journey ? buildFlowsIdleData(model) : null,
    [journey, model]
  )

  // Step-through mode
  useEffect(() => {
    if (!playing || !journey) return
    setActiveStep(0)
    timerRef.current = setInterval(() => {
      setActiveStep(prev => {
        if (prev === null || prev >= journey.steps.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, ANIMATION.stepThroughMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, journey])

  // Arrow key navigation
  useEffect(() => {
    if (!journey) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActiveStep(prev => Math.min((prev ?? -1) + 1, journey.steps.length - 1))
      if (e.key === 'ArrowLeft') setActiveStep(prev => Math.max((prev ?? 1) - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [journey])

  const nodePositionMap = useMemo(() => {
    if (!flowData) return new Map()
    const map = new Map<string, [number, number, number]>()
    for (const n of [...flowData.stepCards, ...flowData.branchCards]) {
      map.set(n.id, n.position)
    }
    return map
  }, [flowData])

  return (
    <div className="relative w-full h-full">
      <JourneySelector
        journeys={model.journeys}
        selectedId={selectedJourneyId}
        onSelect={(id) => { setSelectedJourneyId(id); setActiveStep(null); setPlaying(false) }}
      />

      <SceneWrapper>
        {/* Idle state — journey cards in a grid */}
        {idleCards?.map(card => (
          <GlassCard
            key={card.id}
            node={card}
            onClick={(id) => setSelectedJourneyId(id)}
          />
        ))}

        {/* Active journey — step cards */}
        {flowData?.stepCards.map((card, i) => (
          <GlassCard
            key={card.id}
            node={card}
            selected={activeStep === i}
            faded={activeStep !== null && activeStep !== i}
          />
        ))}

        {/* Branch cards */}
        {flowData?.branchCards.map(card => {
          const parentEdge = flowData.edges.find(e => e.to === card.id)
          const parentStepIdx = parentEdge
            ? flowData.stepCards.findIndex(s => s.id === parentEdge.from)
            : -1
          const isFaded = activeStep !== null && parentStepIdx !== activeStep

          return (
            <GlassCard
              key={card.id}
              node={card}
              faded={isFaded}
            />
          )
        })}

        {/* Connection lines */}
        {flowData?.edges.map(edge => {
          const fromPos = nodePositionMap.get(edge.from)
          const toPos = nodePositionMap.get(edge.to)
          if (!fromPos || !toPos) return null

          const toNode = flowData.branchCards.find(n => n.id === edge.to)
          const color = toNode ? TYPE_COLORS[toNode.type] : undefined

          return (
            <ConnectionLine
              key={edge.id}
              from={fromPos}
              to={toPos}
              color={color}
              visible
            />
          )
        })}

        {/* Rail line connecting steps */}
        {flowData && flowData.railPoints.length > 1 && (
          flowData.railPoints.slice(0, -1).map((from, i) => (
            <ConnectionLine
              key={`rail-${i}`}
              from={from}
              to={flowData.railPoints[i + 1]}
              color={TYPE_COLORS.journey}
              visible
              opacity={0.3}
              thickness={2}
            />
          ))
        )}
      </SceneWrapper>

      {/* Step-through controls */}
      {journey && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          <button
            onClick={() => setPlaying(p => !p)}
            className="px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200"
            style={{
              background: playing ? '#002C61' : 'rgba(0,0,0,0.05)',
              color: playing ? '#fff' : '#858481',
            }}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          {activeStep !== null && (
            <span className="text-xs" style={{ color: '#858481' }}>
              Step {activeStep + 1} of {journey.steps.length} — Use ← → to navigate
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire Flows into explorer-tabs.tsx**

Add `import { FlowsView } from './views-3d/flows/flows-view'` and replace the Flows placeholder with `<FlowsView model={model} />`.

- [ ] **Step 4: Test in browser**

Open `http://localhost:4444`, 3D tab → Flows. Verify:
- Idle state shows journey cards in a grid
- Click a journey: step cards appear along S-curved rail
- Branch cards appear above/below
- Play button steps through
- Arrow keys navigate
- Sidebar selector works

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/views-3d/flows/ src/components/explorer/explorer-tabs.tsx
git commit -m "feat(3d): add Flows view with journey selector and step-through mode"
```

---

## Task 12: Anatomy data transformer

**Files:**
- Create: `src/components/explorer/views-3d/anatomy/anatomy-data.ts`

- [ ] **Step 1: Create anatomy-data.ts**

Transforms a single `Entity` + the full model into the main panel, lifecycle rail, and orbiting cards.

```typescript
import type { IntentModel, Entity } from '@/domain/intent-model/types'
import type { CardNode, ConnectionEdge, ItemType } from '../shared/types'
import { ICON_MAP } from '../shared/constants'

export type AnatomyData = {
  mainCard: CardNode
  lifecycleCards: CardNode[]
  lifecycleEdges: ConnectionEdge[]
  orbitingCards: CardNode[]
  orbitingEdges: ConnectionEdge[]
}

const ORBIT_ZONES: { type: ItemType; angle: number; radius: number }[] = [
  { type: 'actor', angle: Math.PI * 0.75, radius: 8 },      // upper-left
  { type: 'journey', angle: 0, radius: 9 },                  // right
  { type: 'rule', angle: -Math.PI * 0.35, radius: 8 },       // below-right
  { type: 'entity', angle: Math.PI, radius: 7 },             // left (other entities)
]

export function buildAnatomyData(entity: Entity, model: IntentModel): AnatomyData {
  const mainId = `main-${entity.id}`

  // Main panel at origin
  const mainCard: CardNode = {
    id: mainId,
    name: entity.name,
    type: 'entity',
    stat: `${entity.key_fields.length} fields · ${entity.lifecycle.states.length} states${entity.is_integration ? ' · Integration' : ''}`,
    icon: ICON_MAP.entity,
    size: 'large',
    position: [0, 1, 0],
    deferred: entity.deferred,
  }

  // Lifecycle rail below main panel
  const lifecycleCards: CardNode[] = entity.lifecycle.states.map((state, i) => ({
    id: `lc-${state}`,
    name: state,
    type: 'entity' as ItemType,
    stat: '',
    icon: ICON_MAP.entity,
    size: 'small',
    position: [i * 3.5 - (entity.lifecycle.states.length - 1) * 1.75, -4, 0],
  }))

  // Lifecycle edges from transitions
  const lifecycleEdges: ConnectionEdge[] = entity.lifecycle.transitions.map(t => ({
    id: `lc-edge-${t.from}-${t.to}`,
    from: `lc-${t.from}`,
    to: `lc-${t.to}`,
    visible: true,
    color: '#0081F2',
  }))

  // Orbiting cards — find related items
  const orbitingCards: CardNode[] = []
  const orbitingEdges: ConnectionEdge[] = []

  const nameLC = entity.name.toLowerCase()

  // Related actors
  const relatedActors = model.actors.filter(a =>
    a.responsibilities.some(r =>
      r.description.toLowerCase().includes(nameLC)
    )
  )
  relatedActors.forEach((a, i) => {
    const zone = ORBIT_ZONES.find(z => z.type === 'actor')!
    const angle = zone.angle + (i * 0.4 - relatedActors.length * 0.2)
    const id = `orbit-actor-${a.id}`
    orbitingCards.push({
      id,
      name: a.name,
      type: 'actor',
      stat: `${a.responsibilities.length} resp.`,
      icon: ICON_MAP.actor,
      size: 'small',
      position: [Math.cos(angle) * zone.radius, Math.sin(angle) * zone.radius + 1, 0],
      deferred: a.deferred,
    })
    orbitingEdges.push({ id: `orbit-edge-${id}`, from: mainId, to: id, visible: true })
  })

  // Related journeys
  const relatedJourneys = model.journeys.filter(j =>
    j.steps.some(s =>
      s.title.toLowerCase().includes(nameLC) || s.detail.toLowerCase().includes(nameLC)
    )
  )
  relatedJourneys.forEach((j, i) => {
    const zone = ORBIT_ZONES.find(z => z.type === 'journey')!
    const angle = zone.angle + (i * 0.4 - relatedJourneys.length * 0.2)
    const id = `orbit-journey-${j.id}`
    orbitingCards.push({
      id,
      name: j.name,
      type: 'journey',
      stat: `${j.steps.length} steps`,
      icon: ICON_MAP.journey,
      size: 'small',
      position: [Math.cos(angle) * zone.radius, Math.sin(angle) * zone.radius + 1, 0],
      deferred: j.deferred,
    })
    orbitingEdges.push({ id: `orbit-edge-${id}`, from: mainId, to: id, visible: true })
  })

  // Related rules
  const relatedRules = model.business_rules.filter(r =>
    r.applies_to.some(a => a.toLowerCase().includes(nameLC) || nameLC.includes(a.toLowerCase()))
  )
  relatedRules.forEach((r, i) => {
    const zone = ORBIT_ZONES.find(z => z.type === 'rule')!
    const angle = zone.angle + (i * 0.4 - relatedRules.length * 0.2)
    const id = `orbit-rule-${r.id}`
    orbitingCards.push({
      id,
      name: r.description.slice(0, 40),
      type: 'rule',
      stat: r.id,
      icon: ICON_MAP.rule,
      size: 'small',
      position: [Math.cos(angle) * zone.radius, Math.sin(angle) * zone.radius + 1, 0],
    })
    orbitingEdges.push({ id: `orbit-edge-${id}`, from: mainId, to: id, visible: true })
  })

  // Related entities (field cross-refs)
  const relatedEntities = model.entities.filter(e => {
    if (e.id === entity.id) return false
    return entity.key_fields.some(f => f.description.toLowerCase().includes(e.name.toLowerCase()))
      || e.key_fields.some(f => f.description.toLowerCase().includes(nameLC))
  })
  relatedEntities.forEach((e, i) => {
    const zone = ORBIT_ZONES.find(z => z.type === 'entity')!
    const angle = zone.angle + (i * 0.4 - relatedEntities.length * 0.2)
    const id = `orbit-entity-${e.id}`
    orbitingCards.push({
      id,
      name: e.name,
      type: 'entity',
      stat: `${e.key_fields.length} fields`,
      icon: ICON_MAP.entity,
      size: 'small',
      position: [Math.cos(angle) * zone.radius, Math.sin(angle) * zone.radius + 1, 0],
      deferred: e.deferred,
    })
    orbitingEdges.push({ id: `orbit-edge-${id}`, from: mainId, to: id, visible: true })
  })

  return { mainCard, lifecycleCards, lifecycleEdges, orbitingCards, orbitingEdges }
}

// Idle state: all entities as cards in a cluster
export function buildAnatomyIdleData(model: IntentModel): CardNode[] {
  const domain = model.entities.filter(e => !e.is_integration)
  const integrations = model.entities.filter(e => e.is_integration)
  const all = [...domain, ...integrations]

  const cols = 4
  return all.map((e, i) => ({
    id: e.id,
    name: e.name,
    type: 'entity' as ItemType,
    stat: `${e.key_fields.length} fields · ${e.lifecycle.states.length} states`,
    icon: ICON_MAP.entity,
    size: (e.is_integration ? 'small' : 'medium') as const,
    deferred: e.deferred,
    position: [
      (i % cols) * 5 - (cols * 5) / 2 + 2.5,
      -Math.floor(i / cols) * 4 + 2,
      e.is_integration ? 2 : 0,
    ] as [number, number, number],
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/explorer/views-3d/anatomy/
git commit -m "feat(3d): add Anatomy data transformer with lifecycle rail and orbit zones"
```

---

## Task 13: Anatomy view component + entity selector

**Files:**
- Create: `src/components/explorer/views-3d/anatomy/entity-selector.tsx`
- Create: `src/components/explorer/views-3d/anatomy/anatomy-view.tsx`
- Modify: `src/components/explorer/explorer-tabs.tsx`

- [ ] **Step 1: Create entity-selector.tsx**

```typescript
'use client'

import type { Entity } from '@/domain/intent-model/types'

type EntitySelectorProps = {
  entities: Entity[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function EntitySelector({ entities, selectedId, onSelect }: EntitySelectorProps) {
  const domain = entities.filter(e => !e.is_integration)
  const integrations = entities.filter(e => e.is_integration)

  return (
    <div
      className="absolute left-4 top-4 bottom-4 w-56 z-10 rounded-xl overflow-y-auto custom-scroll"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#858481' }}>
          Entities
        </p>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left px-2 py-1.5 text-xs rounded-md mb-2 transition-colors"
            style={{ color: '#0081F2' }}
          >
            ← All entities
          </button>
        )}

        {domain.map(e => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="w-full text-left px-2 py-2 text-xs rounded-md transition-colors mb-0.5"
            style={{
              background: selectedId === e.id ? 'rgba(0,129,242,0.08)' : 'transparent',
              color: selectedId === e.id ? '#0081F2' : '#34322D',
              fontWeight: selectedId === e.id ? 600 : 400,
            }}
          >
            <span className="block truncate">{e.name}</span>
            <span className="text-[10px]" style={{ color: '#858481' }}>
              {e.key_fields.length} fields · {e.lifecycle.states.length} states
            </span>
          </button>
        ))}

        {integrations.length > 0 && (
          <>
            <div className="my-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#858481' }}>
              Integrations
            </p>
            {integrations.map(e => (
              <button
                key={e.id}
                onClick={() => onSelect(e.id)}
                className="w-full text-left px-2 py-2 text-xs rounded-md transition-colors mb-0.5"
                style={{
                  background: selectedId === e.id ? 'rgba(0,129,242,0.08)' : 'transparent',
                  color: selectedId === e.id ? '#0081F2' : '#5E5E5B',
                  fontWeight: selectedId === e.id ? 600 : 400,
                }}
              >
                <span className="block truncate">{e.name}</span>
                <span className="text-[10px]" style={{ color: '#858481' }}>
                  {e.key_fields.length} fields
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create anatomy-view.tsx**

```typescript
'use client'

import { useMemo, useState } from 'react'
import { SceneWrapper } from '../shared/scene-wrapper'
import { GlassCard } from '../shared/glass-card'
import { ConnectionLine } from '../shared/connection-line'
import { buildAnatomyData, buildAnatomyIdleData } from './anatomy-data'
import { EntitySelector } from './entity-selector'
import { TYPE_COLORS } from '../shared/constants'
import type { ViewProps } from '../shared/types'

export function AnatomyView({ model }: ViewProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

  const entity = selectedEntityId
    ? model.entities.find(e => e.id === selectedEntityId)
    : null

  const anatomyData = useMemo(
    () => entity ? buildAnatomyData(entity, model) : null,
    [entity, model]
  )

  const idleCards = useMemo(
    () => !entity ? buildAnatomyIdleData(model) : null,
    [entity, model]
  )

  const nodePositionMap = useMemo(() => {
    if (!anatomyData) return new Map<string, [number, number, number]>()
    const map = new Map<string, [number, number, number]>()
    map.set(anatomyData.mainCard.id, anatomyData.mainCard.position)
    for (const n of [...anatomyData.lifecycleCards, ...anatomyData.orbitingCards]) {
      map.set(n.id, n.position)
    }
    return map
  }, [anatomyData])

  return (
    <div className="relative w-full h-full">
      <EntitySelector
        entities={model.entities}
        selectedId={selectedEntityId}
        onSelect={setSelectedEntityId}
      />

      <SceneWrapper>
        {/* Idle state — entity cards in cluster */}
        {idleCards?.map(card => (
          <GlassCard
            key={card.id}
            node={card}
            onClick={(id) => setSelectedEntityId(id)}
          />
        ))}

        {/* Main entity panel */}
        {anatomyData && (
          <GlassCard
            key={anatomyData.mainCard.id}
            node={anatomyData.mainCard}
            selected
          />
        )}

        {/* Lifecycle rail */}
        {anatomyData?.lifecycleCards.map(card => (
          <GlassCard key={card.id} node={card} />
        ))}

        {/* Lifecycle edges */}
        {anatomyData?.lifecycleEdges.map(edge => {
          const fromPos = nodePositionMap.get(edge.from)
          const toPos = nodePositionMap.get(edge.to)
          if (!fromPos || !toPos) return null
          return (
            <ConnectionLine
              key={edge.id}
              from={fromPos}
              to={toPos}
              color={edge.color}
              visible
              thickness={1.5}
            />
          )
        })}

        {/* Orbiting cards */}
        {anatomyData?.orbitingCards.map(card => (
          <GlassCard key={card.id} node={card} />
        ))}

        {/* Orbiting edges */}
        {anatomyData?.orbitingEdges.map(edge => {
          const fromPos = nodePositionMap.get(edge.from)
          const toPos = nodePositionMap.get(edge.to)
          if (!fromPos || !toPos) return null
          const toNode = anatomyData.orbitingCards.find(n => n.id === edge.to)
          return (
            <ConnectionLine
              key={edge.id}
              from={fromPos}
              to={toPos}
              color={toNode ? TYPE_COLORS[toNode.type] : undefined}
              visible
            />
          )
        })}
      </SceneWrapper>
    </div>
  )
}
```

- [ ] **Step 3: Wire Anatomy into explorer-tabs.tsx**

Add `import { AnatomyView } from './views-3d/anatomy/anatomy-view'` and replace the Anatomy placeholder with `<AnatomyView model={model} />`.

- [ ] **Step 4: Test in browser**

Open `http://localhost:4444`, 3D tab → Anatomy. Verify:
- Idle state shows entity cards (domain front, integrations behind)
- Click entity: main panel at center, lifecycle rail below, orbiting cards around
- Connections use type colors
- Sidebar has domain/integration divider

- [ ] **Step 5: Commit**

```bash
git add src/components/explorer/views-3d/anatomy/ src/components/explorer/explorer-tabs.tsx
git commit -m "feat(3d): add Anatomy view with entity selector and lifecycle rail"
```

---

## Task 14: Domains data transformer + glass platform

**Files:**
- Create: `src/components/explorer/views-3d/domains/domains-data.ts`
- Create: `src/components/explorer/views-3d/shared/glass-platform.tsx`

- [ ] **Step 1: Create domains-data.ts**

```typescript
import type { IntentModel, Actor } from '@/domain/intent-model/types'
import type { CardNode, ConnectionEdge, ItemType } from '../shared/types'
import { ICON_MAP } from '../shared/constants'

export type DomainPlatform = {
  actor: Actor
  position: [number, number, number]
  connectionCount: number
}

export type JourneyThread = {
  journeyId: string
  journeyName: string
  points: [number, number, number][]  // actor platform → entity → ... path
  color: string
}

export type DomainsData = {
  platforms: DomainPlatform[]
  entityCards: CardNode[]
  threads: JourneyThread[]
}

const PLATFORM_SPACING_Z = 8
const PLATFORM_SPREAD_X = 12
const GREEN_SHADES = ['#10B981', '#059669', '#047857', '#065F46', '#34D399', '#6EE7B7',
  '#A7F3D0', '#D1FAE5', '#ECFDF5', '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A']

export function buildDomainsData(model: IntentModel): DomainsData {
  // Count connections per actor
  const actorConnections = model.actors.map(actor => {
    const nameLC = actor.name.toLowerCase()
    let count = actor.responsibilities.length

    // Journeys where actor is primary
    count += model.journeys.filter(j =>
      j.primary_actor.toLowerCase().includes(nameLC) || nameLC.includes(j.primary_actor.toLowerCase())
    ).length

    // Entities mentioned in responsibilities
    for (const r of actor.responsibilities) {
      for (const e of model.entities) {
        if (r.description.toLowerCase().includes(e.name.toLowerCase())) count++
      }
    }

    return { actor, count }
  })

  // Sort by connection count descending (most connected = closest to camera)
  actorConnections.sort((a, b) => b.count - a.count)

  // Position platforms at increasing Z-depth
  const platforms: DomainPlatform[] = actorConnections.map(({ actor, count }, i) => ({
    actor,
    connectionCount: count,
    position: [
      (i % 2 === 0 ? -1 : 1) * PLATFORM_SPREAD_X * 0.3 * (i > 0 ? 1 : 0),
      (actorConnections.length - 1 - i) * 3 - (actorConnections.length * 1.5),
      i * PLATFORM_SPACING_Z,
    ] as [number, number, number],
  }))

  // Position entities — shared entities between referencing actors
  const entityCards: CardNode[] = model.entities.map(entity => {
    const nameLC = entity.name.toLowerCase()

    // Find which actors reference this entity
    const referencingPlatforms = platforms.filter(p =>
      p.actor.responsibilities.some(r => r.description.toLowerCase().includes(nameLC))
    )

    // Position at average of referencing platforms (overlap zone)
    let pos: [number, number, number]
    if (referencingPlatforms.length > 0) {
      const avgX = referencingPlatforms.reduce((s, p) => s + p.position[0], 0) / referencingPlatforms.length
      const avgY = referencingPlatforms.reduce((s, p) => s + p.position[1], 0) / referencingPlatforms.length
      const avgZ = referencingPlatforms.reduce((s, p) => s + p.position[2], 0) / referencingPlatforms.length
      pos = [avgX + (Math.random() - 0.5) * 3, avgY + 2, avgZ]
    } else {
      // No references — place at periphery
      pos = [PLATFORM_SPREAD_X * 0.8, 0, platforms.length * PLATFORM_SPACING_Z * 0.5]
    }

    return {
      id: entity.id,
      name: entity.name,
      type: 'entity' as ItemType,
      stat: `${entity.key_fields.length} fields`,
      icon: ICON_MAP.entity,
      size: 'small' as const,
      deferred: entity.deferred,
      position: pos,
    }
  })

  // Journey threads — trace primary_actor → entities
  const threads: JourneyThread[] = model.journeys.map((journey, i) => {
    const points: [number, number, number][] = []

    // Find primary actor platform
    const actorPlatform = platforms.find(p =>
      p.actor.name.toLowerCase().includes(journey.primary_actor.toLowerCase())
      || journey.primary_actor.toLowerCase().includes(p.actor.name.toLowerCase())
    )
    if (actorPlatform) points.push(actorPlatform.position)

    // Find entities mentioned in journey steps
    for (const step of journey.steps) {
      const text = `${step.title} ${step.detail}`.toLowerCase()
      for (const ec of entityCards) {
        if (text.includes(ec.name.toLowerCase()) && !points.some(p => p === ec.position)) {
          points.push(ec.position)
        }
      }
    }

    return {
      journeyId: journey.id,
      journeyName: journey.name,
      points,
      color: GREEN_SHADES[i % GREEN_SHADES.length],
    }
  })

  return { platforms, entityCards, threads }
}
```

- [ ] **Step 2: Create glass-platform.tsx**

```typescript
'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Actor } from '@/domain/intent-model/types'
import { TYPE_COLORS, CARD_OPACITY } from './constants'

type GlassPlatformProps = {
  actor: Actor
  position: [number, number, number]
  selected?: boolean
  faded?: boolean
  onClick?: (id: string) => void
}

const PLATFORM_WIDTH = 8
const PLATFORM_HEIGHT = 6
const TILT_ANGLE = -Math.PI / 12  // -15 degrees
const TEXTURE_SCALE = 2

function createPlatformTexture(actor: Actor): THREE.CanvasTexture {
  const w = PLATFORM_WIDTH * 40 * TEXTURE_SCALE
  const h = PLATFORM_HEIGHT * 40 * TEXTURE_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = `rgba(255, 255, 255, 0.8)`
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, 16 * TEXTURE_SCALE)
  ctx.fill()

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, 16 * TEXTURE_SCALE)
  ctx.stroke()

  // Left edge strip
  ctx.fillStyle = TYPE_COLORS.actor
  ctx.fillRect(0, 16 * TEXTURE_SCALE, 8 * TEXTURE_SCALE, h - 32 * TEXTURE_SCALE)

  const pad = 20 * TEXTURE_SCALE

  // Actor name (large, top-left)
  ctx.fillStyle = '#34322D'
  ctx.font = `700 ${18 * TEXTURE_SCALE}px "DM Sans", sans-serif`
  ctx.fillText(actor.name, pad + 8 * TEXTURE_SCALE, pad + 18 * TEXTURE_SCALE)

  // Auth badge (top-right)
  ctx.fillStyle = '#858481'
  ctx.font = `500 ${10 * TEXTURE_SCALE}px "DM Sans", sans-serif`
  const authText = actor.auth.length > 25 ? actor.auth.slice(0, 25) + '...' : actor.auth
  const authWidth = ctx.measureText(authText).width
  ctx.fillText(authText, w - pad - authWidth, pad + 14 * TEXTURE_SCALE)

  // Responsibilities
  ctx.fillStyle = '#5E5E5B'
  ctx.font = `400 ${10 * TEXTURE_SCALE}px "DM Sans", sans-serif`
  const startY = pad + 38 * TEXTURE_SCALE
  const lineH = 14 * TEXTURE_SCALE
  const maxRows = Math.floor((h - startY - pad) / lineH)

  actor.responsibilities.slice(0, maxRows).forEach((r, i) => {
    const text = `${r.id.toUpperCase()} — ${r.description}`
    const maxW = w - pad * 2 - 8 * TEXTURE_SCALE
    let display = text
    while (ctx.measureText(display).width > maxW && display.length > 0) {
      display = display.slice(0, -1)
    }
    if (display.length < text.length) display += '...'
    ctx.fillText(display, pad + 8 * TEXTURE_SCALE, startY + i * lineH)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function GlassPlatform({ actor, position, selected, faded, onClick }: GlassPlatformProps) {
  const [hovered, setHovered] = useState(false)
  const invalidate = useThree(s => s.invalidate)

  const texture = useMemo(() => createPlatformTexture(actor), [actor])

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: faded ? 0.4 : CARD_OPACITY,
    side: THREE.DoubleSide,
    roughness: 0.3,
    metalness: 0.05,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.05,
  }), [texture, faded])

  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation()
    onClick?.(actor.id)
    invalidate()
  }, [actor.id, onClick, invalidate])

  return (
    <group position={position}>
      <mesh
        rotation={[TILT_ANGLE, 0, 0]}
        material={material}
        onClick={handleClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; invalidate() }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; invalidate() }}
      >
        <planeGeometry args={[PLATFORM_WIDTH, PLATFORM_HEIGHT]} />
      </mesh>

      {/* Selection glow */}
      {selected && (
        <mesh rotation={[TILT_ANGLE, 0, 0]}>
          <planeGeometry args={[PLATFORM_WIDTH + 0.3, PLATFORM_HEIGHT + 0.3]} />
          <meshBasicMaterial
            color={TYPE_COLORS.actor}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/explorer/views-3d/domains/ src/components/explorer/views-3d/shared/glass-platform.tsx
git commit -m "feat(3d): add Domains data transformer and glass platform component"
```

---

## Task 15: Domains view component

**Files:**
- Create: `src/components/explorer/views-3d/domains/domains-view.tsx`
- Modify: `src/components/explorer/explorer-tabs.tsx`

- [ ] **Step 1: Create domains-view.tsx**

```typescript
'use client'

import { useMemo, useState, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { SceneWrapper } from '../shared/scene-wrapper'
import { GlassCard } from '../shared/glass-card'
import { GlassPlatform } from '../shared/glass-platform'
import { ConnectionLine } from '../shared/connection-line'
import { buildDomainsData } from './domains-data'
import type { ViewProps } from '../shared/types'

export function DomainsView({ model }: ViewProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [visibleThreads, setVisibleThreads] = useState<Set<string>>(new Set())

  const data = useMemo(() => buildDomainsData(model), [model])

  const toggleThread = useCallback((journeyId: string) => {
    setVisibleThreads(prev => {
      const next = new Set(prev)
      if (next.has(journeyId)) next.delete(journeyId)
      else next.add(journeyId)
      return next
    })
  }, [])

  // Entity position lookup
  const entityPositionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (const ec of data.entityCards) map.set(ec.id, ec.position)
    return map
  }, [data.entityCards])

  return (
    <div className="relative w-full h-full">
      <SceneWrapper>
        {/* Actor platforms */}
        {data.platforms.map(platform => (
          <GlassPlatform
            key={platform.actor.id}
            actor={platform.actor}
            position={platform.position}
            selected={selectedActorId === platform.actor.id}
            faded={!!selectedActorId && selectedActorId !== platform.actor.id}
            onClick={(id) => setSelectedActorId(prev => prev === id ? null : id)}
          />
        ))}

        {/* Floating entity cards */}
        {data.entityCards.map(card => (
          <GlassCard
            key={card.id}
            node={card}
            faded={!!selectedActorId && !data.platforms
              .find(p => p.actor.id === selectedActorId)
              ?.actor.responsibilities.some(r =>
                r.description.toLowerCase().includes(card.name.toLowerCase())
              )}
          />
        ))}

        {/* Journey threads */}
        {data.threads.map(thread => {
          if (!visibleThreads.has(thread.journeyId)) return null
          if (thread.points.length < 2) return null
          return thread.points.slice(0, -1).map((from, i) => (
            <ConnectionLine
              key={`thread-${thread.journeyId}-${i}`}
              from={from}
              to={thread.points[i + 1]}
              color={thread.color}
              visible
              thickness={1.5}
              opacity={0.5}
            />
          ))
        })}
      </SceneWrapper>

      {/* Journey thread toggle — bottom-right overlay */}
      <div
        className="absolute right-4 bottom-4 w-52 z-10 rounded-xl overflow-y-auto custom-scroll max-h-64"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#858481' }}>
            Journey Threads
          </p>
          {data.threads.map(thread => (
            <button
              key={thread.journeyId}
              onClick={() => toggleThread(thread.journeyId)}
              className="w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors mb-0.5 flex items-center gap-2"
              style={{
                background: visibleThreads.has(thread.journeyId) ? 'rgba(16,185,129,0.08)' : 'transparent',
                color: visibleThreads.has(thread.journeyId) ? thread.color : '#5E5E5B',
                fontWeight: visibleThreads.has(thread.journeyId) ? 600 : 400,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: visibleThreads.has(thread.journeyId) ? thread.color : '#D4D4D4' }}
              />
              <span className="truncate">{thread.journeyName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire Domains into explorer-tabs.tsx**

Add `import { DomainsView } from './views-3d/domains/domains-view'` and replace the Domains placeholder with `<DomainsView model={model} />`.

- [ ] **Step 3: Test in browser**

Open `http://localhost:4444`, 3D tab → Domains. Verify:
- Actor platforms render at different Z-depths, tilted toward camera
- Platform content shows name, auth badge, responsibility rows
- Entities float between platforms (shared entities in overlap zones)
- Click actor: zooms/selects, fades unrelated platforms
- Journey thread toggles show/hide colored connection lines

- [ ] **Step 4: Commit**

```bash
git add src/components/explorer/views-3d/domains/ src/components/explorer/explorer-tabs.tsx
git commit -m "feat(3d): add Domains view with actor platforms and journey threads"
```

---

## Task 16: Polish & verify

- [ ] **Step 1: Run full type check and lint**

```bash
npx tsc --noEmit && pnpm lint
```

Fix any errors.

- [ ] **Step 2: Test all four views in browser**

Walk through each view checking:
- Galaxy: clustering, filters, connections, presentation mode
- Flows: journey selection, step-through, branching cards
- Anatomy: entity selection, lifecycle rail, orbiting cards
- Domains: platforms, floating entities, journey threads

- [ ] **Step 3: Performance check**

Open browser DevTools → Performance tab. Verify:
- Idle (no interaction): 0 frames rendered (on-demand mode)
- Orbiting: consistent 60fps
- Galaxy with all nodes visible: < 300 draw calls

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(3d): polish and performance pass across all four views"
```

- [ ] **Step 5: Final push**

```bash
git push
```
