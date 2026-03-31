# Model-Derived IA Map with Position Overrides

## Problem

The IA map (`/review/ia`) uses a static TypeScript file (`ia-data.ts`) with hand-coded nodes, edges, and positions. When the intent model changes (new responsibilities, modified journeys, updated business rules), the IA doesn't reflect those changes. Keeping them in sync requires manual editing.

## Solution

Derive the IA graph from the live intent model at render time, with a separate JSON file for manual overrides (positions, screen groupings, status, cross-actor edge labels).

## ID Convention

All IDs in `ia-positions.json` use the model's native format:
- **Actor IDs**: `lsp`, `p4tc`, `acfs`, `gatehouse` (lowercase, as in model)
- **Responsibility IDs**: `lsp:r1`, `lsp:r4`, `acfs:r6` (colon-separated)
- **Journey IDs**: `lsp-books-pickup`, `acfs-configures-slots` (slug format)
- **Business rule IDs**: `BR-001`, `BR-015` (uppercase, as in model)
- **Screen IDs**: `wff-dashboard`, `acfs-slots` (kebab-case, IA-specific, not from model)

## How It Works

### Node Generation

At render time, the IA page:

1. Reads the current intent model (always latest version) via `getCurrentModel()`
2. Reads the screen definitions + position overrides from `ia-positions.json`
3. Generates React Flow nodes by matching screen definitions to model responsibilities
4. Generates edges: in-lane from `_edges`, cross-actor from `_edges` (all edges are manual)
5. Enriches nodes with model-derived data (descriptions, business rule refs)
6. Applies position overrides; falls back to dagre auto-layout for unpositioned nodes

### Screen Definitions (Manual)

Each screen is defined in `ia-positions.json` under `_screens`:

```json
{
  "_screens": {
    "wff-dashboard": {
      "label": "Dashboard",
      "icon": "LayoutDashboard",
      "actor": "lsp",
      "refs": ["lsp:r1", "lsp:r2"],
      "status": "done"
    },
    "wff-book": {
      "label": "Book Pickup",
      "icon": "CalendarCheck",
      "actor": "lsp",
      "refs": ["lsp:r4"],
      "status": "done"
    }
  }
}
```

Fields:
- `label` — display name on the node
- `icon` — Lucide icon name (resolved via a static `Record<string, LucideIcon>` lookup map of ~20 icons used in the IA)
- `actor` — actor ID from the model (determines which swimlane). Use `shared` for cross-cutting screens
- `refs` — responsibility IDs this screen covers (grouped). Uses model IDs (`lsp:r1` format)
- `status` — `done | partial | not-built` (manual, not derived)

### Lanes

Generated from model actors, excluding `driver` (no portal access). Plus one hardcoded `shared` lane for cross-cutting screens (Bookings List, Notifications, Payment Flow).

Lane visual config under `_lanes`:

```json
{
  "_lanes": {
    "lsp": { "y": 20, "height": 240, "color": "#0081F2" },
    "p4tc": { "y": 300, "height": 200, "color": "#7C3AED" },
    "acfs": { "y": 580, "height": 340, "color": "#002C61" },
    "gatehouse": { "y": 980, "height": 140, "color": "#D97706" },
    "shared": { "y": 1200, "height": 140, "color": "#6B7280" }
  }
}
```

### Edges (All Manual)

All edges — both in-lane and cross-actor — are defined manually in `_edges`. Journey steps in the model are abstract workflow descriptions ("Select shipments", "Validate readiness") that don't map 1:1 to screens, so automatic edge derivation is not reliable.

```json
{
  "_edges": {
    "e-wff-1": { "source": "wff-login", "target": "wff-dashboard" },
    "e-wff-2a": { "source": "wff-dashboard", "target": "wff-delegate" },
    "e-cross-1": { "source": "wff-delegate", "target": "p4tc-magic", "label": "Sends magic link", "cross": true },
    "e-cross-3": { "source": "wff-book", "target": "sh-payment", "label": "Payment redirect", "cross": true }
  }
}
```

Fields:
- `source`, `target` — screen IDs
- `label` — optional, shown on the edge (typically only cross-actor edges)
- `cross` — if true, renders as dotted/transparent; otherwise solid with arrow

### What's Derived from the Model

- **Descriptions** — concatenated from matched responsibility descriptions via `refs`
- **Business rule refs** — business rules whose `applies_to` array includes any of the screen's `refs` are shown as blue badges in the hover tooltip
- **Actor lane existence** — lanes created for each actor in the model (minus driver, plus shared)

### What's Manual (in ia-positions.json)

- **Screen definitions** — which responsibilities map to which screen, labels, icons, status
- **All edges** — in-lane flow edges and cross-actor edges with labels
- **Lane config** — y position, height, color per lane
- **Node positions** — x/y coordinates per screen ID

### Position Overrides

Top-level keys in `ia-positions.json` (excluding `_screens`, `_edges`, `_lanes`) are node position overrides:

```json
{
  "wff-dashboard": { "x": 280, "y": 80 },
  "wff-book": { "x": 500, "y": 80 }
}
```

Nodes with overrides use the stored position. Nodes without overrides get auto-placed using dagre (layered left-to-right layout within their lane).

### Drift Detection

When the model changes, the IA page detects and flags drift in the stats bar:

- **Unmapped responsibility** — a responsibility exists in the model but no screen in `_screens` references it → orange warning: "2 unmapped responsibilities"
- **Stale reference** — a screen references a responsibility ID that no longer exists in the model → warning: "lsp:r9 not found"
- **Removed actor** — an actor referenced by screens no longer exists → warning: "Actor 'xyz' removed"
- **Description changes** — no warning, description updates automatically since it's derived

Drift warnings appear as an orange badge next to the stats. Clicking shows the issue list.

### Stats Bar

The stats bar is dynamically computed from generated nodes:
- Total screens = number of `_screens` entries
- Done/Partial/Not built = counted from `status` field on each screen
- Replaces current hardcoded values

### Icon Resolution

Icons stored as string names in `_screens` are resolved via a static lookup map:

```ts
const ICON_MAP: Record<string, LucideIcon> = {
  LogIn, LayoutDashboard, ArrowRightLeft, CalendarCheck,
  Eye, XCircle, Upload, Flag, FileQuestion, Link2,
  KeyRound, Users, Forward, Settings, Search, FileCheck,
  ClipboardCheck, UserPlus, Layers, ShieldCheck, RotateCcw,
  SplitSquareHorizontal, Pencil, Ban, ScanLine, DoorOpen,
  ListOrdered, Bell, CreditCard,
}
```

~30 icons bundled. New icons added to the map as needed.

### Draggable Nodes + Save

`nodesDraggable` is enabled on screen nodes (not lane nodes). When a user drags a node, the new position is saved:

- `POST /api/ia/positions` — receives `{ nodeId, x, y }`, validates `nodeId` exists in `_screens`, updates `ia-positions.json`
- Triggered on drag end (not every pixel)
- Only writes the position override, doesn't touch `_screens` or `_edges`
- **Dev only** — filesystem writes work locally. On Vercel, positions are read-only from the committed JSON file.

### Model Versioning

The IA always renders against the latest model version (`getCurrentModel()`). It does not support viewing historical model versions — the IA is a living map of the current state. Drift detection compares current screens against current model only.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ia/ia-data.ts` | Delete | Replaced by ia-graph.ts |
| `src/components/ia/ia-graph.ts` | New | Reads model + positions JSON, generates nodes/edges, applies dagre fallback, computes drift |
| `src/components/ia/ia-positions.json` | New | Screen definitions, edges, lane config, position overrides |
| `src/components/ia/ia-types.ts` | New | Types for positions JSON structure, Zod schema for validation |
| `src/components/ia/ia-canvas.tsx` | Modify | Enable dragging, add save handler, dynamic stats, drift warnings |
| `src/components/ia/ia-node.tsx` | Minor | Accept model-derived description instead of static |
| `src/components/ia/lane-node.tsx` | No change | |
| `src/app/review/ia/page.tsx` | Modify | Server component passes model + positions as props |
| `src/app/api/ia/positions/route.ts` | New | API to save position overrides on drag (dev only) |

## Dependencies

- `dagre` — layered graph layout for auto-positioning (~15KB). Used as fallback for nodes without position overrides.
- No other new dependencies.

## What Doesn't Change

- Visual design (node appearance, lane styling, legend)
- Edge styling (solid in-lane with arrows, dotted cross-actor with labels)
- Hover tooltips with descriptions + ref badges
- MiniMap, pan/zoom behavior
- Lane node component
