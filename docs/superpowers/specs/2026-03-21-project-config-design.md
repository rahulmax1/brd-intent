# Project Config — Make Intent Model Reusable

**Date:** 2026-03-21
**Status:** Draft

## Problem

Project-specific strings (names, abbreviations, BRD domain text, AI prompt context) are hardcoded across 6 files, making it difficult to reuse this repo for a different software project's intent model.

## Solution

A single `project.config.ts` at the repo root that holds all project-specific values. The 6 consumer files read from this config instead of hardcoding strings.

## Design

### Config file: `project.config.ts`

```ts
import { type ProjectConfig } from '@/lib/project-config-schema'

export const projectConfig: ProjectConfig = {
  // App chrome
  name: 'VBS Intent Model Review',
  shortName: 'VBS Intent',
  iconLetter: 'V',
  description: 'VBS Intent Model Consensus System — a review tool for business requirements',

  // Abbreviation glossary (shown as tooltips in review UI)
  // Full glossary — example shows two entries, port all from abbr-text.tsx
  abbreviations: {
    ACFS: 'Australian Container Freight Services',
    VBS: 'Vehicle Booking System',
    // ... all 17 entries from current abbr-text.tsx
  },

  // BRD generation context
  brd: {
    introText: 'The {project} is a web-based system for managing container pickup bookings at ACFS facilities.',
    scopeText: 'It enables logistics service providers to view shipments, delegate pickup authority, book pickup slots, manage documentation, and make payments — with ACFS staff overseeing operations, slot configuration, and verification.',
  },

  // AI editing assistant context
  ai: {
    idExamples: "short lowercase, e.g. 'lsp', 'acfs', 'p4tc'",
    journeyIdExamples: "kebab-case, e.g. 'carrier-books-pickup'",
    idPatternHint: 'if actors have lsp, p4tc, acfs — a new actor gets a short lowercase ID',
  },
}
```

### Type definition: `src/lib/project-config-schema.ts`

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

### Consumer changes

| File | Currently | After |
|------|-----------|-------|
| `src/app/layout.tsx` | Hardcoded `title: 'VBS Intent Model Review'` | `title: projectConfig.name` |
| `src/components/review/nav-links.tsx` | Hardcoded `V` and `VBS Intent` | `projectConfig.iconLetter` and `projectConfig.shortName` |
| `src/components/review/abbr-text.tsx` | Hardcoded abbreviation map | `projectConfig.abbreviations` |
| `src/lib/brd-generator.ts` | Hardcoded ACFS/domain strings | `projectConfig.brd.introText` / `scopeText` with `{project}` interpolation from `model.meta.project` |
| `src/lib/ai-prompt.ts` | Hardcoded example IDs in comments | `projectConfig.ai.*` values |
| `src/app/review/brd/page.tsx` | Hardcoded ACFS/domain strings (same as brd-generator) | `projectConfig.brd.introText` / `scopeText` |

**Note:** `ai-prompt.ts` TYPE_DEFINITIONS are excluded from config — they describe the generic 6-section model schema, not project-specific content. `{project}` interpolation is a simple `.replace()` — if the placeholder is absent, the text is used as-is.

### Out of scope

- `src/lib/docs-config.ts` — project-specific doc paths, swapped manually
- `src/app/globals.css` — CSS comment and `--acfs-navy` variable name, cosmetic only
- `src/domain/intent-model/model.ts` — model data, swapped manually
- Section types — remain fixed (actors, entities, journeys, business_rules, constraints, open_questions)
- Auto-generating AI prompt type definitions from TypeScript types
- Runtime Zod validation of config — not needed since config is a static import checked at compile time

### How to use for a new project

1. Replace `src/domain/intent-model/model.ts` with new model data (must conform to `IntentModel` type — see `src/domain/intent-model/types.ts`)
2. Edit `project.config.ts` with new project name, abbreviations, BRD text, AI context
3. Clear `src/domain/intent-model/history/` and reset `src/domain/intent-model/review-state.json` to avoid stale data from the previous project
4. Optionally update `docs-config.ts` if you have project reference docs
5. Deploy

## Risks

- **Low:** Config import adds a module boundary but no runtime cost (static import)
- **Low:** BRD `{project}` interpolation is simple string replace, no template engine needed
