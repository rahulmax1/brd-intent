# BRD Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a BRD document from the intent model — auto-saved on model edits, downloadable as Markdown, and viewable as a styled preview page with PDF export via browser print.

**Architecture:** Pure `generateBRD()` function for Markdown output, `GET /api/brd` endpoint for on-demand access, auto-write hook in the model edit apply route (local dev only), and a `/review/brd` server-rendered preview page with `'use client'` export buttons.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Node.js `fs/path` built-ins. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-19-brd-generator-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/brd-generator.ts` | Pure `generateBRD(model) → string` + `matchDecisionsToSections()` heuristic + `writeBRD()` disk helper |
| `src/app/api/brd/route.ts` | `GET` endpoint — returns Markdown or JSON |
| `src/app/review/brd/page.tsx` | Server component — renders BRD from model as styled JSX |
| `src/app/review/brd/brd-export-buttons.tsx` | `'use client'` — Export PDF + Export Markdown buttons |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/paths.ts` | Add `BRD_OUTPUT_PATH` |
| `src/app/api/model/edit/apply/route.ts` | Call `writeBRD()` after `addVersion()` |
| `src/components/review/nav-links.tsx` | Add BRD nav item |
| `src/components/review/layout-shell.tsx` | Add `/review/brd` to `FULL_WIDTH_ROUTES` |
| `.gitignore` | Add `docs/generated/` |

---

### Task 1: Add BRD_OUTPUT_PATH and .gitignore entry

**Files:**
- Modify: `src/lib/paths.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add BRD_OUTPUT_PATH to paths.ts**

In `src/lib/paths.ts`, add after the existing exports:

```typescript
export const BRD_OUTPUT_PATH = path.join(process.cwd(), 'docs', 'generated', 'BRD.md')
```

- [ ] **Step 2: Add docs/generated/ to .gitignore**

Append to `.gitignore`:

```
docs/generated/
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/paths.ts .gitignore
git commit -m "chore: add BRD output path constant and gitignore entry"
```

---

### Task 2: Build the inline decision matcher

**Files:**
- Create: `src/lib/brd-generator.ts` (partial — just the matcher for now)

The decision matcher scans resolved open questions and maps them to the model section they belong to. This is the trickiest logic, so we build and verify it first.

- [ ] **Step 1: Create brd-generator.ts with the matcher function**

Create `src/lib/brd-generator.ts`:

```typescript
import type { IntentModel, OpenQuestion } from '@/domain/intent-model/types'

export type DecisionMatch = {
  question: OpenQuestion
  matchedType: 'actor' | 'entity' | 'journey' | 'rule' | null
  matchedId: string | null
}

export function matchDecisionsToSections(model: IntentModel): DecisionMatch[] {
  const resolved = model.open_questions.filter(q => q.status === 'resolved')

  const actorIds = model.actors.map(a => a.id)
  const entityIds = model.entities.map(e => e.id)
  const journeyIds = model.journeys.map(j => j.id)

  return resolved.map(q => {
    const text = `${q.question} ${q.resolution ?? ''}`.toLowerCase()

    // Check actors
    for (const id of actorIds) {
      if (text.includes(id)) {
        return { question: q, matchedType: 'actor', matchedId: id }
      }
    }

    // Check entities
    for (const id of entityIds) {
      if (text.includes(id)) {
        return { question: q, matchedType: 'entity', matchedId: id }
      }
    }

    // Check journeys
    for (const id of journeyIds) {
      if (text.includes(id)) {
        return { question: q, matchedType: 'journey', matchedId: id }
      }
    }

    // Check business rules applies_to
    for (const rule of model.business_rules) {
      for (const ref of rule.applies_to) {
        if (text.includes(ref)) {
          return { question: q, matchedType: 'rule', matchedId: rule.id }
        }
      }
    }

    return { question: q, matchedType: null, matchedId: null }
  })
}
```

- [ ] **Step 2: Verify the matcher compiles**

```bash
cd /Users/rahul/DBiz/vbs-intent && npx tsc --noEmit src/lib/brd-generator.ts 2>&1 | head -20
```

If there are path alias issues with `tsc --noEmit` on a single file, instead run the full project type check:

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `brd-generator.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/brd-generator.ts
git commit -m "feat: add inline decision matcher for BRD generation"
```

---

### Task 3: Build the Markdown generator

**Files:**
- Modify: `src/lib/brd-generator.ts`

Add the `generateBRD(model)` and `writeBRD(model)` functions. This is the core template engine.

- [ ] **Step 1: Add generateBRD and writeBRD to brd-generator.ts**

Add these imports at the top of `src/lib/brd-generator.ts`:

```typescript
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { BRD_OUTPUT_PATH } from './paths'
```

Add the `generateBRD` function after `matchDecisionsToSections`:

```typescript
export function generateBRD(model: IntentModel): string {
  const decisions = matchDecisionsToSections(model)
  const lines: string[] = []

  function push(line: string) { lines.push(line) }
  function blank() { lines.push('') }

  function decisionsFor(type: DecisionMatch['matchedType'], id: string): string[] {
    return decisions
      .filter(d => d.matchedType === type && d.matchedId === id)
      .map(d => `> **Decision (${d.question.id}):** ${d.question.resolution}\n> *${d.question.reason}*`)
  }

  function renderWarn(warn?: string) {
    if (warn) push(`\n> ⚠️ **Warning:** ${warn}\n`)
  }

  function renderEdge(edge?: string) {
    if (edge) push(`\n> 🔄 **Edge case:** ${edge}\n`)
  }

  // --- Header ---
  push(`# ${model.meta.project} — Business Requirements Document`)
  blank()
  push(`**Version:** ${model.meta.version}`)
  push(`**Status:** ${model.meta.status}`)
  push(`**Last Updated:** ${model.meta.lastUpdated}`)
  push(`**Generated from Intent Model:** v${model.meta.version}`)
  blank()
  push('---')
  blank()

  // --- 1. Purpose & Scope ---
  push('## 1. Purpose & Scope')
  blank()
  push(`The ${model.meta.project} is a web-based system for managing container pickup bookings at ACFS facilities. It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots, manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.`)
  blank()

  // --- 2. Actors ---
  push('## 2. Actors — Who Is Involved')
  blank()
  for (const actor of model.actors) {
    push(`### ${actor.name}`)
    blank()
    push(actor.description)
    blank()
    push(`**Authentication:** ${actor.auth}`)
    blank()
    push('**Responsibilities:**')
    blank()
    for (const r of actor.responsibilities) {
      push(`- **${r.id}:** ${r.description}`)
      renderWarn(r.warn)
      renderEdge(r.edge)
    }
    blank()
    const actorDecisions = decisionsFor('actor', actor.id)
    for (const d of actorDecisions) { push(d); blank() }
  }

  // --- 3. Entities ---
  push('## 3. Entities — Key Data with Lifecycle')
  blank()
  for (const entity of model.entities) {
    push(`### ${entity.name}`)
    blank()
    push(entity.description)
    blank()

    // Key fields table
    if (entity.key_fields.length > 0) {
      push('**Key Fields:**')
      blank()
      push('| Field | Type | Description |')
      push('|-------|------|-------------|')
      for (const f of entity.key_fields) {
        push(`| ${f.name} | ${f.type} | ${f.description} |`)
        renderWarn(f.warn)
      }
      blank()
    }

    // Lifecycle
    if (entity.lifecycle.states.length > 0) {
      push('**Lifecycle States:**')
      blank()
      for (const s of entity.lifecycle.states) {
        push(`- ${s}`)
      }
      blank()
      renderWarn(entity.lifecycle.warn)
    }

    // Transitions
    if (entity.lifecycle.transitions.length > 0) {
      push('**Transitions:**')
      blank()
      push('| From | To | Trigger | Guard |')
      push('|------|-----|---------|-------|')
      for (const t of entity.lifecycle.transitions) {
        push(`| ${t.from} | ${t.to} | ${t.trigger} | ${t.guard ?? '—'} |`)
        renderWarn(t.warn)
      }
      blank()
    }

    const entityDecisions = decisionsFor('entity', entity.id)
    for (const d of entityDecisions) { push(d); blank() }
  }

  // --- 4. User Journeys ---
  push('## 4. User Journeys')
  blank()
  const actorGroups = new Map<string, typeof model.journeys>()
  for (const j of model.journeys) {
    const group = actorGroups.get(j.primary_actor) ?? []
    group.push(j)
    actorGroups.set(j.primary_actor, group)
  }

  for (const [actorId, journeys] of actorGroups) {
    const actor = model.actors.find(a => a.id === actorId)
    push(`### ${actor?.name ?? actorId} Journeys`)
    blank()

    for (const journey of journeys) {
      push(`#### ${journey.name}`)
      blank()
      renderWarn(journey.warn)

      if (journey.preconditions.length > 0) {
        push('**Preconditions:**')
        blank()
        for (const p of journey.preconditions) {
          push(`- ${p}`)
        }
        blank()
      }

      push('**Steps:**')
      blank()
      for (const step of journey.steps) {
        const pre = step.precondition ? ` *(Requires: ${step.precondition})*` : ''
        push(`${step.order}. **${step.title}** — ${step.detail}${pre}`)
        renderWarn(step.warn)
        renderEdge(step.edge)
      }
      blank()

      push(`**Success Outcome:** ${journey.success_outcome}`)
      blank()

      const journeyDecisions = decisionsFor('journey', journey.id)
      for (const d of journeyDecisions) { push(d); blank() }
    }
  }

  // --- 5. Business Rules ---
  push('## 5. Business Rules')
  blank()
  for (const rule of model.business_rules) {
    push(`**${rule.id}:** ${rule.description}`)
    push(`- *Applies to:* ${rule.applies_to.join(', ')}`)
    push(`- *Source:* ${rule.source}`)
    renderWarn(rule.warn)
    blank()
  }

  // --- 6. Constraints ---
  push('## 6. Constraints')
  blank()
  const constraintGroups = new Map<string, typeof model.constraints>()
  for (const c of model.constraints) {
    const group = constraintGroups.get(c.type) ?? []
    group.push(c)
    constraintGroups.set(c.type, group)
  }

  for (const [type, constraints] of constraintGroups) {
    push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    blank()
    for (const c of constraints) {
      push(`- **${c.id}:** ${c.constraint}`)
    }
    blank()
  }

  // --- 7. Open Questions & Decision Log ---
  push('## 7. Open Questions & Decision Log')
  blank()

  const openQs = model.open_questions.filter(q => q.status === 'open' || q.status === 'deferred')
  const resolvedQs = model.open_questions.filter(q => q.status === 'resolved')

  if (openQs.length > 0) {
    push('### 7a. Open Questions')
    blank()
    for (const q of openQs) {
      const badge = q.status === 'deferred' ? ' `DEFERRED`' : ' `OPEN`'
      push(`**${q.id}:**${badge} ${q.question}`)
      push(`- *Reason:* ${q.reason}`)
      blank()
    }
  }

  if (resolvedQs.length > 0) {
    push('### 7b. Decision Log')
    blank()
    for (const q of resolvedQs) {
      push(`**${q.id}:** ${q.question}`)
      push(`- *Resolution:* ${q.resolution}`)
      blank()
    }
  }

  // --- Footer (for Markdown — print footer is handled in the preview page) ---
  push('---')
  blank()
  push(`*Generated from Intent Model v${model.meta.version} on ${new Date().toISOString().split('T')[0]}*`)

  return lines.join('\n')
}
```

Add the `writeBRD` function:

```typescript
export async function writeBRD(model: IntentModel): Promise<void> {
  const markdown = generateBRD(model)
  await mkdir(dirname(BRD_OUTPUT_PATH), { recursive: true })
  await writeFile(BRD_OUTPUT_PATH, markdown, 'utf-8')
}
```

- [ ] **Step 2: Type-check the full file**

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Quick smoke test — generate BRD to disk**

Create a one-off script to verify output. Run with `tsx`:

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsx -e "
  import { intentModel } from './src/domain/intent-model/model'
  import { generateBRD } from './src/lib/brd-generator'
  import { mkdirSync, writeFileSync } from 'fs'
  const md = generateBRD(intentModel)
  mkdirSync('docs/generated', { recursive: true })
  writeFileSync('docs/generated/BRD.md', md)
  console.log('Generated', md.split('\n').length, 'lines')
"
```

Then visually inspect `docs/generated/BRD.md` to verify sections look correct.

- [ ] **Step 4: Commit**

```bash
git add src/lib/brd-generator.ts
git commit -m "feat: add BRD Markdown generator with inline decision matching"
```

---

### Task 4: Add the API endpoint

**Files:**
- Create: `src/app/api/brd/route.ts`

- [ ] **Step 1: Create the GET /api/brd route**

Create `src/app/api/brd/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getCurrentModel } from '@/lib/model-store'
import { generateBRD } from '@/lib/brd-generator'

export async function GET(request: Request) {
  try {
    const model = await getCurrentModel()
    const markdown = generateBRD(model)

    const { searchParams } = new URL(request.url)
    if (searchParams.get('format') === 'json') {
      return NextResponse.json({
        markdown,
        meta: {
          version: model.meta.version,
          project: model.meta.project,
          generatedAt: new Date().toISOString(),
        },
      })
    }

    return new NextResponse(markdown, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'brd_generation_failed', message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Test the endpoint**

Start the dev server (if not already running) and test:

```bash
curl -s http://localhost:3002/api/brd | head -20
```

Expected: first 20 lines of the generated BRD Markdown.

```bash
curl -s "http://localhost:3002/api/brd?format=json" | head -5
```

Expected: JSON with `markdown` and `meta` keys.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/brd/route.ts
git commit -m "feat: add GET /api/brd endpoint for on-demand BRD generation"
```

---

### Task 5: Hook auto-generation into model edit apply

**Files:**
- Modify: `src/app/api/model/edit/apply/route.ts`

- [ ] **Step 1: Add writeBRD call after addVersion**

In `src/app/api/model/edit/apply/route.ts`, add the import at the top:

```typescript
import { writeBRD } from '@/lib/brd-generator'
```

After line 42 (`await addVersion(version)`), add:

```typescript
    // Auto-generate BRD (local dev only — no persistent FS on Vercel)
    if (!process.env.KV_REST_API_URL) {
      await writeBRD(version.model)
    }
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/model/edit/apply/route.ts
git commit -m "feat: auto-generate BRD on model edit apply (local dev)"
```

---

### Task 6: Add navigation and layout integration

**Files:**
- Modify: `src/components/review/nav-links.tsx`
- Modify: `src/components/review/layout-shell.tsx`

- [ ] **Step 1: Add BRD to FULL_WIDTH_ROUTES**

In `src/components/review/layout-shell.tsx`, change line 5:

```typescript
const FULL_WIDTH_ROUTES = ['/review/docs', '/review/diff', '/review/ia', '/review/brd']
```

- [ ] **Step 2: Add BRD nav item**

In `src/components/review/nav-links.tsx`:

Add `ClipboardList` to the lucide-react import (line 6-17 area).

Insert this entry into the `navItems` array between `Open Qs` and `IA Map`. The surrounding context should look like:

```typescript
  { label: 'Open Qs', href: '/review/open-questions', icon: HelpCircle },
  { label: 'BRD', href: '/review/brd', icon: ClipboardList },
  { label: 'IA Map', href: '/review/ia', icon: Map },
```

- [ ] **Step 3: Verify visually**

Start the dev server and navigate to `/review`. Confirm:
- "BRD" appears in the sidebar between "Open Qs" and "IA Map"
- Clicking it navigates to `/review/brd` (will show a 404 or empty page until Task 7)
- Chat panel and model toolbar are hidden on the BRD route

- [ ] **Step 4: Commit**

```bash
git add src/components/review/nav-links.tsx src/components/review/layout-shell.tsx
git commit -m "feat: add BRD nav item and full-width layout registration"
```

---

### Task 7: Build the BRD preview page

**Files:**
- Create: `src/app/review/brd/page.tsx`
- Create: `src/app/review/brd/brd-export-buttons.tsx`

This is the largest task. The preview page renders the BRD directly from the model as styled JSX — not via markdown-to-HTML conversion.

- [ ] **Step 1: Create the export buttons client component**

Create `src/app/review/brd/brd-export-buttons.tsx`:

```tsx
'use client'

import { useCallback } from 'react'
import { Printer, Download } from 'lucide-react'

export function BRDExportButtons({ version }: { version: string }) {
  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handleExportMarkdown = useCallback(async () => {
    const res = await fetch('/api/brd')
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BRD-v${version}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [version])

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleExportMarkdown}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 hover:bg-black/[0.04] print:hidden"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Download size={13} />
        Export Markdown
      </button>
      <button
        type="button"
        onClick={handleExportPDF}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 print:hidden"
        style={{
          color: 'var(--bg-white)',
          background: 'var(--acfs-navy)',
        }}
      >
        <Printer size={13} />
        Export PDF
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create the BRD preview page**

Create `src/app/review/brd/page.tsx`. This is a server component that renders the model data as structured JSX. The page is long but straightforward — it maps each model section into styled HTML, matching the review app's design language.

Refer to the spec (`docs/superpowers/specs/2026-03-19-brd-generator-design.md`) for the exact section structure. The page should:

1. Fetch model via `getCurrentModel()`
2. Run `matchDecisionsToSections(model)` to get inline decisions
3. Render a header bar with title + `<BRDExportButtons version={model.meta.version} />`
4. Render each BRD section as styled JSX in a scrollable `max-w-[780px] mx-auto` container
5. Use these callout styles:
   - Decisions: `border-l-4 border-blue-400 bg-blue-50/50 px-4 py-3`
   - Warnings: `border-l-4 border-amber-400 bg-amber-50/50 px-4 py-3`
   - Edge cases: `border-l-4 border-slate-300 bg-slate-50/50 px-4 py-3`
6. Tables: consistent with the app (`text-sm`, `border-collapse`, alternating row bg)
7. Print footer: `<div className="hidden print:block">` at the bottom

```tsx
import { getCurrentModel } from '@/lib/model-store'
import { matchDecisionsToSections } from '@/lib/brd-generator'
import type { DecisionMatch } from '@/lib/brd-generator'
import type { OpenQuestion } from '@/domain/intent-model/types'
import { BRDExportButtons } from './brd-export-buttons'

export const dynamic = 'force-dynamic'

function DecisionCallout({ question }: { question: OpenQuestion }) {
  return (
    <div className="my-3 rounded-lg border-l-4 border-blue-400 bg-blue-50/50 px-4 py-3">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Decision ({question.id})
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{question.resolution}</p>
      <p className="mt-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>{question.reason}</p>
    </div>
  )
}

function WarnCallout({ text }: { text: string }) {
  return (
    <div className="my-2 rounded-lg border-l-4 border-amber-400 bg-amber-50/50 px-4 py-2.5">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>⚠️ {text}</p>
    </div>
  )
}

function EdgeCallout({ text }: { text: string }) {
  return (
    <div className="my-2 rounded-lg border-l-4 border-slate-300 bg-slate-50/50 px-4 py-2.5">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>🔄 {text}</p>
    </div>
  )
}

function SectionDivider() {
  return <hr className="my-8 border-t" style={{ borderColor: 'var(--border-default)' }} />
}

function decisionsFor(decisions: DecisionMatch[], type: DecisionMatch['matchedType'], id: string) {
  return decisions
    .filter(d => d.matchedType === type && d.matchedId === id)
    .map(d => <DecisionCallout key={d.question.id} question={d.question} />)
}

export default async function BRDPage() {
  const model = await getCurrentModel()
  const decisions = matchDecisionsToSections(model)

  // Group journeys by actor
  const journeysByActor = new Map<string, typeof model.journeys>()
  for (const j of model.journeys) {
    const group = journeysByActor.get(j.primary_actor) ?? []
    group.push(j)
    journeysByActor.set(j.primary_actor, group)
  }

  // Group constraints by type
  const constraintsByType = new Map<string, typeof model.constraints>()
  for (const c of model.constraints) {
    const group = constraintsByType.get(c.type) ?? []
    group.push(c)
    constraintsByType.set(c.type, group)
  }

  const openQs = model.open_questions.filter(q => q.status === 'open' || q.status === 'deferred')
  const resolvedQs = model.open_questions.filter(q => q.status === 'resolved')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header toolbar */}
      <div
        className="flex h-[54px] shrink-0 items-center justify-between border-b px-6 print:hidden"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Business Requirements Document
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            v{model.meta.version} — {model.meta.status}
          </p>
        </div>
        <BRDExportButtons version={model.meta.version} />
      </div>

      {/* Scrollable BRD content */}
      <div className="flex-1 overflow-y-auto custom-scroll print:overflow-visible">
        <div className="mx-auto max-w-[780px] px-10 py-8 print:max-w-none print:px-0">

          {/* Header */}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--acfs-navy)' }}>
            {model.meta.project}
          </h1>
          <h2 className="mt-1 text-lg font-normal" style={{ color: 'var(--text-secondary)' }}>
            Business Requirements Document
          </h2>
          <div className="mt-4 flex gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>Version {model.meta.version}</span>
            <span>Status: {model.meta.status}</span>
            <span>Updated: {model.meta.lastUpdated}</span>
          </div>

          <SectionDivider />

          {/* 1. Purpose & Scope */}
          <section className="print:break-before-auto">
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--acfs-navy)' }}>
              1. Purpose & Scope
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The {model.meta.project} is a web-based system for managing container pickup bookings at ACFS facilities.
              It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots,
              manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.
            </p>
          </section>

          <SectionDivider />

          {/* 2. Actors */}
          <section className="print:break-before-page">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              2. Actors — Who Is Involved
            </h2>
            {model.actors.map(actor => (
              <div key={actor.id} className="mb-8">
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {actor.name}
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{actor.description}</p>
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  <strong>Authentication:</strong> {actor.auth}
                </p>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Responsibilities:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {actor.responsibilities.map(r => (
                    <li key={r.id}>
                      {r.description}
                      {r.warn && <WarnCallout text={r.warn} />}
                      {r.edge && <EdgeCallout text={r.edge} />}
                    </li>
                  ))}
                </ol>
                {decisionsFor(decisions, 'actor', actor.id)}
              </div>
            ))}
          </section>

          <SectionDivider />

          {/* 3. Entities */}
          <section className="print:break-before-page">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              3. Entities — Key Data with Lifecycle
            </h2>
            {model.entities.map(entity => (
              <div key={entity.id} className="mb-8">
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {entity.name}
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{entity.description}</p>

                {entity.key_fields.length > 0 && (
                  <>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Key Fields:</p>
                    <table className="mb-4 w-full text-sm border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Field</th>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
                          <th className="py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entity.key_fields.map(f => (
                          <tr key={f.name} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td className="py-2 pr-4 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</td>
                            <td className="py-2 pr-4" style={{ color: 'var(--text-muted)' }}>{f.type}</td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                              {f.description}
                              {f.warn && <WarnCallout text={f.warn} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {entity.lifecycle.states.length > 0 && (
                  <>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Lifecycle States:</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {entity.lifecycle.states.map(s => (
                        <span key={s} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--bg-card-gray)', color: 'var(--text-secondary)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    {entity.lifecycle.warn && <WarnCallout text={entity.lifecycle.warn} />}
                  </>
                )}

                {entity.lifecycle.transitions.length > 0 && (
                  <>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Transitions:</p>
                    <table className="mb-4 w-full text-sm border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>From</th>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>To</th>
                          <th className="py-2 pr-4 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Trigger</th>
                          <th className="py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Guard</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entity.lifecycle.transitions.map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{t.from}</td>
                            <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{t.to}</td>
                            <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{t.trigger}</td>
                            <td className="py-2" style={{ color: 'var(--text-muted)' }}>{t.guard ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {decisionsFor(decisions, 'entity', entity.id)}
              </div>
            ))}
          </section>

          <SectionDivider />

          {/* 4. User Journeys */}
          <section className="print:break-before-page">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              4. User Journeys
            </h2>
            {Array.from(journeysByActor.entries()).map(([actorId, journeys]) => {
              const actor = model.actors.find(a => a.id === actorId)
              return (
                <div key={actorId} className="mb-8">
                  <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {actor?.name ?? actorId} Journeys
                  </h3>
                  {journeys.map(journey => (
                    <div key={journey.id} className="mb-6 pl-4" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {journey.name}
                      </h4>
                      {journey.warn && <WarnCallout text={journey.warn} />}

                      {journey.preconditions.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Preconditions:</p>
                          <ul className="list-disc list-inside text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {journey.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}

                      <ol className="list-decimal list-inside space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {journey.steps.map(step => (
                          <li key={step.order}>
                            <strong>{step.title}</strong> — {step.detail}
                            {step.precondition && (
                              <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}> (Requires: {step.precondition})</span>
                            )}
                            {step.warn && <WarnCallout text={step.warn} />}
                            {step.edge && <EdgeCallout text={step.edge} />}
                          </li>
                        ))}
                      </ol>

                      <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <strong>Outcome:</strong> {journey.success_outcome}
                      </p>

                      {decisionsFor(decisions, 'journey', journey.id)}
                    </div>
                  ))}
                </div>
              )
            })}
          </section>

          <SectionDivider />

          {/* 5. Business Rules */}
          <section className="print:break-before-page">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              5. Business Rules
            </h2>
            <div className="space-y-4">
              {model.business_rules.map(rule => (
                <div key={rule.id} className="rounded-lg p-4" style={{ background: 'var(--bg-card-gray)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {rule.id}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{rule.description}</p>
                  <div className="mt-2 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Applies to: {rule.applies_to.join(', ')}</span>
                    <span>Source: {rule.source}</span>
                  </div>
                  {rule.warn && <WarnCallout text={rule.warn} />}
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* 6. Constraints */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              6. Constraints
            </h2>
            {Array.from(constraintsByType.entries()).map(([type, constraints]) => (
              <div key={type} className="mb-4">
                <h3 className="text-sm font-semibold mb-2 capitalize" style={{ color: 'var(--text-primary)' }}>
                  {type}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {constraints.map(c => (
                    <li key={c.id}><strong>{c.id}:</strong> {c.constraint}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <SectionDivider />

          {/* 7. Open Questions & Decision Log */}
          <section className="print:break-before-page">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--acfs-navy)' }}>
              7. Open Questions & Decision Log
            </h2>

            {openQs.length > 0 && (
              <>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  7a. Open Questions
                </h3>
                <div className="space-y-3 mb-8">
                  {openQs.map(q => (
                    <div key={q.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          q.status === 'deferred'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{q.question}</p>
                      <p className="mt-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>{q.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {resolvedQs.length > 0 && (
              <>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  7b. Decision Log
                </h3>
                <div className="space-y-3">
                  {resolvedQs.map(q => (
                    <div key={q.id} className="rounded-lg p-4" style={{ background: 'var(--bg-card-gray)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q.id}</span>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{q.question}</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>{q.resolution}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Print footer */}
          <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Generated from Intent Model v{model.meta.version} on {new Date().toISOString().split('T')[0]}
          </div>

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add print styles**

The preview page needs `@media print` styles. Add these to the app's global CSS or as a `<style>` tag within the page. Key rules:

```css
@media print {
  /* Hide sidebar and non-content elements */
  .nav-sidebar,
  .print\\:hidden {
    display: none !important;
  }

  /* Full width content */
  body {
    background: white !important;
  }

  /* Page breaks */
  .print\\:break-before-page {
    break-before: page;
  }

  /* Prevent table row splits */
  tr {
    break-inside: avoid;
  }
}
```

Check if the existing Tailwind config and `globals.css` already handle `print:` variants — Tailwind v4 supports `print:` by default, so `print:hidden` and `print:break-before-page` should work without custom CSS. Only add custom print CSS if the sidebar/nav don't hide properly.

- [ ] **Step 4: Verify visually**

Navigate to `http://localhost:3002/review/brd` and verify:
- All 7 BRD sections render correctly
- Inline decision callouts appear under their matched sections
- Warning and edge case callouts render with correct colors
- Tables are properly formatted
- Export Markdown button downloads a `.md` file
- Export PDF button opens print dialog
- Print preview shows clean output without sidebar/toolbar

- [ ] **Step 5: Commit**

```bash
git add src/app/review/brd/
git commit -m "feat: add BRD preview page with export buttons and print styles"
```

---

### Task 8: Final verification and lint

**Files:** All modified files

- [ ] **Step 1: Run type check**

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run lint**

```bash
cd /Users/rahul/DBiz/vbs-intent && pnpm lint
```

Fix any lint errors.

- [ ] **Step 3: Full visual walkthrough**

1. Navigate to `/review` — confirm BRD in sidebar
2. Click BRD — preview page loads with all sections
3. Click "Export Markdown" — `.md` file downloads, open and verify content
4. Click "Export PDF" — print dialog opens, preview looks clean
5. Make a model edit via the AI chat panel — verify `docs/generated/BRD.md` is created/updated

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "chore: fix lint and type errors from BRD generator"
```
