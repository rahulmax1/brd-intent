# Intent Model Explorer — Design Spec

## Overview

An interactive graph-based explorer for the VBS intent model. Replaces the current `/` redirect with a full-viewport React Flow canvas showing entities as primary nodes. Clicking an entity reveals related items (rules, journeys, actors, constraints, open questions) as satellite nodes with a detail panel.

## Goals

- Let users visually browse entity relationships and cross-references without navigating between review pages
- Progressive disclosure: clean entity graph by default, satellites on demand
- Read-only — no review controls, no editing

## Route & Navigation

- **Route:** `/` — the explorer becomes the app landing page
- **Current `/` behavior** (redirect to `/review`) is removed
- **Nav sidebar:** Add "Explorer" link at the top of `navItems` in `nav-links.tsx`, pointing to `/`, with a `Network` icon from lucide-react
- **Layout:** The explorer page renders `NavSidebar` directly in its own page component (not via the review layout). The `/` route does not go through `src/app/review/layout.tsx` — it uses only the root layout. The page imports and renders `NavSidebar` alongside the canvas in a flex row, matching the review layout's visual structure but without the toolbar, reviewer selector, or chat panel.

## Page Structure

```
┌──────────┬─────────────────────────────────┬──────────┐
│          │                                 │          │
│   Nav    │     React Flow Canvas           │  Detail  │
│  Sidebar │     (entity graph)              │  Panel   │
│  (200px) │                                 │ (400px)  │
│          │     ┌───┐    ┌───┐              │          │
│          │     │HBL│────│Bkg│              │          │
│          │     └───┘    └───┘              │          │
│          │                                 │          │
│          │  [Legend]            [Stats]     │          │
└──────────┴─────────────────────────────────┴──────────┘
```

Detail panel is hidden by default, slides in from the right on node click.

## Component Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Replace redirect with explorer page (server component) |
| `src/app/layout.tsx` | Root layout — already exists, no changes needed |
| `src/components/explorer/explorer-canvas.tsx` | Main canvas component (client) |
| `src/components/explorer/explorer-node.tsx` | Custom React Flow node for entities |
| `src/components/explorer/satellite-node.tsx` | Custom React Flow node for satellite items |
| `src/components/explorer/detail-panel.tsx` | Right-side slide-out detail panel |
| `src/components/explorer/explorer-graph.ts` | Graph builder — derives nodes, edges, relationships from model |
| `src/components/explorer/explorer-types.ts` | TypeScript types for explorer-specific data |

### Modified Files

| File | Change |
|------|--------|
| `src/components/review/nav-links.tsx` | Add "Explorer" nav item pointing to `/` |
| `src/components/review/nav-links.tsx` (active state) | Update `isActive` logic so `/` highlights the Explorer link correctly |

## Cross-Reference Engine

### `buildExplorerGraph(model: IntentModel)`

Pure function. Takes the model, returns the full relationship map and React Flow nodes/edges.

#### Entity-to-Entity Edges (default graph)

Derived by scanning each entity's `key_fields`:
- If a field's `type` or `description` contains another entity's id or name (case-insensitive), create a relationship edge
- Also scan `lifecycle.transitions` — if `trigger` or `guard` text mentions another entity

Edge data includes a `reason` string (e.g., "field: slot_id", "transition: LSP assigns HBL").

#### Entity-to-Satellite Relationships (on click)

For each entity, find related items by text matching against the entity's `id` and `name`:

- **Business rules:** `applies_to` array entries match entity id, name, or field names
- **Journeys:** Entity name appears in journey `name`, `steps[].title`, `steps[].detail`, or `preconditions`
- **Actors:** Entity name appears in `responsibilities[].description`
- **Constraints:** Entity name appears in `constraint` text
- **Open questions:** Entity name appears in `question` or `reason` text

#### Return Type

```typescript
type ExplorerGraphData = {
  entityNodes: Node<ExplorerNodeData>[]
  entityEdges: Edge[]
  relationshipMap: Map<string, EntityRelationships>
}

type EntityRelationships = {
  entityEdges: { targetEntityId: string; reason: string }[]
  rules: BusinessRule[]
  journeys: Journey[]
  actors: Actor[]
  constraints: Constraint[]
  openQuestions: OpenQuestion[]
}

type ExplorerNodeData = {
  entityId: string
  name: string
  fieldCount: number
  stateCount: number
  description: string
}

type SatelliteNodeData = {
  itemType: 'business_rule' | 'journey' | 'actor' | 'constraint' | 'open_question'
  itemId: string
  label: string
  item: BusinessRule | Journey | Actor | Constraint | OpenQuestion
}
```

## Entity Node (`ExplorerNode`)

Custom React Flow node. Styled to match the app's Linear-like aesthetic.

- Rounded rectangle with white background, subtle border
- Entity name in semibold
- Small badges: field count, state count
- Handles on all 4 sides for edge connections
- Hover: blue border highlight + tooltip with description
- Selected state: blue glow ring, slightly elevated shadow
- Dimmed state (when another entity is selected): opacity 0.3

## Satellite Nodes (`SatelliteNode`)

Smaller pill-shaped nodes, color-coded by type:

| Type | Color | Example Label |
|------|-------|---------------|
| Business rule | `#F59E0B` (amber) | BR-001 |
| Journey | `#10B981` (green) | LSP Books Pickup |
| Actor | `#8B5CF6` (purple) | LSP |
| Constraint | `#EF4444` (red) | C-001 |
| Open question | `#EC4899` (pink) | OQ-034 |

- Rounded pill shape with colored background, white text
- Hover: slight scale + tooltip with first line of description
- Click: opens detail panel for this item

## Satellite Expansion

When an entity node is clicked:

1. Selected entity gets a blue glow ring
2. All other entity nodes dim (opacity 0.3)
3. Entity-to-entity edges dim (opacity 0.15)
4. Satellite nodes appear in a radial layout around the selected entity
5. Edges connect entity to each satellite, color-matched to satellite type (dashed)
6. Animation: satellites fade in + slide outward from entity center (200ms ease-out)

### Radial Positioning

Satellites distributed in a circle (radius ~250px) around the selected entity. Grouped by type — each type occupies an arc segment:

```
        Rules (amber)
     ╱               ╲
Actors                Journeys
(purple)              (green)
     ╲               ╱
   Constraints    Open Qs
    (red)        (pink)
```

Empty groups are skipped — the remaining types spread to fill the circle.

### Dismissal

- Click canvas background → collapse satellites, restore default graph
- Press `Escape` → same
- Click a different entity → collapse current, expand new

## Detail Panel

Right-side overlay, 400px wide, slides in with 200ms transition.

### Header
- Color-coded type badge (e.g., blue "Entity", amber "Rule")
- Item name/id
- Close button (X icon)

### Entity Detail Content
- Description paragraph
- **Fields table:** name | type | description (reuse pattern from `EntityRenderer`)
- **Lifecycle:** State badges with arrows + collapsible transitions table
- **Related summary:** Grouped counts as clickable links — "4 rules · 2 journeys · 1 constraint". Clicking a group highlights those satellites on the graph.

### Satellite Item Detail Content
Create new lightweight renderer components in `src/components/explorer/detail-panel.tsx` for each item type. These follow the same visual patterns as the existing review renderers (`ActorRenderer`, `JourneyRenderer`, etc. in `section-renderer.tsx`) but are independent components — no shared props, no review dependencies. This avoids coupling to the review system's `EnrichedSectionReview` and `currentReviewerId` props.

- **Actor detail:** description, auth, responsibilities list
- **Journey detail:** primary actor, preconditions, numbered steps, success outcome
- **Rule detail:** id badge, description, applies_to list, source
- **Constraint detail:** type badge, constraint text
- **Open question detail:** status badge, question, reason, resolution (if resolved)

No `ReviewControls`, no `ReviewHistory`, no `StatusBadge`.

## Legend & Stats

### Bottom-left Legend
Floating pill (same pattern as IA canvas legend):
- Color dots for each node type with labels
- Edge style indicators: solid = entity-entity, dashed = entity-satellite

### Top-right Stats
Floating pill:
- Model version + status (e.g., "v0.6.0 · Draft")
- Item counts: "11 entities · 31 rules · 107 total"
- When a node is selected: "Viewing: Booking — 4 rules, 2 journeys, 3 actors"

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Deselect node, close panel, collapse satellites |
| `Arrow Left` / `Arrow Right` | Cycle through entity nodes |
| `F` | Fit view (zoom to fit all nodes) |

## Technical Decisions

- **React Flow** (`@xyflow/react`) — already a dependency, proven in IA canvas
- **Dagre** (`@dagrejs/dagre`) — already a dependency, used for initial entity layout
- **No new dependencies** — radial satellite positioning is a simple trigonometric function, not a force simulation
- **Server component** for the page (passes model data), **client component** for the canvas
- **No API routes needed** — model imported directly as in existing pages
- **No persistence** — graph positions are computed, not saved (unlike IA canvas)

## Out of Scope

- Editing the model from the explorer
- Search/filter across sections
- Deep linking to specific entities (URL params)
- Mobile/responsive layout
- Dark mode adjustments
