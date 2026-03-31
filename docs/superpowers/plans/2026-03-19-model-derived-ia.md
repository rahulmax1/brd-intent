# Model-Derived IA Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static IA data file with a model-derived graph that auto-syncs descriptions and business rules from the intent model, with manual screen definitions, edges, and position overrides in a JSON file.

**Architecture:** Screen definitions, edges, lane config, and position overrides live in `ia-positions.json`. At render time, `ia-graph.ts` reads this file + the intent model, enriches nodes with model-derived descriptions and business rule refs, and generates React Flow nodes/edges. Dagre handles fallback auto-layout for unpositioned nodes.

**Tech Stack:** Next.js 16, React 19, @xyflow/react 12, dagre, zod, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-19-model-derived-ia-design.md`

---

### Task 1: Install dagre and create types

**Files:**
- Create: `src/components/ia/ia-types.ts`

- [ ] **Step 1: Install dagre**

```bash
pnpm add @dagrejs/dagre
```

- [ ] **Step 2: Create ia-types.ts with Zod schemas**

```ts
import { z } from 'zod'
import type { LucideIcon } from 'lucide-react'

// --- JSON file schemas (ia-positions.json) ---

export const screenDefSchema = z.object({
  label: z.string(),
  icon: z.string(),
  actor: z.string(),
  refs: z.array(z.string()),
  status: z.enum(['done', 'partial', 'not-built']),
})

export const edgeDefSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  cross: z.boolean().optional(),
})

export const laneDefSchema = z.object({
  y: z.number(),
  height: z.number(),
  color: z.string(),
  label: z.string().optional(),
})

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const iaPositionsSchema = z.object({
  _screens: z.record(z.string(), screenDefSchema),
  _edges: z.record(z.string(), edgeDefSchema),
  _lanes: z.record(z.string(), laneDefSchema),
}).catchall(positionSchema)

// --- Runtime types ---

export type ScreenDef = z.infer<typeof screenDefSchema>
export type EdgeDef = z.infer<typeof edgeDefSchema>
export type LaneDef = z.infer<typeof laneDefSchema>
export type IAPositions = z.infer<typeof iaPositionsSchema>

export type IANodeData = {
  label: string
  icon: LucideIcon
  status: 'done' | 'partial' | 'not-built'
  actor: string
  description: string
  refs: string[]
}

export type LaneNodeData = {
  label: string
  color: string
  width: number
  height: number
}

export type DriftWarning = {
  type: 'unmapped-responsibility' | 'stale-ref' | 'removed-actor'
  message: string
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ia/ia-types.ts package.json pnpm-lock.yaml
git commit -m "feat(ia): add dagre dep and ia-types with zod schemas"
```

---

### Task 2: Create ia-positions.json

Migrate all current static data from `ia-data.ts` into the new JSON format. This is the single source of truth for screen definitions, edges, lanes, and positions.

**Files:**
- Create: `src/components/ia/ia-positions.json`

- [ ] **Step 1: Create ia-positions.json**

The file must contain all 34 screens, all edges (in-lane + cross-actor), lane config, and positions extracted from the current `ia-data.ts`. Use model-native IDs for `refs` (e.g., `lsp:r1` not `LSP-r1`). Screen IDs stay as-is (`wff-dashboard`, `acfs-slots`, etc.).

Key structure:
```json
{
  "_screens": { ... all 34 screen definitions ... },
  "_edges": { ... all in-lane + cross-actor edges ... },
  "_lanes": {
    "lsp": { "y": 20, "height": 240, "color": "#0081F2", "label": "WFF / LSP" },
    "p4tc": { "y": 300, "height": 200, "color": "#7C3AED", "label": "P4TC" },
    "acfs": { "y": 580, "height": 340, "color": "#002C61", "label": "ACFS Internal" },
    "gatehouse": { "y": 980, "height": 140, "color": "#D97706", "label": "Gatehouse" },
    "shared": { "y": 1200, "height": 140, "color": "#6B7280", "label": "Shared" }
  },
  "wff-login": { "x": 60, "y": 80 },
  ... all other node positions from current ia-data.ts ...
}
```

**Actor ID mapping:** All 9 WFF screens must use `"actor": "lsp"` (not `"wff"` — the model actor ID is `lsp`).

**Responsibility ID mapping:** Convert old format to model IDs:
- `LSP-r1` → `lsp:r1`, `ACFS-r4` → `acfs:r4`, `P4TC-r1` → `p4tc:r1`, `GH-r1` → `gatehouse:r1`

**Journey ID mapping (full table):**
| Old ref | Model journey ID |
|---------|-----------------|
| `J-001` | `acfs-assigns-hbls` |
| `J-002` | `acfs-configures-slots` |
| `J-003` | `lsp-delegates-shipments` |
| `J-004` | `lsp-books-pickup` |
| `J-005` | `p4tc-books-pickup` |
| `J-006` | `acfs-validates-dos` |
| `J-007` | `acfs-verifies-pickup` |
| `J-008` | `lsp-cancels-booking` |
| `J-009` | `acfs-cancels-booking` |
| `J-010` | `acfs-creates-user` |

**IDs that stay as-is:** `BR-001`, `OQ-019`, `C-003`, etc. (already match model format).

**Note:** `acfs:r3` (Slot Configuration responsibility) should be added to the `acfs-slots` screen refs. `acfs:r10` (Flag HBL as under-bond, ACFS side) has no screen — this will show as expected drift.

For edges, convert all `solidEdge()` and `dottedEdge()` calls to `_edges` entries. Add `"cross": true` for cross-actor edges.

Extract exact x/y positions from current code: `x(col)` = `60 + col * 220`, node y offsets from `lanes[n].y + 60 + offset`.

- [ ] **Step 2: Commit**

```bash
git add src/components/ia/ia-positions.json
git commit -m "feat(ia): add ia-positions.json with screen defs, edges, lanes, positions"
```

---

### Task 3: Create icon map

**Files:**
- Create: `src/components/ia/ia-icons.ts`

- [ ] **Step 1: Create the static icon lookup map**

```ts
import {
  LogIn, LayoutDashboard, ArrowRightLeft, CalendarCheck,
  Eye, XCircle, Upload, Flag, FileQuestion, Link2,
  KeyRound, Users, Forward, Settings, Search, FileCheck,
  ClipboardCheck, UserPlus, Layers, ShieldCheck, RotateCcw,
  SplitSquareHorizontal, Pencil, Ban, ScanLine, DoorOpen,
  ListOrdered, Bell, CreditCard, HelpCircle, Map,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  LogIn, LayoutDashboard, ArrowRightLeft, CalendarCheck,
  Eye, XCircle, Upload, Flag, FileQuestion, Link2,
  KeyRound, Users, Forward, Settings, Search, FileCheck,
  ClipboardCheck, UserPlus, Layers, ShieldCheck, RotateCcw,
  SplitSquareHorizontal, Pencil, Ban, ScanLine, DoorOpen,
  ListOrdered, Bell, CreditCard, HelpCircle, Map,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ia/ia-icons.ts
git commit -m "feat(ia): add icon lookup map for string-to-component resolution"
```

---

### Task 4: Create ia-graph.ts — the graph generator

This is the core file. It reads the intent model + positions JSON and produces React Flow nodes and edges.

**Files:**
- Create: `src/components/ia/ia-graph.ts`

- [ ] **Step 1: Create ia-graph.ts**

```ts
import dagre from '@dagrejs/dagre'
import { MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { IntentModel } from '@/domain/intent-model/types'
import type { IAPositions, IANodeData, LaneNodeData, DriftWarning } from './ia-types'
import { ICON_MAP } from './ia-icons'

const LANE_WIDTH = 1160
const NODE_WIDTH = 180
const NODE_HEIGHT = 50

export function buildIAGraph(
  model: IntentModel,
  positions: IAPositions,
) {
  const { _screens, _edges, _lanes, ...posOverrides } = positions
  const nodes: Node[] = []
  const edges: Edge[] = []
  const drift: DriftWarning[] = []

  // --- Build lane nodes ---
  for (const [actorId, laneDef] of Object.entries(_lanes)) {
    const label = laneDef.label ?? model.actors.find(a => a.id === actorId)?.name ?? actorId
    nodes.push({
      id: `lane-${actorId}`,
      type: 'lane',
      position: { x: -10, y: laneDef.y },
      data: {
        label,
        color: laneDef.color,
        width: LANE_WIDTH,
        height: laneDef.height,
      } satisfies LaneNodeData,
      selectable: false,
      draggable: false,
      connectable: false,
      style: { zIndex: -1 },
    })
  }

  // --- Build screen nodes ---
  // Collect all responsibility IDs from model for drift detection
  const allModelRefs = new Set<string>()
  const allMappedRefs = new Set<string>()
  for (const actor of model.actors) {
    if (actor.id === 'driver') continue
    for (const r of actor.responsibilities) {
      allModelRefs.add(r.id)
    }
  }

  // Collect all business rules for ref matching
  const brByRef = new Map<string, string[]>()
  for (const br of model.business_rules) {
    for (const ref of br.applies_to) {
      if (!brByRef.has(ref)) brByRef.set(ref, [])
      brByRef.get(ref)!.push(br.id)
    }
  }

  for (const [screenId, screen] of Object.entries(_screens)) {
    // Derive description from model responsibilities
    const descriptions: string[] = []
    const derivedRefs: string[] = [...screen.refs]

    for (const refId of screen.refs) {
      allMappedRefs.add(refId)
      // Find responsibility in model
      let found = false
      for (const actor of model.actors) {
        const resp = actor.responsibilities.find(r => r.id === refId)
        if (resp) {
          descriptions.push(resp.description)
          found = true
          break
        }
      }
      if (!found) {
        drift.push({ type: 'stale-ref', message: `${screenId}: ref "${refId}" not found in model` })
      }
      // Add business rules that apply to this ref
      const brs = brByRef.get(refId)
      if (brs) {
        for (const brId of brs) {
          if (!derivedRefs.includes(brId)) derivedRefs.push(brId)
        }
      }
    }

    const icon = ICON_MAP[screen.icon]
    if (!icon) {
      console.warn(`[IA] Unknown icon "${screen.icon}" for screen "${screenId}"`)
    }

    // Position: use override or dagre will fill in later
    const pos = posOverrides[screenId] as { x: number; y: number } | undefined

    nodes.push({
      id: screenId,
      type: 'ia',
      position: pos ?? { x: 0, y: 0 }, // dagre fills unpositioned
      data: {
        label: screen.label,
        icon: icon ?? ICON_MAP.HelpCircle,
        status: screen.status,
        actor: screen.actor,
        description: descriptions.join(' ') || screen.label,
        refs: derivedRefs,
      } satisfies IANodeData,
    })
  }

  // --- Drift: unmapped responsibilities ---
  for (const refId of allModelRefs) {
    if (!allMappedRefs.has(refId)) {
      drift.push({ type: 'unmapped-responsibility', message: `Responsibility "${refId}" not mapped to any screen` })
    }
  }

  // --- Drift: removed actors ---
  const modelActorIds = new Set(model.actors.map(a => a.id))
  for (const [screenId, screen] of Object.entries(_screens)) {
    if (screen.actor !== 'shared' && !modelActorIds.has(screen.actor)) {
      drift.push({ type: 'removed-actor', message: `${screenId}: actor "${screen.actor}" removed from model` })
    }
  }

  // --- Build edges ---
  for (const [edgeId, edgeDef] of Object.entries(_edges)) {
    const isCross = edgeDef.cross === true
    edges.push({
      id: edgeId,
      source: edgeDef.source,
      target: edgeDef.target,
      type: 'default',
      style: isCross
        ? { stroke: '#858481', strokeWidth: 1.2, strokeDasharray: '6 4', opacity: 0.4 }
        : { stroke: '#858481', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: isCross ? 10 : 12,
        height: isCross ? 10 : 12,
        color: '#858481',
      },
      ...(edgeDef.label && {
        label: edgeDef.label,
        labelStyle: { fontSize: 10, fontWeight: 500, fill: '#858481', fontFamily: 'var(--font-sans)' },
        labelBgStyle: { fill: 'var(--bg-page)', fillOpacity: 0.9 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      }),
      animated: false,
    })
  }

  // --- Dagre fallback for unpositioned nodes ---
  const unpositioned = nodes.filter(
    n => n.type === 'ia' && !(n.id in posOverrides)
  )
  if (unpositioned.length > 0) {
    applyDagreLayout(unpositioned, edges, _lanes)
  }

  // --- Compute stats ---
  const screenNodes = nodes.filter(n => n.type === 'ia')
  const stats = {
    total: screenNodes.length,
    done: screenNodes.filter(n => (n.data as IANodeData).status === 'done').length,
    partial: screenNodes.filter(n => (n.data as IANodeData).status === 'partial').length,
    notBuilt: screenNodes.filter(n => (n.data as IANodeData).status === 'not-built').length,
  }

  return { nodes, edges, drift, stats }
}

function applyDagreLayout(
  unpositioned: Node[],
  edges: Edge[],
  lanes: Record<string, { y: number; height: number }>,
) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 })

  for (const node of unpositioned) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const nodeIds = new Set(unpositioned.map(n => n.id))
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(g)

  for (const node of unpositioned) {
    const dagreNode = g.node(node.id)
    if (dagreNode) {
      const actor = (node.data as IANodeData).actor
      const lane = lanes[actor]
      const laneY = lane?.y ?? 0
      node.position = {
        x: dagreNode.x - NODE_WIDTH / 2 + 60,
        y: laneY + 60 + (dagreNode.y - NODE_HEIGHT / 2),
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ia/ia-graph.ts
git commit -m "feat(ia): add ia-graph.ts — model-derived graph generator with dagre fallback"
```

---

### Task 5: Create position save API route

**Files:**
- Create: `src/app/api/ia/positions/route.ts`

- [ ] **Step 1: Create the API route**

```ts
import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const POSITIONS_PATH = resolve(process.cwd(), 'src/components/ia/ia-positions.json')

export async function POST(req: Request) {
  try {
    const { nodeId, x, y } = await req.json()

    if (!nodeId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const raw = await readFile(POSITIONS_PATH, 'utf-8')
    const data = JSON.parse(raw)

    // Validate nodeId exists in _screens
    if (!data._screens?.[nodeId]) {
      return NextResponse.json({ error: `Screen "${nodeId}" not found` }, { status: 404 })
    }

    // Update position override
    data[nodeId] = { x: Math.round(x), y: Math.round(y) }

    await writeFile(POSITIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[IA] Failed to save position:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ia/positions/route.ts
git commit -m "feat(ia): add API route for saving node position overrides"
```

---

### Task 6: Update the IA page (server component)

Pass the intent model and positions data as props to the client canvas.

**Files:**
- Modify: `src/app/review/ia/page.tsx`

- [ ] **Step 1: Rewrite page.tsx as server component**

```ts
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getCurrentModel } from '@/lib/model-store'
import { IACanvas } from '@/components/ia/ia-canvas'
import { buildIAGraph } from '@/components/ia/ia-graph'
import { iaPositionsSchema } from '@/components/ia/ia-types'

export default async function IAPage() {
  const model = await getCurrentModel()

  const positionsRaw = await readFile(
    resolve(process.cwd(), 'src/components/ia/ia-positions.json'),
    'utf-8',
  )
  const positions = iaPositionsSchema.parse(JSON.parse(positionsRaw))

  const { nodes, edges, drift, stats } = buildIAGraph(model, positions)

  return (
    <div className="h-full w-full overflow-hidden">
      <IACanvas
        initialNodes={nodes}
        initialEdges={edges}
        drift={drift}
        stats={stats}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/ia/page.tsx
git commit -m "feat(ia): wire server component to pass model-derived graph to canvas"
```

---

### Task 7: Update ia-canvas.tsx

Accept props instead of importing static data. Enable dragging with position save. Dynamic stats + drift warnings.

**Files:**
- Modify: `src/components/ia/ia-canvas.tsx`

- [ ] **Step 1: Rewrite ia-canvas.tsx**

Component signature:
```tsx
import type { Node, Edge } from '@xyflow/react'
import type { IANodeData, DriftWarning } from './ia-types'

type IACanvasProps = {
  initialNodes: Node[]
  initialEdges: Edge[]
  drift: DriftWarning[]
  stats: { total: number; done: number; partial: number; notBuilt: number }
}

export function IACanvas({ initialNodes, initialEdges, drift, stats }: IACanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges)
  const [showDrift, setShowDrift] = useState(false)
  // ... rest of component
}
```

Key changes from current file:
- Accept `initialNodes`, `initialEdges`, `drift`, `stats` as props (no more static imports)
- Enable `nodesDraggable={true}` (lane nodes still have `draggable: false` in their data)
- Add `onNodeDragStop` handler that calls `POST /api/ia/positions` with `{ nodeId, x, y }`
- Replace hardcoded stats with `stats` prop
- Add drift warning badge (orange dot + count next to stats, click to expand list)
- Remove `import { nodes as initialNodes, edges as initialEdges } from './ia-data'`
- Update type import: `import type { IANodeData, DriftWarning } from './ia-types'`

Stats section becomes:
```tsx
<span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
  {stats.total} screens
</span>
<div className="h-3 w-px" style={{ background: 'var(--border-default)' }} />
<span className="text-[12px] font-semibold" style={{ color: '#25BA3B' }}>
  {stats.done} done
</span>
<span className="text-[12px] font-semibold" style={{ color: '#F59E0B' }}>
  {stats.partial} partial
</span>
<span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
  {stats.notBuilt} remaining
</span>
```

Drift badge (shown when `drift.length > 0`):
```tsx
{drift.length > 0 && (
  <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowDrift(!showDrift)}>
    <div className="h-2 w-2 rounded-full" style={{ background: '#F59E0B' }} />
    <span className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>
      {drift.length} drift
    </span>
  </div>
)}
```

Drag handler:
```tsx
const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
  if (node.type !== 'ia') return
  fetch('/api/ia/positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId: node.id, x: node.position.x, y: node.position.y }),
  })
}, [])
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ia/ia-canvas.tsx
git commit -m "feat(ia): update canvas with dynamic stats, drift warnings, draggable nodes"
```

---

### Task 8: Update ia-node.tsx and lane-node.tsx imports

**Files:**
- Modify: `src/components/ia/ia-node.tsx:6` — change import from `./ia-data` to `./ia-types`
- Modify: `src/components/ia/lane-node.tsx:4` — change import from `./ia-data` to `./ia-types`

- [ ] **Step 1: Update imports**

In `ia-node.tsx` line 6:
```ts
// Before: import type { IANodeData } from './ia-data'
// After:
import type { IANodeData } from './ia-types'
```

In `lane-node.tsx` line 4:
```ts
// Before: import type { LaneNodeData } from './ia-data'
// After:
import type { LaneNodeData } from './ia-types'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ia/ia-node.tsx src/components/ia/lane-node.tsx
git commit -m "refactor(ia): update node component imports to use ia-types"
```

---

### Task 9: Delete ia-data.ts

**Files:**
- Delete: `src/components/ia/ia-data.ts`

- [ ] **Step 1: Delete the old static data file**

```bash
rm src/components/ia/ia-data.ts
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "ia-data" src/
```

Expected: no results (all imports updated in prior tasks).

- [ ] **Step 3: Commit**

```bash
git add -A src/components/ia/ia-data.ts
git commit -m "refactor(ia): remove static ia-data.ts, replaced by model-derived ia-graph"
```

---

### Task 10: Verify everything works

- [ ] **Step 1: Run TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "ia-|ia/"
```

Expected: no IA-related errors.

- [ ] **Step 2: Start dev server and verify visually**

```bash
pnpm dev
```

Navigate to `http://localhost:3002/review/ia`. Verify:
- All 34 nodes render in correct swimlanes
- Edges (solid in-lane, dotted cross-actor with labels) display correctly
- Hover tooltips show model-derived descriptions + business rule badges
- Stats bar shows dynamic counts
- Nodes are draggable — drag a node and check `ia-positions.json` updated
- If model has unmapped responsibilities, drift badge appears

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(ia): resolve integration issues from model-derived IA migration"
```
