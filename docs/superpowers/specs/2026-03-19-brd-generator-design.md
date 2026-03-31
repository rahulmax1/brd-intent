# BRD Generator — Design Spec

**Date:** 2026-03-19
**Status:** Draft
**Project:** ACFS VBS Pickup Portal — Intent Model Review Tool

## Overview

Add the ability to generate a Business Requirements Document (BRD) from the intent model. The BRD auto-regenerates when the model is updated and is available for on-demand export. Output formats: Markdown file and styled PDF (via browser print).

## Goals

1. Auto-generate `docs/generated/BRD.md` whenever the model is edited (local dev)
2. Provide an API endpoint for on-demand Markdown generation
3. Render a styled BRD preview page at `/review/brd` with print-optimized CSS for PDF export
4. Include resolved open questions as inline "Decision" callouts within relevant sections
5. List open/deferred questions in a dedicated section

## Non-Goals

- Server-side PDF generation (using browser print instead)
- AI-generated prose for v1 (deterministic template only)
- Separate BRD versioning (model version history serves this purpose)
- Dashboard section in BRD (model has no dashboard data currently)

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/lib/brd-generator.ts` | Pure function `generateBRD(model) → string` + `writeBRD(model)` helper |
| `src/app/api/brd/route.ts` | `GET` endpoint — returns generated Markdown |
| `src/app/review/brd/page.tsx` | Server component — styled BRD preview page |

### New Client Components

| File | Purpose |
|------|---------|
| `src/app/review/brd/brd-export-buttons.tsx` | `'use client'` component — Export PDF + Export Markdown buttons. Receives `version: string` as prop from the server page. |

### Modified Files

| File | Change |
|------|--------|
| `src/app/api/model/edit/apply/route.ts` | Call `writeBRD()` after `addVersion()` (local dev only) |
| `src/components/review/nav-links.tsx` | Add "BRD" nav item (after "Open Qs", before "IA Map") with `ClipboardList` icon |
| `src/components/review/layout-shell.tsx` | Add `'/review/brd'` to `FULL_WIDTH_ROUTES` array |
| `src/lib/paths.ts` | Add `BRD_OUTPUT_PATH` constant |

## BRD Document Structure

The generated BRD follows a hybrid format — using the original PDF BRD's section naming and narrative style, but expanding to match the intent model's richer data.

### Sections

#### Header

```markdown
# ACFS VBS Pickup Portal — Business Requirements Document

**Version:** 0.5.0
**Status:** Draft
**Last Updated:** 2026-03-18
**Generated from Intent Model:** v0.5.0
```

#### 1. Purpose & Scope

Static template interpolating `model.meta.project`. Lists in-scope and out-of-scope items. In v1 this is a hardcoded paragraph matching the original BRD's scope. Can be AI-enhanced later.

#### 2. Actors — Who Is Involved

Rendered from `model.actors[]`. For each actor:

- **Name** and **description**
- **Authentication method** (`actor.auth`)
- **Responsibilities** — numbered list from `actor.responsibilities[]`
- `warn` fields rendered as admonition blocks
- Resolved open questions that reference this actor rendered as Decision callouts

#### 3. Entities — Key Data with Lifecycle

Rendered from `model.entities[]`. For each entity:

- **Name** and **description**
- **Key Fields** — table with columns: Field, Type, Description
- **Lifecycle States** — bullet list of `lifecycle.states[]`
- **Transitions** — table with columns: From, To, Trigger, Guard
- `warn` fields on fields/transitions rendered as admonitions
- Resolved open questions matching this entity rendered as Decision callouts

#### 4. User Journeys

Rendered from `model.journeys[]`. Grouped by `primary_actor` under sub-headings (e.g., `### LSP Journeys`, `### ACFS Journeys`). For each journey:

- **Name** and **primary actor**
- **Preconditions** — bullet list
- **Steps** — numbered list with title, detail, precondition (if any)
- **Success Outcome**
- `warn`/`edge` fields on steps rendered as admonitions
- Resolved open questions matching this journey rendered as Decision callouts

#### 5. Business Rules

Rendered from `model.business_rules[]`. For each rule:

- **ID** and **description**
- **Applies to:** comma-separated entity/actor references
- **Source:** origin of the rule
- `warn` fields rendered as admonitions

#### 6. Constraints

Rendered from `model.constraints[]`. Grouped by `type` (capacity, pricing, access, compliance, temporal, admin). Each constraint listed with ID and `constraint` field (note: the field is named `constraint`, not `description`).

#### 7. Open Questions & Decision Log

Two sub-sections:

**7a. Open Questions** — `status: 'open' | 'deferred'`

For each:
- **ID**, **question**, **reason**
- Status badge (Open / Deferred)

**7b. Decision Log** — `status: 'resolved'`

All resolved questions listed here as a reference, plus any that weren't matched to inline sections above. For each:
- **ID**, **question**, **resolution**

## Inline Decision Matching

Resolved open questions are matched to BRD sections 2-4 using a deterministic heuristic:

1. Scan `question` and `resolution` text for known IDs: `actors[].id`, `entities[].id`, `journeys[].id`
2. Check `business_rules[].applies_to` for matching entity/actor IDs referenced in the question
3. If matched → render inline as a blockquote callout under the matched section
4. If no match → rendered only in section 7b (Decision Log)

### Callout Formats

```markdown
> **Decision (OQ-003):** Payment provider will be Stripe.
> *Reason: Need for recurring billing support.*
```

```markdown
> ⚠️ **Warning:** Driver cannot self-register — must be added by LSP.
```

```markdown
> 🔄 **Edge case:** If delegation happens after unpack, booking transfers automatically.
```

## API Endpoint

### `GET /api/brd`

**Default response:** `Content-Type: text/markdown` — raw Markdown string.

**Query params:**
- `?format=json` — returns `{ markdown: string, meta: { version: string, project: string, generatedAt: string } }`

**No authentication required** (same as other model APIs in this tool).

**Error handling:** Follows existing API pattern — try/catch with `{ error: string, message: string }` response and 500 status on failure.

## Auto-Generation Trigger

### In `src/app/api/model/edit/apply/route.ts`

After the existing `addVersion(version)` call:

```typescript
await addVersion(version)

// Auto-generate BRD (local dev only — no persistent FS on Vercel)
if (!process.env.KV_REST_API_URL) {
  await writeBRD(version.model)
}
```

### `writeBRD(model: IntentModel)`

Helper in `brd-generator.ts`:

```typescript
export async function writeBRD(model: IntentModel): Promise<void> {
  const markdown = generateBRD(model)
  await mkdir(dirname(BRD_OUTPUT_PATH), { recursive: true })
  await writeFile(BRD_OUTPUT_PATH, markdown, 'utf-8')
}
```

Path constant in `src/lib/paths.ts`:
```typescript
export const BRD_OUTPUT_PATH = path.join(process.cwd(), 'docs', 'generated', 'BRD.md')
```

Output location: `docs/generated/BRD.md` — this directory should be added to `.gitignore` since the BRD is deterministically generated from the model and would create diff noise.

## BRD Preview Page

### Route: `/review/brd`

Server component that renders the BRD directly from model data as styled JSX (not markdown-to-HTML conversion — renders structured sections from the model for full styling control).

### Layout

- Uses the existing review layout (sidebar visible, but chat panel and model toolbar hidden via `FULL_WIDTH_ROUTES`)
- The page renders its own header bar with title + export buttons (similar to how `/review/docs` and `/review/ia` handle their own toolbars)
- Content area: single-column, max-width prose container

### Styling

**Screen styles:**
- Matches review app aesthetic: DM Sans, ACFS navy headings, warm neutral background
- Sections separated by subtle dividers
- Tables styled consistently with the rest of the app
- Callout blocks with left border accent (blue for decisions, amber for warnings, gray for edge cases)

**Print styles (`@media print`):**
- White background, no nav/sidebar/toolbar
- Clean typography, slightly smaller font size for density
- Page breaks: `break-before: page` on major sections (Actors, Entities, Journeys)
- Tables: avoid page break inside rows
- Header with project name and version on first page
- Footer: a DOM element with `className="hidden print:block"` at the bottom of the page showing "Generated from Intent Model v{version} on {date}" (CSS `@page` footers have poor browser support)

### Export Buttons

**"Export PDF":**
```typescript
const handleExportPDF = () => window.print()
```

**"Export Markdown":**
```typescript
const handleExportMarkdown = async () => {
  const res = await fetch('/api/brd')
  const text = await res.text()
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `BRD-v${version}.md`
  a.click()
  URL.revokeObjectURL(url)
}
```

These live in `brd-export-buttons.tsx`, a `'use client'` component. The server page passes `version={model.meta.version}` as a prop.

## Navigation

### Sidebar (`nav-links.tsx`)

Add "BRD" as a nav item in `nav-links.tsx`. Position: after "Open Qs", before "IA Map". Icon: `ClipboardList` from lucide-react.

```
Dashboard
Actors
Entities
Journeys
Rules
Constraints
Open Qs
BRD            ← new
IA Map
Diff
Docs
```

## Dependencies

**New:** None. Uses only Node.js built-ins (`fs`, `path`) and existing project infrastructure.

**Existing used:** `model-store.ts` (getCurrentModel), intent model types.

## Testing Considerations

- `generateBRD()` is a pure function — easy to unit test with a fixture model
- Inline decision matching can be tested with known OQ/entity ID combinations
- Preview page: visual verification via the app

## Future Enhancements (Not In Scope)

- AI-generated Purpose & Scope summary (replace static template)
- AI-generated executive summary section
- Server-side PDF generation for automated pipelines
- BRD diff between model versions
- Dashboard section when model adds dashboard data
