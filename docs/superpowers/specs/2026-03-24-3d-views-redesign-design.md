# 3D Views Redesign — Design Spec

> Replace the current three 3D views (force graph, lifecycle, actor layers) with four new views built on a shared visual language. The views serve dual purpose: daily working tool for the team and portfolio/presentation piece.

## Visual Language

### Canvas
- Off-white (#F8F8F7) background with subtle depth fog fading to cooler white at distance
- No dark mode, no space aesthetic

### Cards (core unit)
Every model item renders as a floating card in 3D space — no spheres, no meshes.

- Frosted glass panels — semi-transparent white (#FFFFFF at 70-85% opacity), soft backdrop blur, thin 1px border (white at 30%)
- Subtle drop shadow for elevation
- Rounded corners (8px)
- Content: Lucide icon + name + one key stat (field count, step count, etc.) in DM Sans
- Cards billboard toward camera (always face you)
- Type-coded left edge strip (4px):
  - Entity: #0081F2
  - Actor: #8B5CF6
  - Journey: #10B981
  - Rule: #F59E0B
  - Constraint: #EF4444
  - Open Question: #EC4899

### Connections
- Thin lines (1px), light gray (#D4D4D4) by default
- Animate to type color on hover/selection
- Slight curve (quadratic bezier), not straight

### Interactions
- **Hover card:** slight scale up (1.05x), shadow deepens, connections highlight
- **Click card:** glow ring in type color, connected cards pull slightly closer, unrelated cards fade to 40% opacity
- **Double-click card:** opens detail in existing side panel
- **Camera:** orbit controls (drag rotate, scroll zoom, right-drag pan), smooth 300ms transitions

### Lighting
- Soft ambient + one directional light from upper-left
- No dramatic shadows — glass panels feel naturally lit, like objects on a desk near a window

### Post-processing
- Soft ambient occlusion for depth
- No bloom
- Optional subtle depth-of-field on far cards when something is selected

### Card Rendering Strategy
Cards are **canvas-drawn textures on billboarded planes** — not HTML overlays. Each card renders its content (icon, text, stat) to an offscreen canvas, then applies it as a texture to a `PlaneGeometry` with `MeshStandardMaterial` (opacity 0.75-0.85, transparent). This avoids the performance ceiling of Drei's `<Html>` (separate DOM overlay per instance, backdrop-filter kills FPS at scale).

The frosted glass look comes from the material, not CSS: semi-transparent white with a subtle environment map reflection and soft emissive tint. No `<MeshTransmissionMaterial>` (too expensive — extra render pass per card). Reserve `<Html>` only for the single hovered/focused card tooltip if canvas text isn't sufficient.

Card sizes in scene units:
- **Large** (Anatomy main panel, Domains platforms): 8 × 6
- **Medium** (Galaxy entities/actors/journeys, Flow step cards): 4 × 3
- **Small** (Galaxy rules/constraints, orbiting cards, branch cards): 2.5 × 2

### Rendering Model
- **On-demand rendering** by default — only re-render when scene state changes (selection, hover, filter toggle, camera move)
- **Continuous loop** activates during: presentation mode auto-orbit, particle drift on selected connections, step-through animation, entry/exit transitions
- Continuous loop deactivates when interaction ends (e.g., deselection stops particle drift)

### Tech Stack
- React Three Fiber + Drei (replacing raw 3d-force-graph)
- Key Drei utilities: `<Billboard>`, `<Float>`, `<OrbitControls>`, `<Text>` (for cluster labels)
- `d3-force-3d` for Galaxy seeded layout (standalone, not bundled in 3d-force-graph)
- `@react-three/postprocessing` — SSAO for depth (applied to WebGL layer only, not HTML overlays)
- Desktop-only — no tablet/mobile targets. Minimum viewport: 1024px wide.

---

## View 1 — Galaxy

The "see everything" overview. All model items floating in 3D space.

### Layout
Items cluster by type in soft zones — archipelago, not spreadsheet:
- Entities cluster center (gravitational core)
- Actors float upper-left
- Journeys arc across the right
- Rules scatter lower-center
- Constraints and open questions at the periphery

Positioning uses `d3-force-3d` with a deterministic seed (hash of model version + item count). Type-specific cluster forces pull items toward their zone center. Runs 300 ticks on mount, then locks all positions. Same layout every time for the same model — no randomness between visits.

Force parameters:
- `forceCenter` at origin
- `forceManyBody` charge: -60
- `forceLink` distance: 25 (cross-reference edges)
- Custom radial forces per type pushing toward zone centers (entities→origin, actors→upper-left, journeys→right, rules→lower-center, constraints/questions→periphery)

### Cards
Standard glass cards. Size varies by importance:
- **Entities:** larger cards — name + field count + lifecycle state count
- **Actors:** medium — name + responsibility count
- **Journeys:** medium — name + step count + primary actor badge
- **Rules:** smaller — name + applies_to count
- **Constraints/questions:** smallest

### Connections
Cross-reference lines hidden by default. Appear on hover/selection. Subtle particle drift along connections on selection (2-3 small dots traveling the line).

### Cluster Labels
Floating translucent text ("Entities", "Actors", etc.) behind each cluster, large and faded (15% opacity).

### Filter Bar
Bottom of canvas. Pill buttons to toggle type visibility (filled = active, outline = inactive). Default: all types visible. Cards animate in/out with soft fade + scale. Filtering hides cards in-place (no re-layout) and hides their connections.

### Presentation Mode
Button or keyboard shortcut. Auto-orbits camera slowly. Cards face camera as it moves.

---

## View 2 — Flows

Journey visualizer. Select a journey, see it unfold as a spatial path.

### Layout
Horizontal left-to-right. Each step is a glass card on a gentle S-curved rail. Steps alternate slightly forward/back on Z axis — ribbon feel, not flat.

### Rail
Thin translucent line (#10B981 at 30% opacity) connecting step cards.

### Step Cards
Larger than Galaxy cards:
- Step number (top-left, bold)
- Title
- Detail text (2 lines max, truncated)
- Precondition badge if present (small amber tag)
- Warn/edge flags as small indicator dots

### Branching Cards
Each step surfaces what it touches as smaller cards branching vertically:
- Actor cards branch up (purple edge strip)
- Entity cards branch down-left (blue)
- Rule cards branch down-right (amber)
- Connected by curved lines to the step card

**How step→item relationships are inferred:** The model does not store per-step references. `flows-data.ts` infers them by text matching step `title` and `detail` against entity names, actor names, and rule `applies_to` arrays — the same heuristic the existing lifecycle/actor views use for classification. The journey's `primary_actor` is always linked to step 1. This is imprecise but good enough — false positives (an extra card) are harmless, false negatives (a missing card) can be manually tagged later if the model adds per-step refs.

### Journey Selector
Left sidebar overlay (glass style). Lists all 14 journeys. Click to load. Entry animation: rail draws left-to-right, step cards pop in sequentially (80ms stagger), branch cards fade in after.

### Step-Through Mode
Play button. Camera focuses on step 1, advances on timer (2s) or arrow keys. Connected cards highlight as each step activates.

### Idle State
Before selection: all 14 journey cards in a loose grid with name + primary actor + step count. Click to enter flow view.

---

## View 3 — Anatomy

Entity deep-dive. Select an entity, see its full structure spatially.

### Main Panel
Large frosted glass panel at center — the "specimen on the table":
- Entity name and description
- Full field list as rows (name, type, description)
- Fields with `warn` flags get amber dot
- Integration entities get gray "Integration" badge top-right

### Lifecycle Rail
Horizontal rail below main panel:
- Each state is a small glass card on a timeline, left-to-right
- Directional arrows between states, labeled with `transition.trigger` text (small type below the arrow)
- `transition.guard` rendered as a tiny lock icon on the arrow with guard text on hover
- `transition.from` → `transition.to` determines arrow direction and position on the rail

### Orbiting Cards
Related items float around the main panel:
- Actors who interact → upper-left
- Journeys that reference → right
- Rules that apply → below-right
- Other entities with field references → left

Connected by curved lines using the orbiting card's type color.

### Entity Selector
Glass sidebar. 12 entities listed (7 domain, 5 integrations separated by divider). Selection animation: main panel scales from center, lifecycle rail draws in, orbiting cards fade in.

### Field Hover
Hover a field row → if it references another entity, the connection line to that entity's orbiting card pulses.

### Idle State
All entities as medium glass cards in a loose cluster. Domain entities front/center, integrations slightly behind and smaller.

---

## View 4 — Domains

Actor-centric. Who owns what, how worlds overlap.

### Platforms
Each actor gets a rectangular frosted glass platform (landscape, wider than tall), angled ~15° toward camera:
- Actor name (large, top-left)
- Auth method badge (top-right — "Password", "Magic Link + OTP", "Email Only", etc.)
- Responsibilities as compact rows on the platform surface

### Depth Ordering
Actors with more connections sit closer to camera:
- ACFS closest (most responsibilities)
- Driver furthest (fewest connections)

### Floating Entities
Entities float between platforms as small glass cards. Entities referenced by multiple actors sit in the overlap zone — showing shared ownership visually. HBL in the middle (everyone touches it). Driver Record close to LSP/ACFS only.

### Journey Threads
Thin colored lines threading from actor platforms through entities:
- Each journey a different shade of green
- Hidden by default, toggle from journey filter list
- Shows how a workflow weaves across actor domains

### Click Actor
Camera zooms to that platform. Responsibilities expand to show descriptions. Connected entities pull closer, unrelated platforms fade. Connected journeys auto-highlight.

### Idle State
All platforms visible, overview perspective. Entities floating in spaces between. Spatial arrangement tells the story — ACFS at center, P4TC and Driver at edges.

---

## Migration Notes

### What gets removed
- `src/components/explorer/graph-3d.tsx` (force graph)
- `src/components/explorer/graph-3d-lifecycle.tsx` (lifecycle)
- `src/components/explorer/graph-3d-actors.tsx` (actor layers)
- `3d-force-graph` dependency

### What gets added
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — helper components (Billboard, Html, Float, OrbitControls, etc.)
- `@react-three/postprocessing` — ambient occlusion, optional depth-of-field

### File structure (proposed)
```
src/components/explorer/
  views-3d/
    shared/
      glass-card.tsx        — reusable card component
      connection-line.tsx   — curved bezier connection
      scene-wrapper.tsx     — canvas, lighting, camera, post-processing
      use-graph-layout.ts   — seeded force layout hook
    galaxy/
      galaxy-view.tsx
      galaxy-data.ts        — model → galaxy nodes/edges
    flows/
      flows-view.tsx
      flows-data.ts         — model → journey path data
      journey-selector.tsx
    anatomy/
      anatomy-view.tsx
      anatomy-data.ts       — model → entity structure data
      entity-selector.tsx
    domains/
      domains-view.tsx
      domains-data.ts       — model → actor platform data
  explorer-tabs.tsx          — updated tab switcher (4 new tabs)
```

### Routing
All four views live as tabs within the existing explorer page (same as current 3D views). The explorer's detail panel (`detail-panel.tsx`) handles double-click → detail. Tab switcher (`explorer-tabs.tsx`) updated with: Galaxy, Flows, Anatomy, Domains (replacing Force Graph, Lifecycle, Actor Layers).

### Domains platform component
The Domains view platforms are a separate `glass-platform.tsx` component — not a variant of `glass-card.tsx`. Platforms are tilted planes with multi-row content, not billboarded single-stat cards. They share the same material (semi-transparent white, environment map) but have different geometry and layout logic.

### Connection component variants
`connection-line.tsx` is a base component (curved bezier between two points). View-specific behaviors are props:
- `visible` — Galaxy hides by default, others show
- `color` — default gray, overridden by type color or journey color
- `animated` — particle drift on/off
- `thickness` — thin for Galaxy/Anatomy, slightly thicker for Flows rail and Domains threads

### Deferred items
Items with `deferred: true` (some actors, journeys) render with reduced opacity (50%) and a dashed left edge strip instead of solid. Present in all views but visually recede.

### Performance budget
- Target 60fps on mid-range laptop
- < 300 draw calls
- Instanced geometry for repeated shapes
- On-demand rendering (no continuous animation loop except presentation mode)
- DPR capped at 1.5 on high-density displays
