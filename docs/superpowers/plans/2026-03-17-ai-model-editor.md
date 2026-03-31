# AI Model Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered side drawer that lets users edit the intent model via natural language prompts, with diff preview, approval flow, and version history.

**Architecture:** OpenAI gpt-4o-mini called from a Next.js API route. Model versions stored in Vercel KV (prod) or local JSON (dev). Client-side drawer with zustand state management. Post-LLM validation pipeline catches semantic issues before showing the diff.

**Tech Stack:** Next.js 16, React 19, TypeScript, OpenAI SDK, Zod, Zustand, TailwindCSS, Vercel KV

**Spec:** `docs/superpowers/specs/2026-03-17-ai-model-editor-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/lib/model-schemas.ts` | Zod schemas mirroring IntentModel types for LLM response validation |
| `src/lib/model-store.ts` | Model version CRUD — getCurrentModel, addVersion, getVersions, getVersion. Dual KV/file backend. |
| `src/lib/model-diff.ts` | Structured diff engine — compares two IntentModel objects, returns ModelDiff with field-level changes |
| `src/lib/model-validation.ts` | Post-LLM validation — referential integrity, ID uniqueness, item count guard, annotation preservation, lifecycle consistency |
| `src/lib/ai-prompt.ts` | System prompt builder + OpenAI API call wrapper |
| `src/stores/ai-drawer-store.ts` | Zustand store for drawer open/close, status, scope, proposal, error state |
| `src/app/api/model/edit/route.ts` | POST — prompt → OpenAI → validate → diff → store proposal → return |
| `src/app/api/model/edit/apply/route.ts` | POST — retrieve proposal → optimistic lock check → persist version |
| `src/app/api/model/versions/route.ts` | GET — return version history metadata |
| `src/app/api/model/revert/route.ts` | POST — load target version snapshot → create new version |
| `src/components/ai/prompt-drawer.tsx` | Main drawer shell — header, staleness banner, suggestions, input, diff preview, history |
| `src/components/ai/diff-preview.tsx` | Renders ModelDiff with color-coded changes + warning badges + approve/reject buttons |
| `src/components/ai/suggestion-chips.tsx` | Contextual prompt suggestions based on pathname + model data |
| `src/components/ai/version-history.tsx` | Collapsible version timeline with revert buttons |

### Modified Files

| File | Change |
|---|---|
| `src/app/review/layout.tsx` | Add `<PromptDrawer />` + floating trigger button, pass model as prop via `getCurrentModel()` |
| `src/app/api/review/route.ts` | Replace `intentModel` import with `await getCurrentModel()` |
| `src/app/review/[section]/page.tsx` | Replace `intentModel` import with `await getCurrentModel()` |
| `src/app/review/page.tsx` | Replace `intentModel` import with `await getCurrentModel()` |
| `src/app/review/diff/page.tsx` | Replace `intentModel` import with `await getCurrentModel()` |
| `src/domain/intent-model/types.ts` | Add co-dependency comment pointing to `model-schemas.ts` and `ai-prompt.ts` |
| `package.json` | Add `openai` dependency |
| `.gitignore` | Add `model-history.json` |

---

## Chunk 1: Data Layer (schemas, store, diff, validation)

### Task 1: Install openai dependency and update gitignore

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install openai package**

Run: `pnpm add openai`

- [ ] **Step 2: Add model-history.json to gitignore**

Add `model-history.json` to `.gitignore`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: add openai dependency and gitignore model-history"
```

---

### Task 2: Create Zod schemas for IntentModel

**Files:**
- Create: `src/lib/model-schemas.ts`

These schemas mirror the TypeScript types in `src/domain/intent-model/types.ts`. They are used to validate LLM responses.

- [ ] **Step 1: Create model-schemas.ts**

```ts
import { z } from 'zod'

export const ResponsibilitySchema = z.object({
  id: z.string(),
  description: z.string(),
  warn: z.string().optional(),
  edge: z.string().optional(),
})

export const ActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  auth: z.string(),
  responsibilities: z.array(ResponsibilitySchema),
})

export const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  warn: z.string().optional(),
})

export const TransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string(),
  guard: z.string().optional(),
  warn: z.string().optional(),
})

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  key_fields: z.array(FieldSchema),
  lifecycle: z.object({
    states: z.array(z.string()),
    transitions: z.array(TransitionSchema),
  }),
})

export const JourneyStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  detail: z.string(),
  precondition: z.string().optional(),
  warn: z.string().optional(),
  edge: z.string().optional(),
})

export const JourneySchema = z.object({
  id: z.string(),
  name: z.string(),
  primary_actor: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(JourneyStepSchema),
  success_outcome: z.string(),
})

export const BusinessRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  applies_to: z.array(z.string()),
  source: z.string(),
  warn: z.string().optional(),
})

export const ConstraintSchema = z.object({
  id: z.string(),
  constraint: z.string(),
  type: z.enum(['capacity', 'pricing', 'access', 'compliance', 'temporal']),
})

export const OpenQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string(),
  status: z.enum(['open', 'deferred', 'resolved']),
  resolution: z.string().optional(),
})

export const ModelMetaSchema = z.object({
  version: z.string(),
  project: z.string(),
  lastUpdated: z.string(),
  status: z.enum(['draft', 'in_review', 'approved']),
})

export const IntentModelSchema = z.object({
  meta: ModelMetaSchema,
  actors: z.array(ActorSchema),
  entities: z.array(EntitySchema),
  journeys: z.array(JourneySchema),
  business_rules: z.array(BusinessRuleSchema),
  constraints: z.array(ConstraintSchema),
  open_questions: z.array(OpenQuestionSchema),
})

// Section-level schemas for scoped edits
export const SectionSchemas = {
  actors: z.object({ actors: z.array(ActorSchema) }),
  entities: z.object({ entities: z.array(EntitySchema) }),
  journeys: z.object({ journeys: z.array(JourneySchema) }),
  business_rules: z.object({ business_rules: z.array(BusinessRuleSchema) }),
  constraints: z.object({ constraints: z.array(ConstraintSchema) }),
  open_questions: z.object({ open_questions: z.array(OpenQuestionSchema) }),
} as const
```

- [ ] **Step 2: Add co-dependency comment to types.ts**

At the top of `src/domain/intent-model/types.ts`, add:

```ts
// Co-dependencies: when modifying these types, also update:
// - src/lib/model-schemas.ts (zod schemas)
// - src/lib/ai-prompt.ts (hardcoded type definitions in system prompt)
```

- [ ] **Step 3: Verify build**

Run: `pnpm lint`
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/model-schemas.ts src/domain/intent-model/types.ts
git commit -m "feat: add zod schemas for intent model validation"
```

---

### Task 3: Create model store with versioning

**Files:**
- Create: `src/lib/model-store.ts`
- Modify: `src/lib/paths.ts`

Follows the same dual-backend pattern as `src/lib/review-store.ts`.

- [ ] **Step 1: Add model history path to paths.ts**

Add to `src/lib/paths.ts`:

```ts
export const MODEL_HISTORY_PATH = path.join(process.cwd(), 'model-history.json')
```

- [ ] **Step 2: Create model-store.ts**

```ts
import { readFile, writeFile } from 'node:fs/promises'
import { kv } from '@vercel/kv'
import { MODEL_HISTORY_PATH } from './paths'
import { intentModel } from '@/domain/intent-model/model'
import type { IntentModel } from '@/domain/intent-model/types'

const isVercel = !!process.env.KV_REST_API_URL

const KV_INDEX_KEY = 'model-version-index'
const KV_VERSION_PREFIX = 'model-version:'
const KV_PROPOSAL_PREFIX = 'model-proposal:'

export type ModelVersion = {
  id: string
  timestamp: string
  author: string
  prompt: string
  model: IntentModel
  parentId: string | null
}

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

type ModelHistory = {
  versions: ModelVersion[]
}

// --- Seed ---

function createSeedVersion(): ModelVersion {
  return {
    id: 'seed',
    timestamp: new Date().toISOString(),
    author: 'system',
    prompt: 'Initial seed from model.ts',
    model: intentModel,
    parentId: null,
  }
}

// --- Local file helpers ---

async function readLocalHistory(): Promise<ModelHistory> {
  try {
    const raw = await readFile(MODEL_HISTORY_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    const seed = createSeedVersion()
    const history: ModelHistory = { versions: [seed] }
    await writeFile(MODEL_HISTORY_PATH, JSON.stringify(history, null, 2))
    return history
  }
}

async function writeLocalHistory(history: ModelHistory): Promise<void> {
  await writeFile(MODEL_HISTORY_PATH, JSON.stringify(history, null, 2))
}

// --- KV helpers ---

async function getKvIndex(): Promise<string[]> {
  const index = await kv.get<string[]>(KV_INDEX_KEY)
  if (index) return index

  // Seed
  const seed = createSeedVersion()
  await kv.set(`${KV_VERSION_PREFIX}${seed.id}`, seed)
  await kv.set(KV_INDEX_KEY, [seed.id])
  return [seed.id]
}

// --- Public API ---

export async function getCurrentModel(): Promise<IntentModel> {
  if (isVercel) {
    const index = await getKvIndex()
    const latestId = index[index.length - 1]
    const version = await kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${latestId}`)
    return version?.model ?? intentModel
  }

  const history = await readLocalHistory()
  const latest = history.versions[history.versions.length - 1]
  return latest?.model ?? intentModel
}

export async function getLatestVersionId(): Promise<string> {
  if (isVercel) {
    const index = await getKvIndex()
    return index[index.length - 1]
  }

  const history = await readLocalHistory()
  return history.versions[history.versions.length - 1]?.id ?? 'seed'
}

export async function addVersion(version: ModelVersion): Promise<void> {
  if (isVercel) {
    await kv.set(`${KV_VERSION_PREFIX}${version.id}`, version)
    const index = await getKvIndex()
    index.push(version.id)
    await kv.set(KV_INDEX_KEY, index)
    return
  }

  const history = await readLocalHistory()
  history.versions.push(version)
  await writeLocalHistory(history)
}

export async function getVersions(): Promise<VersionMeta[]> {
  if (isVercel) {
    const index = await getKvIndex()
    const versions: VersionMeta[] = []
    for (const id of index) {
      const v = await kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${id}`)
      if (v) {
        versions.push({
          id: v.id,
          timestamp: v.timestamp,
          author: v.author,
          prompt: v.prompt,
          parentId: v.parentId,
        })
      }
    }
    return versions
  }

  const history = await readLocalHistory()
  return history.versions.map(({ id, timestamp, author, prompt, parentId }) => ({
    id, timestamp, author, prompt, parentId,
  }))
}

export async function getVersion(id: string): Promise<ModelVersion | null> {
  if (isVercel) {
    return kv.get<ModelVersion>(`${KV_VERSION_PREFIX}${id}`)
  }

  const history = await readLocalHistory()
  return history.versions.find(v => v.id === id) ?? null
}

// --- Proposals (temporary storage for pending edits) ---

export type Proposal = {
  proposalId: string
  proposedModel: IntentModel
  latestVersionId: string
  prompt: string
}

export async function storeProposal(proposal: Proposal): Promise<void> {
  if (isVercel) {
    await kv.set(`${KV_PROPOSAL_PREFIX}${proposal.proposalId}`, proposal, { ex: 600 })
    return
  }

  // Dev: store in-memory (acceptable for local dev — single process)
  proposalCache.set(proposal.proposalId, proposal)
  setTimeout(() => proposalCache.delete(proposal.proposalId), 600_000)
}

export async function getProposal(proposalId: string): Promise<Proposal | null> {
  if (isVercel) {
    return kv.get<Proposal>(`${KV_PROPOSAL_PREFIX}${proposalId}`)
  }

  return proposalCache.get(proposalId) ?? null
}

const proposalCache = new Map<string, Proposal>()
```

- [ ] **Step 3: Verify build**

Run: `pnpm lint`
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/model-store.ts src/lib/paths.ts
git commit -m "feat: add model store with versioning and proposal storage"
```

---

### Task 4: Create diff engine

**Files:**
- Create: `src/lib/model-diff.ts`

- [ ] **Step 1: Create model-diff.ts**

```ts
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export type FieldChange = {
  field: string
  old: unknown
  new: unknown
}

export type ItemChange = {
  type: 'added' | 'removed' | 'modified'
  itemId: string
  itemName: string
  fields?: FieldChange[]
}

export type SectionDiff = {
  sectionType: SectionType
  changes: ItemChange[]
}

export type ModelDiff = {
  sections: SectionDiff[]
}

type ModelItem = { id: string; name?: string; question?: string; constraint?: string; description?: string }

function getItemName(item: ModelItem): string {
  return item.name ?? item.question ?? item.constraint ?? item.description ?? item.id
}

function diffFields(oldItem: Record<string, unknown>, newItem: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = []
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)])

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldItem[key])
    const newVal = JSON.stringify(newItem[key])
    if (oldVal !== newVal) {
      changes.push({ field: key, old: oldItem[key], new: newItem[key] })
    }
  }

  return changes
}

export function computeModelDiff(oldModel: IntentModel, newModel: IntentModel): ModelDiff {
  const sectionTypes = Object.keys(SECTION_TYPE_TO_MODEL_KEY) as SectionType[]
  const sections: SectionDiff[] = []

  for (const sectionType of sectionTypes) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[sectionType]
    const oldItems = (oldModel[modelKey] as ModelItem[]) ?? []
    const newItems = (newModel[modelKey] as ModelItem[]) ?? []

    const oldMap = new Map(oldItems.map(item => [item.id, item]))
    const newMap = new Map(newItems.map(item => [item.id, item]))

    const changes: ItemChange[] = []

    // Added items
    for (const [id, item] of newMap) {
      if (!oldMap.has(id)) {
        changes.push({ type: 'added', itemId: id, itemName: getItemName(item) })
      }
    }

    // Removed items
    for (const [id, item] of oldMap) {
      if (!newMap.has(id)) {
        changes.push({ type: 'removed', itemId: id, itemName: getItemName(item) })
      }
    }

    // Modified items
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id)
      if (!oldItem) continue
      const fields = diffFields(
        oldItem as unknown as Record<string, unknown>,
        newItem as unknown as Record<string, unknown>,
      )
      if (fields.length > 0) {
        changes.push({ type: 'modified', itemId: id, itemName: getItemName(newItem), fields })
      }
    }

    if (changes.length > 0) {
      sections.push({ sectionType, changes })
    }
  }

  return { sections }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/lib/model-diff.ts
git commit -m "feat: add structured diff engine for intent model"
```

---

### Task 5: Create post-LLM validation pipeline

**Files:**
- Create: `src/lib/model-validation.ts`

- [ ] **Step 1: Create model-validation.ts**

```ts
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  model: IntentModel // potentially patched (annotation restoration)
}

export function validateModel(
  proposed: IntentModel,
  original: IntentModel,
  prompt: string,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let model = structuredClone(proposed)

  // 1. Referential integrity
  const actorIds = new Set(model.actors.map(a => a.id))
  const entityIds = new Set(model.entities.map(e => e.id))
  const allRefIds = new Set([...actorIds, ...entityIds])

  for (const journey of model.journeys) {
    if (!actorIds.has(journey.primary_actor)) {
      errors.push(`Journey "${journey.name}" references actor "${journey.primary_actor}" which does not exist`)
    }
  }

  for (const rule of model.business_rules) {
    for (const ref of rule.applies_to) {
      if (!allRefIds.has(ref)) {
        errors.push(`Business rule "${rule.id}" references "${ref}" in applies_to which does not exist`)
      }
    }
  }

  for (const actor of model.actors) {
    for (const resp of actor.responsibilities) {
      if (!resp.id.startsWith(`${actor.id}:`)) {
        errors.push(`Responsibility "${resp.id}" should start with "${actor.id}:" to match parent actor`)
      }
    }
  }

  // 2. ID uniqueness
  const allIds: string[] = []
  const sectionTypes = Object.keys(SECTION_TYPE_TO_MODEL_KEY) as SectionType[]
  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const items = model[key] as Array<{ id: string }>
    for (const item of items) {
      allIds.push(item.id)
    }
  }
  const respIds: string[] = []
  for (const actor of model.actors) {
    for (const resp of actor.responsibilities) {
      respIds.push(resp.id)
    }
  }

  const idCounts = new Map<string, number>()
  for (const id of allIds) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`Duplicate item ID: "${id}"`)
  }

  const respIdCounts = new Map<string, number>()
  for (const id of respIds) {
    respIdCounts.set(id, (respIdCounts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of respIdCounts) {
    if (count > 1) errors.push(`Duplicate responsibility ID: "${id}"`)
  }

  // 3. Item count guard
  const promptLower = prompt.toLowerCase()
  const mentionsDeletion = ['remove', 'delete', 'replace'].some(w => promptLower.includes(w))

  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldCount = (original[key] as Array<unknown>).length
    const newCount = (model[key] as Array<unknown>).length
    if (newCount < oldCount && !mentionsDeletion) {
      warnings.push(`${String(key)} went from ${oldCount} to ${newCount} items — was this intended?`)
    }
  }

  // 4. Annotation preservation
  for (const st of sectionTypes) {
    const key = SECTION_TYPE_TO_MODEL_KEY[st]
    const oldItems = original[key] as Array<Record<string, unknown>>
    const newItems = model[key] as Array<Record<string, unknown>>
    const oldMap = new Map(oldItems.map(i => [i.id, i]))

    const mentionsAnnotations = ['warn', 'edge'].some(w => promptLower.includes(w))

    for (const newItem of newItems) {
      const oldItem = oldMap.get(newItem.id as string)
      if (!oldItem || mentionsAnnotations) continue

      // Restore warn/edge on top-level item
      if (oldItem.warn && !newItem.warn) newItem.warn = oldItem.warn
      if (oldItem.edge && !newItem.edge) newItem.edge = oldItem.edge

      // Restore on nested items (responsibilities, key_fields, steps, transitions)
      for (const field of ['responsibilities', 'key_fields', 'steps', 'transitions']) {
        const oldNested = oldItem[field] as Array<Record<string, unknown>> | undefined
        const newNested = newItem[field] as Array<Record<string, unknown>> | undefined
        if (!oldNested || !newNested) continue

        const oldNestedMap = new Map(oldNested.map(n => [n.id ?? n.order ?? n.name, n]))
        for (const newN of newNested) {
          const key2 = newN.id ?? newN.order ?? newN.name
          const oldN = oldNestedMap.get(key2)
          if (!oldN) continue
          if (oldN.warn && !newN.warn) newN.warn = oldN.warn
          if (oldN.edge && !newN.edge) newN.edge = oldN.edge
        }
      }
    }
  }

  // 5. Lifecycle consistency (entities only)
  for (const entity of model.entities) {
    const stateSet = new Set(entity.lifecycle.states)
    for (const t of entity.lifecycle.transitions) {
      if (!stateSet.has(t.from)) {
        errors.push(`Entity "${entity.name}" transition from "${t.from}" references unknown state`)
      }
      if (!stateSet.has(t.to)) {
        errors.push(`Entity "${entity.name}" transition to "${t.to}" references unknown state`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    model,
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/lib/model-validation.ts
git commit -m "feat: add post-LLM validation pipeline for model integrity"
```

---

## Chunk 2: AI Prompt + API Routes

### Task 6: Create AI prompt builder

**Files:**
- Create: `src/lib/ai-prompt.ts`

- [ ] **Step 1: Create ai-prompt.ts**

This file exports `callOpenAI()` which builds the system prompt and calls the API. The type definitions are hardcoded as string literals (not read from types.ts at runtime).

```ts
import OpenAI from 'openai'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'
import { IntentModelSchema, SectionSchemas } from './model-schemas'

const openai = new OpenAI()

const TYPE_DEFINITIONS = `
type IntentModel = {
  meta: { version: string; project: string; lastUpdated: string; status: 'draft' | 'in_review' | 'approved' }
  actors: Actor[]
  entities: Entity[]
  journeys: Journey[]
  business_rules: BusinessRule[]
  constraints: Constraint[]
  open_questions: OpenQuestion[]
}

type Actor = {
  id: string          // short lowercase, e.g. 'wff', 'acfs'
  name: string
  description: string
  auth: string
  responsibilities: { id: string; description: string; warn?: string; edge?: string }[]
  // responsibility IDs follow pattern: actorId:rN (e.g. 'wff:r1')
}

type Entity = {
  id: string
  name: string
  description: string
  key_fields: { name: string; type: string; description: string; warn?: string }[]
  lifecycle: {
    states: string[]
    transitions: { from: string; to: string; trigger: string; guard?: string; warn?: string }[]
  }
}

type Journey = {
  id: string           // kebab-case, e.g. 'carrier-books-pickup'
  name: string
  primary_actor: string  // must reference an existing actor ID
  preconditions: string[]
  steps: { order: number; title: string; detail: string; precondition?: string; warn?: string; edge?: string }[]
  success_outcome: string
}

type BusinessRule = {
  id: string           // pattern: 'BR-NNN'
  description: string
  applies_to: string[] // must reference existing actor or entity IDs
  source: string
  warn?: string
}

type Constraint = {
  id: string           // pattern: 'C-NNN'
  constraint: string
  type: 'capacity' | 'pricing' | 'access' | 'compliance' | 'temporal'
}

type OpenQuestion = {
  id: string           // pattern: 'OQ-NNN'
  question: string
  reason: string
  status: 'open' | 'deferred' | 'resolved'
  resolution?: string
}
`

function buildSystemPrompt(scope: 'full' | 'section', sectionType?: SectionType): string {
  const scopeInstruction = scope === 'full'
    ? 'Return the complete updated IntentModel as valid JSON.'
    : `Return only the updated "${sectionType}" section as a JSON object with a single key "${SECTION_TYPE_TO_MODEL_KEY[sectionType!]}".`

  return `You are an expert business analyst editing a structured intent model for a software project.

## Type Definitions
${TYPE_DEFINITIONS}

## Rules
- ${scopeInstruction}
- Preserve ALL existing data unless the user's prompt explicitly asks to change it.
- Preserve all "warn" and "edge" annotations unless the user specifically asks to modify them.
- Generate sequential IDs following existing patterns (e.g. if actors have wff, ff, carrier, acfs — a new actor gets a short lowercase ID).
- Return ONLY valid JSON. No markdown, no explanation, no wrapping.`
}

export type EditRequest = {
  prompt: string
  scope: 'full' | 'section'
  sectionType?: SectionType
  currentModel: IntentModel
}

export type EditResponse = {
  model: IntentModel
}

export async function callOpenAI(req: EditRequest): Promise<EditResponse> {
  const systemPrompt = buildSystemPrompt(req.scope, req.sectionType)

  let userContent: string
  if (req.scope === 'section' && req.sectionType) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[req.sectionType]
    userContent = `## Current full model (read-only context)
${JSON.stringify(req.currentModel, null, 2)}

## Section to edit: ${modelKey}
${JSON.stringify(req.currentModel[modelKey], null, 2)}

## Edit instruction
${req.prompt}`
  } else {
    userContent = `## Current model
${JSON.stringify(req.currentModel, null, 2)}

## Edit instruction
${req.prompt}`
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')

  const parsed = JSON.parse(content)

  // Validate with zod
  if (req.scope === 'section' && req.sectionType) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[req.sectionType]
    const schema = SectionSchemas[modelKey as keyof typeof SectionSchemas]
    const result = schema.parse(parsed)
    // Merge back into full model
    const merged = structuredClone(req.currentModel)
    ;(merged as Record<string, unknown>)[modelKey] = (result as Record<string, unknown>)[modelKey]
    return { model: merged }
  }

  const validated = IntentModelSchema.parse(parsed)
  return { model: validated as IntentModel }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-prompt.ts
git commit -m "feat: add AI prompt builder and OpenAI call wrapper"
```

---

### Task 7: Create API routes

**Files:**
- Create: `src/app/api/model/edit/route.ts`
- Create: `src/app/api/model/edit/apply/route.ts`
- Create: `src/app/api/model/versions/route.ts`
- Create: `src/app/api/model/revert/route.ts`

- [ ] **Step 1: Create edit route**

`src/app/api/model/edit/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentModel, getLatestVersionId, storeProposal } from '@/lib/model-store'
import { callOpenAI } from '@/lib/ai-prompt'
import { validateModel } from '@/lib/model-validation'
import { computeModelDiff } from '@/lib/model-diff'
import type { SectionType } from '@/domain/intent-model/types'

const EditRequestSchema = z.object({
  prompt: z.string().min(1),
  scope: z.enum(['section', 'full']),
  sectionType: z.enum(['actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question']).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, scope, sectionType } = EditRequestSchema.parse(body)

    const currentModel = await getCurrentModel()
    const latestVersionId = await getLatestVersionId()

    const { model: proposedModel } = await callOpenAI({
      prompt,
      scope,
      sectionType: sectionType as SectionType | undefined,
      currentModel,
    })

    const validation = validateModel(proposedModel, currentModel, prompt)
    if (!validation.valid) {
      return NextResponse.json({ error: 'validation_failed', details: validation.errors }, { status: 422 })
    }

    const diff = computeModelDiff(currentModel, validation.model)

    if (diff.sections.length === 0) {
      return NextResponse.json({ error: 'no_changes', message: 'No changes detected' }, { status: 200 })
    }

    const proposalId = crypto.randomUUID()
    await storeProposal({
      proposalId,
      proposedModel: validation.model,
      latestVersionId,
      prompt,
    })

    return NextResponse.json({
      proposalId,
      diff,
      proposedModel: validation.model,
      warnings: validation.warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'edit_failed', message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create apply route**

`src/app/api/model/edit/apply/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProposal, addVersion, getLatestVersionId } from '@/lib/model-store'
import type { ModelVersion } from '@/lib/model-store'

const ApplyRequestSchema = z.object({
  proposalId: z.string(),
  author: z.string(),
  prompt: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { proposalId, author, prompt } = ApplyRequestSchema.parse(body)

    const proposal = await getProposal(proposalId)
    if (!proposal) {
      return NextResponse.json({ error: 'proposal_expired' }, { status: 410 })
    }

    const currentLatest = await getLatestVersionId()
    if (currentLatest !== proposal.latestVersionId) {
      return NextResponse.json({ error: 'version_conflict', currentVersionId: currentLatest }, { status: 409 })
    }

    const version: ModelVersion = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      author,
      prompt,
      model: proposal.proposedModel,
      parentId: proposal.latestVersionId,
    }

    await addVersion(version)

    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'apply_failed', message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create versions route**

`src/app/api/model/versions/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getVersions } from '@/lib/model-store'

export async function GET() {
  const versions = await getVersions()
  return NextResponse.json({ versions })
}
```

- [ ] **Step 4: Create revert route**

`src/app/api/model/revert/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVersion, addVersion, getLatestVersionId } from '@/lib/model-store'
import type { ModelVersion } from '@/lib/model-store'

const RevertRequestSchema = z.object({
  versionId: z.string(),
  author: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { versionId, author } = RevertRequestSchema.parse(body)

    const targetVersion = await getVersion(versionId)
    if (!targetVersion) {
      return NextResponse.json({ error: 'version_not_found' }, { status: 404 })
    }

    const parentId = await getLatestVersionId()

    const version: ModelVersion = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      author,
      prompt: `Reverted to version ${versionId}`,
      model: targetVersion.model,
      parentId,
    }

    await addVersion(version)

    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'revert_failed', message }, { status: 500 })
  }
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/model/
git commit -m "feat: add model edit, apply, versions, and revert API routes"
```

---

### Task 8: Migrate intentModel imports to getCurrentModel()

**Files:**
- Modify: `src/app/api/review/route.ts`
- Modify: `src/app/review/page.tsx`
- Modify: `src/app/review/[section]/page.tsx`
- Modify: `src/app/review/diff/page.tsx`

This is a mechanical change: replace static `intentModel` import with `await getCurrentModel()`. All these files are already async server components or API route handlers.

- [ ] **Step 1: Update review API route**

In `src/app/api/review/route.ts`:
- Replace `import { intentModel } from '@/domain/intent-model/model'` with `import { getCurrentModel } from '@/lib/model-store'`
- At the start of both `GET` and `POST` handlers, add `const intentModel = await getCurrentModel()`
- Remove the top-level import of `intentModel`

- [ ] **Step 2: Update review dashboard page**

In `src/app/review/page.tsx`:
- Replace `import { intentModel } from '@/domain/intent-model/model'` with `import { getCurrentModel } from '@/lib/model-store'`
- Add `const intentModel = await getCurrentModel()` at the start of the component body

- [ ] **Step 3: Update section page**

In `src/app/review/[section]/page.tsx`:
- Replace `import { intentModel } from '@/domain/intent-model/model'` with `import { getCurrentModel } from '@/lib/model-store'`
- Add `const intentModel = await getCurrentModel()` at the start of the component body

- [ ] **Step 4: Update diff page**

In `src/app/review/diff/page.tsx`:
- Replace `import { intentModel } from '@/domain/intent-model/model'` with `import { getCurrentModel } from '@/lib/model-store'`
- Add `const intentModel = await getCurrentModel()` at the start of the component body

- [ ] **Step 5: Verify the app still builds and runs**

Run: `pnpm lint && pnpm build`
Expected: no errors. The app should function identically since `getCurrentModel()` falls back to `intentModel` when no versions exist.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/review/route.ts src/app/review/page.tsx src/app/review/\\[section\\]/page.tsx src/app/review/diff/page.tsx
git commit -m "refactor: migrate intentModel imports to getCurrentModel()"
```

---

## Chunk 3: UI Components

### Task 9: Create zustand drawer store

**Files:**
- Create: `src/stores/ai-drawer-store.ts`

- [ ] **Step 1: Create ai-drawer-store.ts**

```ts
import { create } from 'zustand'
import type { ModelDiff } from '@/lib/model-diff'
import type { IntentModel } from '@/domain/intent-model/types'

type Proposal = {
  proposalId: string
  diff: ModelDiff
  proposedModel: IntentModel
  warnings: string[]
}

type DrawerStatus = 'idle' | 'loading' | 'diff_preview' | 'applying' | 'success' | 'error'

type DrawerState = {
  isOpen: boolean
  status: DrawerStatus
  scope: 'section' | 'full'
  currentProposal: Proposal | null
  error: string | null
  lastPrompt: string | null
  open: () => void
  close: () => void
  setScope: (scope: 'section' | 'full') => void
  setStatus: (status: DrawerStatus) => void
  setProposal: (proposal: Proposal | null) => void
  setError: (error: string | null) => void
  setLastPrompt: (prompt: string | null) => void
  reject: () => void
  reset: () => void
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  status: 'idle',
  scope: 'section',
  currentProposal: null,
  error: null,
  lastPrompt: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, status: 'idle', currentProposal: null, error: null }),
  setScope: (scope) => set({ scope }),
  setStatus: (status) => set({ status }),
  setProposal: (currentProposal) => set({ currentProposal }),
  setError: (error) => set({ error, status: 'error' }),
  setLastPrompt: (lastPrompt) => set({ lastPrompt }),
  reject: () => set({ status: 'idle', currentProposal: null }),
  reset: () => set({ status: 'idle', currentProposal: null, error: null }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/ai-drawer-store.ts
git commit -m "feat: add zustand store for AI drawer state"
```

---

### Task 10: Create suggestion chips component

**Files:**
- Create: `src/components/ai/suggestion-chips.tsx`

- [ ] **Step 1: Create suggestion-chips.tsx**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import type { IntentModel } from '@/domain/intent-model/types'

function getSuggestions(pathname: string, model: IntentModel): string[] {
  if (pathname === '/review' || pathname === '/review/') {
    return [
      'Add a new open question',
      'Add a new business rule',
      'Summarize all open warnings',
    ]
  }

  if (pathname.includes('/diff')) return []

  const segment = pathname.split('/').pop()

  switch (segment) {
    case 'actors': {
      const actor = model.actors[0]
      return [
        'Add a new actor',
        actor ? `Add a responsibility to ${actor.name}` : 'Add a responsibility',
        model.actors.length > 1 ? `Clarify the auth method for ${model.actors[1].name}` : 'Clarify an auth method',
      ]
    }
    case 'entities': {
      const entity = model.entities[0]
      return [
        'Add a new entity',
        entity ? `Add a field to ${entity.name}` : 'Add a field',
        entity ? `Add a lifecycle state to ${entity.name}` : 'Add a lifecycle state',
      ]
    }
    case 'journeys': {
      const journey = model.journeys[0]
      return [
        'Add a new journey',
        journey ? `Add a step to ${journey.name}` : 'Add a step',
        journey ? `Add a precondition to ${journey.name}` : 'Add a precondition',
      ]
    }
    case 'business-rules':
      return [
        'Add a new business rule',
        'Add a warning to an existing rule',
        'Link a rule to a new entity',
      ]
    case 'constraints':
      return [
        'Add a new constraint',
        'Add a pricing constraint',
        'Add a compliance constraint',
      ]
    case 'open-questions':
      return [
        'Add a new open question',
        model.open_questions.find(q => q.status === 'open')
          ? `Resolve ${model.open_questions.find(q => q.status === 'open')!.id}`
          : 'Resolve an open question',
        'Add a follow-up question',
      ]
    default:
      return []
  }
}

export function SuggestionChips({
  model,
  onSelect,
}: {
  model: IntentModel
  onSelect: (prompt: string) => void
}) {
  const pathname = usePathname()
  const suggestions = getSuggestions(pathname, model)

  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/suggestion-chips.tsx
git commit -m "feat: add contextual suggestion chips component"
```

---

### Task 11: Create diff preview component

**Files:**
- Create: `src/components/ai/diff-preview.tsx`

- [ ] **Step 1: Create diff-preview.tsx**

```tsx
'use client'

import { Plus, Minus, Pencil, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import type { ModelDiff, ItemChange, FieldChange } from '@/lib/model-diff'

const changeStyles = {
  added: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', icon: Plus, label: 'Added' },
  removed: { border: 'border-l-red-500', bg: 'bg-red-50', icon: Minus, label: 'Removed' },
  modified: { border: 'border-l-amber-500', bg: 'bg-amber-50', icon: Pencil, label: 'Modified' },
} as const

function FieldChanges({ fields }: { fields: FieldChange[] }) {
  return (
    <div className="mt-2 space-y-1 text-xs">
      {fields.map((f) => (
        <div key={f.field} className="flex gap-2">
          <span className="font-medium text-slate-500 min-w-20">{f.field}:</span>
          <span className="text-red-600 line-through">{JSON.stringify(f.old)}</span>
          <span className="text-emerald-600">{JSON.stringify(f.new)}</span>
        </div>
      ))}
    </div>
  )
}

function ChangeItem({ change }: { change: ItemChange }) {
  const [expanded, setExpanded] = useState(false)
  const style = changeStyles[change.type]
  const Icon = style.icon

  return (
    <div className={`border-l-4 ${style.border} ${style.bg} rounded-r p-2`}>
      <button
        type="button"
        onClick={() => change.fields && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left text-sm"
      >
        <Icon size={14} />
        <span className="font-medium">{change.itemName}</span>
        <span className="ml-auto text-xs text-slate-400">{style.label}</span>
      </button>
      {expanded && change.fields && <FieldChanges fields={change.fields} />}
    </div>
  )
}

export function DiffPreview({
  diff,
  warnings,
  onApprove,
  onReject,
  isApplying,
}: {
  diff: ModelDiff
  warnings: string[]
  onApprove: () => void
  onReject: () => void
  isApplying: boolean
}) {
  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {diff.sections.map((section) => (
        <div key={section.sectionType}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {section.sectionType.replace('_', ' ')}
          </h4>
          <div className="space-y-1.5">
            {section.changes.map((change) => (
              <ChangeItem key={change.itemId} change={change} />
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={isApplying}
          className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isApplying ? 'Applying...' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isApplying}
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/diff-preview.tsx
git commit -m "feat: add diff preview component with approve/reject"
```

---

### Task 12: Create version history component

**Files:**
- Create: `src/components/ai/version-history.tsx`

- [ ] **Step 1: Create version-history.tsx**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function VersionHistory({
  versions,
  onRevert,
  isReverting,
}: {
  versions: VersionMeta[]
  onRevert: (versionId: string) => void
  isReverting: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const reversed = [...versions].reverse()

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        History ({versions.length})
      </button>

      {isOpen && (
        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
          {reversed.map((v, i) => (
            <div key={v.id} className="flex items-start gap-2 rounded p-2 text-xs hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{v.author}</span>
                  <span className="text-slate-400">{timeAgo(v.timestamp)}</span>
                </div>
                <p className="truncate text-slate-500">{v.prompt}</p>
              </div>
              {i > 0 && (
                confirmId === v.id ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => { onRevert(v.id); setConfirmId(null) }}
                      disabled={isReverting}
                      className="rounded bg-amber-100 px-2 py-0.5 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded px-2 py-0.5 text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(v.id)}
                    className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                    title="Revert to this version"
                  >
                    <RotateCcw size={12} />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/version-history.tsx
git commit -m "feat: add version history component with revert"
```

---

### Task 13: Create prompt drawer and wire into layout

**Files:**
- Create: `src/components/ai/prompt-drawer.tsx`
- Modify: `src/app/review/layout.tsx`

This is the main component that orchestrates everything.

- [ ] **Step 1: Create prompt-drawer.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sparkles, X, Loader2, RefreshCw } from 'lucide-react'
import { useDrawerStore } from '@/stores/ai-drawer-store'
import { useReviewerStore } from '@/stores/reviewer-store'
import { SuggestionChips } from './suggestion-chips'
import { DiffPreview } from './diff-preview'
import { VersionHistory } from './version-history'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { URL_PARAM_TO_SECTION_TYPE } from '@/domain/intent-model/types'

type VersionMeta = {
  id: string
  timestamp: string
  author: string
  prompt: string
  parentId: string | null
}

function getSectionTypeFromPath(pathname: string): SectionType | null {
  const segment = pathname.split('/').pop()
  if (!segment) return null
  return URL_PARAM_TO_SECTION_TYPE[segment] ?? null
}

export function PromptDrawer({
  model,
  latestVersionId,
}: {
  model: IntentModel
  latestVersionId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const store = useDrawerStore()
  const { currentReviewerId } = useReviewerStore()

  const [prompt, setPrompt] = useState('')
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [isStale, setIsStale] = useState(false)
  const [isReverting, setIsReverting] = useState(false)

  const sectionType = getSectionTypeFromPath(pathname)

  // Check staleness on drawer open
  useEffect(() => {
    if (!store.isOpen) return
    fetch('/api/model/versions')
      .then(r => r.json())
      .then(data => {
        setVersions(data.versions ?? [])
        const latest = data.versions?.[data.versions.length - 1]
        if (latest && latest.id !== latestVersionId) {
          setIsStale(true)
        }
      })
      .catch(() => {})
  }, [store.isOpen, latestVersionId])

  const handleSubmit = useCallback(async (text?: string) => {
    const p = text ?? prompt
    if (!p.trim()) return

    store.setLastPrompt(p)
    store.setStatus('loading')

    try {
      const res = await fetch('/api/model/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          scope: store.scope === 'section' && sectionType ? 'section' : 'full',
          sectionType: store.scope === 'section' ? sectionType : undefined,
        }),
      })

      const data = await res.json()

      if (data.error === 'no_changes') {
        store.setError('No changes detected. Try rephrasing your prompt.')
        return
      }

      if (data.error === 'validation_failed') {
        store.setError(data.details?.join('\n') ?? 'Validation failed')
        return
      }

      if (!res.ok) {
        store.setError(data.message ?? 'Something went wrong')
        return
      }

      store.setProposal({
        proposalId: data.proposalId,
        diff: data.diff,
        proposedModel: data.proposedModel,
        warnings: data.warnings ?? [],
      })
      store.setStatus('diff_preview')
    } catch {
      store.setError('Failed to connect to the server')
    }
  }, [prompt, store, sectionType])

  const handleApprove = useCallback(async () => {
    if (!store.currentProposal || !currentReviewerId) return

    store.setStatus('applying')

    try {
      const res = await fetch('/api/model/edit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: store.currentProposal.proposalId,
          author: currentReviewerId,
          prompt: store.lastPrompt ?? '',
        }),
      })

      const data = await res.json()

      if (data.error === 'proposal_expired') {
        const lastPrompt = useDrawerStore.getState().lastPrompt
        if (lastPrompt) {
          store.reset()
          handleSubmit(lastPrompt)
          return
        }
      }

      if (data.error === 'version_conflict') {
        store.setError('Model was updated by someone else. Retrying...')
        setTimeout(() => {
          const lastPrompt = useDrawerStore.getState().lastPrompt
          store.reset()
          if (lastPrompt) handleSubmit(lastPrompt)
        }, 1000)
        return
      }

      if (!res.ok) {
        store.setError(data.message ?? 'Failed to apply changes')
        return
      }

      store.setStatus('success')
      setPrompt('')
      setTimeout(() => {
        store.reset()
        router.refresh()
      }, 1500)
    } catch {
      store.setError('Failed to connect to the server')
    }
  }, [store, currentReviewerId, router, handleSubmit])

  const handleRevert = useCallback(async (versionId: string) => {
    if (!currentReviewerId) return
    setIsReverting(true)

    try {
      const res = await fetch('/api/model/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, author: currentReviewerId }),
      })

      if (res.ok) {
        const data = await fetch('/api/model/versions').then(r => r.json())
        setVersions(data.versions ?? [])
        router.refresh()
      }
    } catch {
      // silently fail
    } finally {
      setIsReverting(false)
    }
  }, [currentReviewerId, router])

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={store.open}
        className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#002C61] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="AI Editor"
      >
        <Sparkles size={20} />
      </button>

      {/* Backdrop */}
      {store.isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm"
          onClick={store.close}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-30 flex h-full w-[400px] flex-col bg-white shadow-xl transition-transform duration-200 ${
          store.isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#002C61]" />
            <h3 className="text-sm font-semibold text-slate-800">AI Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => store.setScope(store.scope === 'section' ? 'full' : 'section')}
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
              style={{
                borderColor: store.scope === 'section' ? '#002C61' : '#cbd5e1',
                color: store.scope === 'section' ? '#002C61' : '#64748b',
                backgroundColor: store.scope === 'section' ? '#002C61' + '10' : 'transparent',
              }}
            >
              {store.scope === 'section' && sectionType
                ? sectionType.replace('_', ' ')
                : 'Full model'}
            </button>
            <button type="button" onClick={store.close} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Staleness banner */}
          {isStale && (
            <div className="flex items-center gap-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
              <span>Model has been updated.</span>
              <button
                type="button"
                onClick={() => { router.refresh(); setIsStale(false) }}
                className="flex items-center gap-1 font-medium underline"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          )}

          {/* Idle state: suggestions + input */}
          {(store.status === 'idle' || store.status === 'loading') && (
            <>
              <SuggestionChips model={model} onSelect={(s) => setPrompt(s)} />

              <div className="space-y-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the change you want to make..."
                  disabled={store.status === 'loading'}
                  className="h-24 w-full resize-none rounded border border-slate-200 p-3 text-sm placeholder:text-slate-400 focus:border-[#002C61] focus:outline-none focus:ring-1 focus:ring-[#002C61] disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim() || store.status === 'loading'}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[#002C61] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#003a7d] disabled:opacity-50"
                >
                  {store.status === 'loading' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Error state */}
          {store.status === 'error' && store.error && (
            <div className="space-y-2">
              <div className="rounded bg-red-50 p-3 text-sm text-red-700">
                {store.error}
              </div>
              <button
                type="button"
                onClick={store.reset}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Try again
              </button>
            </div>
          )}

          {/* Diff preview state */}
          {store.status === 'diff_preview' && store.currentProposal && (
            <DiffPreview
              diff={store.currentProposal.diff}
              warnings={store.currentProposal.warnings}
              onApprove={handleApprove}
              onReject={store.reject}
              isApplying={false}
            />
          )}

          {/* Applying state */}
          {store.status === 'applying' && store.currentProposal && (
            <DiffPreview
              diff={store.currentProposal.diff}
              warnings={store.currentProposal.warnings}
              onApprove={handleApprove}
              onReject={store.reject}
              isApplying={true}
            />
          )}

          {/* Success state */}
          {store.status === 'success' && (
            <div className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">
              Changes applied successfully.
            </div>
          )}

          {/* Version history */}
          <VersionHistory
            versions={versions}
            onRevert={handleRevert}
            isReverting={isReverting}
          />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update review layout to include the drawer**

In `src/app/review/layout.tsx`:
- Add `import { getCurrentModel, getLatestVersionId } from '@/lib/model-store'`
- Add `import { PromptDrawer } from '@/components/ai/prompt-drawer'`
- In the component body, add:
  ```ts
  const model = await getCurrentModel()
  const latestVersionId = await getLatestVersionId()
  ```
- Before the closing `</>` of the layout, add:
  ```tsx
  <PromptDrawer model={model} latestVersionId={latestVersionId} />
  ```

- [ ] **Step 3: Verify build**

Run: `pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/ src/app/review/layout.tsx
git commit -m "feat: add AI prompt drawer with suggestions, diff preview, and version history"
```

---

## Chunk 4: Integration and Smoke Test

### Task 14: Create .env.local and smoke test

**Files:**
- Create: `.env.local` (if not exists)

- [ ] **Step 1: Ensure OPENAI_API_KEY is set**

Create `.env.local` if it doesn't exist, add:

```
OPENAI_API_KEY=sk-...
```

(Replace with actual key)

- [ ] **Step 2: Run dev server and smoke test**

Run: `pnpm dev`

Manual test checklist:
1. Open `http://localhost:3000/review` — verify dashboard loads (uses `getCurrentModel()` now)
2. Navigate to Actors page — verify all 4 actors render
3. Click the sparkle button (bottom-right) — drawer opens
4. Verify scope pill shows "actor" on actors page
5. Verify 3 suggestion chips appear
6. Click a suggestion chip — populates the textarea
7. Type a prompt like "Add a responsibility to ACFS Internal for managing gate access" and submit
8. Wait for diff preview — should show a modified item for ACFS Internal with a new responsibility
9. Check for any validation warnings
10. Click Approve — changes persist, page refreshes with new data
11. Open drawer again — version history shows the new edit
12. Test revert: click revert on the seed version, confirm — model should revert

- [ ] **Step 3: Fix any lint issues**

Run: `pnpm lint`

- [ ] **Step 4: Final commit**

```bash
git add .env.local
git commit -m "feat: add environment config for AI model editor"
```

Note: `.env.local` should already be in `.gitignore` (it is). This final commit is only needed if there are any remaining unstaged fixes from the smoke test. Stage specific files only.
