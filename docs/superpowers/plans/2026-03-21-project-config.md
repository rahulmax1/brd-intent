# Project Config Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract hardcoded project-specific strings into a single `project.config.ts` so the repo can be reused for any intent model.

**Architecture:** One config file at the repo root exports a typed `ProjectConfig` object. Six consumer files import from it instead of hardcoding strings. No structural changes to routing, rendering, or types.

**Tech Stack:** TypeScript, Next.js (App Router)

**Spec:** `docs/superpowers/specs/2026-03-21-project-config-design.md`

---

### Task 1: Create the ProjectConfig type and config file

**Files:**
- Create: `src/lib/project-config-schema.ts`
- Create: `project.config.ts`
- Create: `src/lib/project-config.ts` (re-export so consumers use `@/lib/project-config`)

- [ ] **Step 1: Create the type definition**

Create `src/lib/project-config-schema.ts`:

```ts
export type ProjectConfig = {
  name: string
  shortName: string
  iconLetter: string
  description: string
  abbreviations: Record<string, string>
  brd: {
    introText: string
    scopeText: string
  }
  ai: {
    idExamples: string
    journeyIdExamples: string
    idPatternHint: string
  }
}
```

- [ ] **Step 2: Create the config file**

Create `project.config.ts` at the repo root:

```ts
import { type ProjectConfig } from '@/lib/project-config-schema'

export const projectConfig: ProjectConfig = {
  name: 'VBS Intent Model Review',
  shortName: 'VBS Intent',
  iconLetter: 'V',
  description: 'VBS Intent Model Consensus System — a review tool for business requirements',

  abbreviations: {
    HBL: 'House Bill of Lading',
    WFF: 'Wholesale Freight Forwarder',
    FF: 'Freight Forwarder',
    LSP: 'Logistics Service Provider',
    P4TC: 'Party to Collect',
    NVOCC: 'Non-Vessel Operating Common Carrier',
    DO: 'Delivery Order',
    TC: 'Transport Carrier',
    BRD: 'Business Requirements Document',
    OTP: 'One-Time Password',
    SSO: 'Single Sign-On',
    ABF: 'Australian Border Force',
    FOC: 'Free of Charge',
    ACFS: 'Australian Container Freight Services',
    VBS: 'Vehicle Booking System',
    ECST: 'ECST (pending definition)',
    ICS: 'Integrated Cargo System',
  },

  brd: {
    introText: 'The {project} is a web-based system for managing container pickup bookings at ACFS facilities.',
    scopeText: 'It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots, manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.',
  },

  ai: {
    idExamples: "short lowercase, e.g. 'lsp', 'acfs', 'p4tc'",
    journeyIdExamples: "kebab-case, e.g. 'carrier-books-pickup'",
    idPatternHint: 'if actors have lsp, p4tc, acfs — a new actor gets a short lowercase ID',
  },
}
```

- [ ] **Step 3: Create the re-export**

Create `src/lib/project-config.ts` so all consumers can use `@/lib/project-config`:

```ts
export { projectConfig } from '../../project.config'
export type { ProjectConfig } from './project-config-schema'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/project-config-schema.ts src/lib/project-config.ts project.config.ts
git commit -m "feat: add ProjectConfig type and config file"
```

---

### Task 2: Wire up layout.tsx

**Files:**
- Modify: `src/app/layout.tsx:5-8`

- [ ] **Step 1: Replace hardcoded metadata**

In `src/app/layout.tsx`, replace:

```ts
export const metadata: Metadata = {
  title: 'VBS Intent Model Review',
  description: 'VBS Intent Model Consensus System — a review tool for business requirements',
}
```

With:

```ts
import { projectConfig } from '@/lib/project-config'

export const metadata: Metadata = {
  title: projectConfig.name,
  description: projectConfig.description,
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "refactor: wire layout metadata to project config"
```

---

### Task 3: Wire up nav-links.tsx

**Files:**
- Modify: `src/components/review/nav-links.tsx:43-48`

- [ ] **Step 1: Replace hardcoded brand label**

In `src/components/review/nav-links.tsx`, add import at top:

```ts
import { projectConfig } from '@/lib/project-config'
```

Replace lines 43-48:

```tsx
<div className="nav-logo flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold">
  V
</div>
<span className="nav-title text-sm font-semibold">
  VBS Intent
</span>
```

With:

```tsx
<div className="nav-logo flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold">
  {projectConfig.iconLetter}
</div>
<span className="nav-title text-sm font-semibold">
  {projectConfig.shortName}
</span>
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/review/nav-links.tsx
git commit -m "refactor: wire nav sidebar brand to project config"
```

---

### Task 4: Wire up abbr-text.tsx

**Files:**
- Modify: `src/components/review/abbr-text.tsx:5-23`

- [ ] **Step 1: Replace hardcoded glossary**

In `src/components/review/abbr-text.tsx`, add import at top (after existing imports):

```ts
import { projectConfig } from '@/lib/project-config'
```

Replace the hardcoded `GLOSSARY` constant (lines 5-23):

```ts
const GLOSSARY: Record<string, string> = {
  HBL: 'House Bill of Lading',
  // ... all 17 entries
}
```

With:

```ts
const GLOSSARY: Record<string, string> = projectConfig.abbreviations
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/review/abbr-text.tsx
git commit -m "refactor: wire abbreviation glossary to project config"
```

---

### Task 5: Wire up brd-generator.ts

**Files:**
- Modify: `src/lib/brd-generator.ts:91-93`

- [ ] **Step 1: Replace hardcoded BRD strings**

In `src/lib/brd-generator.ts`, add import at top:

```ts
import { projectConfig } from '@/lib/project-config'
```

Replace lines 91-93:

```ts
push(`The ${model.meta.project} is a web-based system for managing container pickup bookings at ACFS facilities.`)
blank()
push('It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots, manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.')
```

With:

```ts
push(projectConfig.brd.introText.replace('{project}', model.meta.project))
blank()
push(projectConfig.brd.scopeText)
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/brd-generator.ts
git commit -m "refactor: wire BRD generator to project config"
```

---

### Task 6: Wire up brd/page.tsx

**Files:**
- Modify: `src/app/review/brd/page.tsx:110-114`

- [ ] **Step 1: Replace hardcoded BRD page strings**

In `src/app/review/brd/page.tsx`, add import at top:

```ts
import { projectConfig } from '@/lib/project-config'
```

Replace lines 110-114:

```tsx
<p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
  The {model.meta.project} is a web-based system for managing container pickup bookings at ACFS facilities.
  It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots,
  manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.
</p>
```

With:

```tsx
<p className="text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
  {projectConfig.brd.introText.replace('{project}', model.meta.project)}{' '}
  {projectConfig.brd.scopeText}
</p>
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/review/brd/page.tsx
git commit -m "refactor: wire BRD page to project config"
```

---

### Task 7: Wire up ai-prompt.ts

**Files:**
- Modify: `src/lib/ai-prompt.ts:24,44,90`

- [ ] **Step 1: Replace hardcoded AI prompt examples**

In `src/lib/ai-prompt.ts`, add import at top:

```ts
import { projectConfig } from '@/lib/project-config'
```

Replace the `TYPE_DEFINITIONS` string — change line 24:

```ts
  id: string          // short lowercase, e.g. 'lsp', 'acfs', 'p4tc'
```

To:

```ts
  id: string          // ${projectConfig.ai.idExamples}
```

Change line 44:

```ts
  id: string           // kebab-case, e.g. 'carrier-books-pickup'
```

To:

```ts
  id: string           // ${projectConfig.ai.journeyIdExamples}
```

Since `TYPE_DEFINITIONS` is a regular string (backtick template literal), these interpolations will work directly.

Change line 90:

```ts
- Generate sequential IDs following existing patterns (e.g. if actors have lsp, p4tc, acfs — a new actor gets a short lowercase ID).
```

To:

```ts
- Generate sequential IDs following existing patterns (e.g. ${projectConfig.ai.idPatternHint}).
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-prompt.ts
git commit -m "refactor: wire AI prompt examples to project config"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full type check**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No new errors

- [ ] **Step 3: Verify dev server loads**

Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:4444/review`
Expected: `200`

- [ ] **Step 4: Spot-check the sidebar shows "VBS Intent" and "V" icon**

Visual check in browser — values should be identical to before since config holds the same values.
