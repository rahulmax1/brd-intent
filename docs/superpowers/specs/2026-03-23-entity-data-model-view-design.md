# Entity Data Model View

## Overview

A new `/review/data-model` route that renders intent model entities as ERD-style table cards using React Flow. Each entity appears as a database table node showing all key fields with types, connected by inferred relationship edges. The view gives the team a database-schema-like perspective on the intent model for verifying against dev team output.

## User Story

As a reviewer, I want to see intent model entities laid out like a database ERD (table cards with field rows and relationship lines) so I can quickly verify the dev team's data model against the intent model.

## Data Source

All data comes from the existing `intentModel` in `src/domain/intent-model/model.ts`. No new data structures needed.

- **Entities** (domain only, `is_integration !== true`): rendered as table card nodes
- **Integration entities** (`is_integration === true`): rendered as smaller, visually distinct nodes (dashed border, muted color)
- **Relationships**: inferred using existing `findEntityEdges()` from `explorer-graph.ts`
- **Fields**: from `entity.key_fields` — each has `name`, `type`, `description`
- **Lifecycle states**: from `entity.lifecycle.states`

## Components

### 1. Page Route — `src/app/review/data-model/page.tsx`

Server component. Reads `intentModel`, passes to client canvas. Full-width route (no chat panel, no content card wrapper — same treatment as IA Map, Diff, BRD, Docs).

### 2. Data Model Canvas — `src/components/data-model/data-model-canvas.tsx`

Client component. Wraps `<ReactFlow>` with:
- Custom `tableNode` node type registered
- Integration nodes as a second custom type `integrationNode`
- Dagre auto-layout (top-to-bottom, `rankdir: 'TB'`) to mimic the dbdiagram.io vertical flow
- `Background` (dots), `MiniMap`, `Controls`
- `fitView` on mount with `fitViewOptions: { padding: 0.08, maxZoom: 1 }` (matches IA map convention)
- Toolbar at top: entity count, integration count, fit-to-view button

### 3. Table Node — `src/components/data-model/table-node.tsx`

Custom React Flow node for domain entities. Visual structure:

```
+------------------------------------+
| [blue accent bar]                  |
| Entity Name              3 states  |
+------------------------------------+
| field_name     type                |
| field_name     type                |
| field_name     type                |
| ...                                |
+------------------------------------+
| [lifecycle footer: state pills]    |
+------------------------------------+
```

- **Header**: entity name (bold, 13px), state count badge (muted). Blue left accent bar (4px, `var(--accent-blue)`).
- **Field rows**: alternating subtle background for readability. Field name in mono (12px), type in muted mono (11px). Hover a row to see field description in a tooltip.
- **Lifecycle footer**: compact row of state pills (10px, muted background). Only shown if entity has states.
- **Integration variant**: dashed border, gray accent bar instead of blue, italic "Integration" subtitle.
- **Warn indicators**: fields with `warn` property show a small amber dot next to the field name (same pattern as entity-level warn indicators in the explorer).
- **Handles**: all four positions — left/top (target), right/bottom (source). For TB layout, the dominant connection path is `bottom` (source) → `top` (target). Reuse `pickHandles()` logic from `explorer-graph.ts` to dynamically select the best handle pair based on relative node positions.

Styling follows existing patterns:
- `rounded-xl`, `background: var(--bg-white)`, `border: 1px solid var(--border-default)`
- `boxShadow: var(--shadow-subtle)`, hover: `0 4px 16px rgba(0,0,0,0.08)`
- Selected state: blue ring (`0 0 0 3px ${ENTITY_COLOR}33`)

### 4. Integration Node — `src/components/data-model/integration-node.tsx`

Smaller node for integration entities. Shows just the name, direction (inbound/outbound from description), and a dashed border. No field rows (integrations have minimal fields). Uses a distinct icon (e.g., `Plug` from lucide). Fixed height: 56px, width: 200px.

### 5. Graph Builder — `src/components/data-model/data-model-graph.ts`

Builds React Flow nodes and edges from the intent model:
- Filters entities into domain vs integration
- Reuses `findEntityEdges()` from `explorer-graph.ts` for relationship inference
- Runs dagre layout with `rankdir: 'TB'`, `nodesep: 60`, `ranksep: 100`
- Node dimensions are computed dynamically: width = 280px fixed, height = header (40px) + fields (field_count * 28px) + footer (32px if has states, 0 otherwise)
- Integration node dimensions: 200px wide, 56px tall (fixed)
- Edge styling: same gray arrows as explorer, labels truncated to 25 characters
- Handle selection: reuse `pickHandles()` from `explorer-graph.ts`, with TB layout meaning `bottom→top` is the dominant path

## Navigation

Add "Data Model" to `navItems` in `src/components/review/nav-links.tsx`:
- Label: "Data Model"
- Icon: `TableProperties` from lucide-react
- Href: `/review/data-model`
- Position: after "IA Map", before "Diff"

Add `/review/data-model` to `FULL_WIDTH_ROUTES` in `src/components/review/layout-shell.tsx`.

Update the `isActive` logic for "Consensus" in `nav-links.tsx`: add `&& !pathname.startsWith('/review/data-model')` to the existing exclusion chain (line 47).

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/app/review/data-model/page.tsx` | Server component | Route page |
| `src/components/data-model/data-model-canvas.tsx` | Client component | React Flow wrapper |
| `src/components/data-model/data-model-graph.ts` | Utility | Graph builder (nodes, edges, layout) |
| `src/components/data-model/table-node.tsx` | Client component | Table card node |
| `src/components/data-model/integration-node.tsx` | Client component | Integration node |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/review/nav-links.tsx` | Add "Data Model" nav item, update Consensus active logic |
| `src/components/review/layout-shell.tsx` | Add `/review/data-model` to `FULL_WIDTH_ROUTES` |

## No New Dependencies

Everything uses existing packages: `@xyflow/react`, `@dagrejs/dagre`, `lucide-react`.

## Out of Scope

- No DBML import/parsing
- No comparison/diff against intent model
- No annotations or review status
- No position persistence (dagre auto-layout only)
- No detail panel on click (may add later)
