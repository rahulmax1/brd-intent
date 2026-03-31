# AI Model Editor — Design Spec

## Overview

Add an AI-powered editing capability to the VBS Intent Model review app. Users prompt in natural language via a persistent side drawer to edit the intent model, preview diffs, and approve/reject changes. All edits are versioned with full history and revert support.

## Decisions

- **LLM**: OpenAI `gpt-4o-mini` via `openai` npm package
- **UI**: Side drawer (right edge), triggered by floating button on every page
- **Scope**: Scoped to current page section by default, toggle for full-model edits
- **Version control**: Linear history (no branching). Each edit = snapshot with metadata.
- **Approval flow**: Diff preview → approve/reject → undo via revert from history
- **Suggestions**: Contextual, generated client-side from model data + current page
- **No AI SDK**: Plain `openai` package + zod validation. Frontend uses fetch + zustand.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Prompt Drawer (client)                             │
│  ┌───────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Suggestions│  │ Prompt Input│  │ Version History│ │
│  └─────┬─────┘  └──────┬─────┘  └───────┬───────┘  │
│        │               │                │           │
│        │         POST /api/model/edit    │           │
│        │               │          GET /versions     │
│        │               ▼          POST /revert      │
│        │        ┌──────────────┐         │          │
│        │        │ Diff Preview │         │          │
│        │        │ Approve/Reject│        │          │
│        │        └──────┬───────┘         │          │
│        │         POST /edit/apply        │          │
└────────┼───────────────┼────────────────┼──────────┘
         │               │                │
         ▼               ▼                ▼
┌─────────────────────────────────────────────────────┐
│  API Routes (server)                                │
│  /api/model/edit       → build prompt, call OpenAI  │
│  /api/model/edit/apply → persist version            │
│  /api/model/versions   → list version history       │
│  /api/model/revert     → restore previous version   │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Model Store (model-store.ts)                       │
│  - Seed from model.ts on first access               │
│  - Read/write versions to KV or local JSON          │
│  - Same pattern as review-store.ts                  │
└─────────────────────────────────────────────────────┘
```

## Data Layer

### Model Version

```ts
type ModelVersion = {
  id: string            // nanoid or crypto.randomUUID()
  timestamp: string     // ISO 8601
  author: string        // reviewer ID from identity modal
  prompt: string        // the user's natural language prompt
  model: IntentModel    // full model snapshot
  parentId: string | null // previous version ID (null for seed)
}
```

### Storage

- **Vercel KV** in production: individual `model-version:{id}` keys per version + `model-version-index` key for the ordered list of version IDs. Avoids hitting KV's 1MB value limit as history grows.
- **Local file** in dev: `model-history.json` in project root (gitignored)
- **Proposals**: stored in KV as `model-proposal:{proposalId}` with a 10-minute TTL. If expired when user clicks approve, return "Proposal expired, please try again."
- **Seed**: on first access, serialize `intentModel` from `model.ts` as version 0 with `prompt: "Initial seed from model.ts"` and `author: "system"`

### Current Model Resolution

The app currently imports `intentModel` directly from `model.ts`. After this change:
1. API routes and server components call `getCurrentModel()` from `model-store.ts`
2. `getCurrentModel()` returns the latest version's `model` field, falling back to `model.ts` if no versions exist
3. Client components receive the model via props from server components (existing pattern unchanged)

## API Routes

### POST `/api/model/edit`

**Request:**
```ts
{
  prompt: string
  scope: 'section' | 'full'
  sectionType?: SectionType  // when scope = 'section'
}
```

**Flow:**
1. Load current model via `getCurrentModel()`
2. Build system prompt:
   - Include the `IntentModel` TypeScript type definitions as schema reference
   - Include the current model JSON (or scoped section if `scope = 'section'`)
   - Instruct: "Return the complete updated [model/section] as valid JSON. Preserve all existing data unless the user's prompt explicitly asks to change it."
3. Call OpenAI `gpt-4o-mini` with `response_format: { type: "json_object" }`
4. Parse and validate response with zod (using schemas derived from `IntentModel` types)
5. If scoped, use `SECTION_TYPE_TO_MODEL_KEY[sectionType]` to merge the returned section array back into the full model
6. Run post-LLM validation (see Validation Pipeline below)
7. Compute diff between current and proposed model
8. Record `latestVersionId` at time of proposal (for optimistic locking on apply)
9. Store proposed model in KV as `model-proposal:{proposalId}` with 10-minute TTL (survives serverless cold starts)

**Response:**
```ts
{
  proposalId: string
  diff: ModelDiff
  proposedModel: IntentModel
  warnings: string[]  // non-blocking warnings from validation (e.g., item count changes)
}
```

### POST `/api/model/edit/apply`

**Request:**
```ts
{
  proposalId: string
  author: string   // reviewer ID
  prompt: string   // original prompt (for version record)
}
```

**Flow:**
1. Retrieve proposed model by `proposalId`. If expired, return `{ error: 'proposal_expired' }` so the client can auto-retry the original prompt.
2. **Optimistic lock check**: compare proposal's `latestVersionId` against the current latest version. If they differ, return `{ error: 'version_conflict', currentVersionId }` so the client can re-diff against the new model.
3. Create new `ModelVersion` with the proposed model
4. Persist to model store
5. No explicit rehash needed — the existing `enrichSectionReviews()` in `review-utils.ts` dynamically compares content hashes on every render, so changed sections will automatically appear as "revised"

**Response:**
```ts
{
  version: ModelVersion
}
```

### GET `/api/model/versions`

**Response:**
```ts
{
  versions: Array<{
    id: string
    timestamp: string
    author: string
    prompt: string
    parentId: string | null
  }>
}
```

Returns metadata only (no full model snapshots) to keep payload small.

### POST `/api/model/revert`

**Request:**
```ts
{
  versionId: string
  author: string
}
```

**Flow:**
1. Load the target version's model snapshot
2. Create a new version with `prompt: "Reverted to version {versionId}"`
3. No rehash needed — staleness detection is automatic via `enrichSectionReviews()`

**Response:**
```ts
{
  version: ModelVersion
}
```

## Diff Engine (`model-diff.ts`)

Compares two `IntentModel` objects and produces a structured diff:

```ts
type ModelDiff = {
  sections: SectionDiff[]
}

type SectionDiff = {
  sectionType: SectionType
  changes: ItemChange[]
}

type ItemChange = {
  type: 'added' | 'removed' | 'modified'
  itemId: string
  itemName: string
  fields?: FieldChange[]  // for modified items
}

type FieldChange = {
  field: string
  old: unknown
  new: unknown
}
```

This reuses the existing `computeStructuralDiff()` pattern from `review-utils.ts` but returns a richer structure for the diff preview UI.

## System Prompt (`ai-prompt.ts`)

Builds the OpenAI system prompt. Key elements:

- TypeScript type definitions for `IntentModel` and all sub-types, hardcoded as string literals (not read from `types.ts` at runtime — too fragile)
- The current model JSON (or scoped section)
- ID conventions: actors use short lowercase IDs, responsibilities use `actorId:rN` pattern, entities use short names, etc.
- Instruction to preserve `warn` and `edge` annotations unless explicitly asked to change them
- Instruction to generate sequential IDs following existing patterns
- Instruction to return **only** valid JSON matching the schema

For scoped edits, the system prompt includes the full model as read-only context but instructs the LLM to only return the modified section array.

## Post-LLM Validation Pipeline (`lib/model-validation.ts`)

Runs after zod schema validation passes, before returning the diff to the user. Catches semantic issues that schema validation cannot.

```ts
type ValidationResult = {
  valid: boolean
  errors: string[]    // blocking — edit is rejected
  warnings: string[]  // non-blocking — shown in diff preview as caution badges
}
```

### Checks (in order)

1. **Referential integrity** — all cross-references resolve:
   - `journey.primary_actor` exists in `actors[].id`
   - `business_rule.applies_to[]` entries exist in actors/entities
   - `responsibility.id` prefixes match their parent actor ID
   - If any fail → **error**, edit rejected with specific message.

2. **ID uniqueness** — no duplicate IDs within or across sections:
   - All `actor.id`, `entity.id`, `journey.id`, `business_rule.id`, `constraint.id`, `open_question.id` are unique
   - All `responsibility.id` are unique within the model
   - If duplicates found → **error**.

3. **Item count guard** — compares item counts per section before/after:
   - If any section lost items and the prompt did not mention "remove", "delete", or "replace" → **warning** shown in diff preview (e.g., "Actors section went from 4 to 3 items — was this intended?").
   - Not blocking — the user can still approve if the deletion was intended.

4. **Annotation preservation** — for each item that exists in both old and new model:
   - If the original had `warn` or `edge` fields and the new version doesn't, and the user's prompt didn't mention these fields → **auto-restore** them from the original silently.
   - No warning needed — this is a silent fix for a known LLM tendency.

5. **Lifecycle consistency** (entities only):
   - All `transition.from` and `transition.to` values exist in the entity's `states[]` array
   - If not → **error**.

## Zod Schemas (`lib/model-schemas.ts`)

Zod schemas mirroring the TypeScript types in `types.ts` are needed for validating LLM responses. Create `src/lib/model-schemas.ts` with schemas for `IntentModel` and all sub-types (`Actor`, `Entity`, `Journey`, `BusinessRule`, `Constraint`, `OpenQuestion`). These are used in the `/api/model/edit` route to parse and validate the LLM's JSON output.

## UI Components

### Prompt Drawer (`components/ai/prompt-drawer.tsx`)

- **Trigger**: fixed button at bottom-right corner, sparkle/wand icon from lucide-react
- **Drawer**: slides from right, 400px wide, full viewport height, z-20 (above header)
- **Backdrop**: semi-transparent overlay, click to close
- **Staleness detection**: on drawer open, fetch `GET /api/model/versions` and compare latest version ID against the model prop. If stale, show a yellow banner: "Model has been updated. Refresh to get the latest." with a refresh button that triggers `router.refresh()`.
- **Sections**:
  1. Header — "AI Editor" title + scope pill + close button
  2. Staleness banner (conditional)
  3. Suggestions — contextual chips (see below)
  4. Prompt input — textarea + submit button
  5. Diff preview — shown after LLM response, includes warning badges from validation (see below)
  6. Version history — collapsible, shown at bottom

### Drawer State Machine

```
idle → loading → diff_preview → idle
                 diff_preview → applying → success → idle
                 diff_preview → idle (reject)
idle → loading → error → idle (dismiss)
```

Managed via zustand store (`stores/ai-drawer-store.ts`):

```ts
type DrawerState = {
  isOpen: boolean
  status: 'idle' | 'loading' | 'diff_preview' | 'applying' | 'success' | 'error'
  scope: 'section' | 'full'
  currentProposal: { proposalId: string, diff: ModelDiff, proposedModel: IntentModel, warnings: string[] } | null
  error: string | null
  lastPrompt: string | null  // stored for auto-retry on proposal expiry
  // actions
  open: () => void
  close: () => void
  setScope: (scope: 'section' | 'full') => void
  setStatus: (status: DrawerState['status']) => void
  setProposal: (proposal: DrawerState['currentProposal']) => void
  setError: (error: string | null) => void
  reject: () => void
}
```

The store is kept synchronous (matching `reviewer-store.ts` convention). API call orchestration (submit, approve) lives in the `PromptDrawer` component, which updates the store with results.
```

### Diff Preview (`components/ai/diff-preview.tsx`)

Renders `ModelDiff` as a structured view:
- Groups changes by section type
- **Added** items: green left border + "+" badge
- **Removed** items: red left border + "−" badge
- **Modified** items: amber left border, with expandable field-level changes showing old → new values
- Approve / Reject buttons at the bottom

### Suggestion Chips (`components/ai/suggestion-chips.tsx`)

Client-side logic based on `usePathname()` + model data:

```ts
function getSuggestions(pathname: string, model: IntentModel): string[]
```

Rules:
- On `/review/[section]` pages: generate 2-3 suggestions specific to that section using real item names from the model
- On `/review` (dashboard): generic suggestions like "Add a new open question"
- On `/review/diff`: no suggestions (drawer still accessible but suggestions hidden)

Clicking a chip populates the textarea.

The drawer receives the current model as a prop from `layout.tsx` (server component passes it down), so suggestions always reflect the latest model state.

### Version History (`components/ai/version-history.tsx`)

- Collapsible section with "History" header + chevron toggle
- Shows reverse-chronological list of versions
- Each entry: timestamp (relative, e.g., "5 min ago"), author name, prompt text (truncated)
- Click entry: shows that version's diff in the diff preview area
- Revert button on each entry (with confirmation)

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/model-store.ts` | Runtime model store with versioning (KV + local JSON) |
| `src/lib/model-diff.ts` | Diff engine comparing two IntentModel objects |
| `src/lib/model-schemas.ts` | Zod schemas for IntentModel validation |
| `src/lib/model-validation.ts` | Post-LLM validation pipeline (refs, IDs, counts, annotations) |
| `src/lib/ai-prompt.ts` | System prompt builder + OpenAI call wrapper |
| `src/app/api/model/edit/route.ts` | Edit endpoint — prompt → diff |
| `src/app/api/model/edit/apply/route.ts` | Apply endpoint — persist proposed edit |
| `src/app/api/model/versions/route.ts` | Version history endpoint |
| `src/app/api/model/revert/route.ts` | Revert endpoint |
| `src/components/ai/prompt-drawer.tsx` | Main drawer component |
| `src/components/ai/diff-preview.tsx` | Diff visualization |
| `src/components/ai/suggestion-chips.tsx` | Contextual prompt suggestions |
| `src/components/ai/version-history.tsx` | Version timeline |
| `src/stores/ai-drawer-store.ts` | Drawer state management (zustand) |

## Files to Modify

| File | Change |
|---|---|
| `src/app/review/layout.tsx` | Add drawer trigger button + `<PromptDrawer />`, pass model as prop |
| `src/app/api/review/route.ts` | Replace `intentModel` import with `getCurrentModel()` |
| `src/app/review/[section]/page.tsx` | Replace `intentModel` import with `getCurrentModel()` |
| `src/app/review/page.tsx` | Replace `intentModel` import with `getCurrentModel()` |
| `src/app/review/diff/page.tsx` | Replace `intentModel` import with `getCurrentModel()` |
| `package.json` | Add `openai` dependency |
| `.env.local` | Add `OPENAI_API_KEY` |
| `.gitignore` | Add `model-history.json` |

## Environment Variables

```
OPENAI_API_KEY=sk-...
```

## Edge Cases

- **Concurrent edits**: Optimistic locking via `latestVersionId` check on apply. If another edit landed between prompt and approve, return `version_conflict` error. Client re-diffs the proposal against the new model automatically.
- **Invalid LLM output**: Zod validation catches structural issues. Post-LLM validation catches semantic issues (broken refs, duplicate IDs, bad lifecycles). Return specific error messages so the user knows what went wrong.
- **Unintended deletions**: Item count guard warns (non-blocking) when a section loses items and the prompt didn't mention deletion. Shown as caution badge in diff preview.
- **Annotation stripping**: Auto-restored silently by the validation pipeline. Known LLM tendency — no user action needed.
- **Proposal expiry**: If user clicks approve after 10 min, client auto-retries the original prompt and shows the new diff. No dead-end error state.
- **Stale model in drawer**: On drawer open, lightweight version check against the server. Yellow banner + refresh button if model has changed since page load.
- **Large model**: Current model is ~4KB. Well within gpt-4o-mini context. No chunking needed.
- **Review state sync**: No explicit rehash needed. `enrichSectionReviews()` dynamically compares content hashes on every render, so changed sections automatically appear as "revised."
- **Empty diff**: If LLM returns identical model, show "No changes detected" instead of empty diff.
- **Schema drift**: If `types.ts` is updated, `model-schemas.ts` and the hardcoded types in `ai-prompt.ts` must be updated in sync. Comment in `types.ts` points to both files as co-dependencies.
