# Review Step Between Draft and Consensus

## Summary

Add a **Review** phase between Draft and Consensus in the project stepper. This step surfaces existing model visualization and diff components so users can thoroughly explore and understand the generated intent model before entering the formal consensus voting phase.

## Motivation

Currently users go from Draft (generate the model) straight to Consensus (approve/dispute items). There's no dedicated space to explore the model visually — see entity relationships in 2D/3D graphs, walk through the intent diagram, or review version diffs. These views already exist in the codebase but aren't part of the project flow.

## Design

### New Phase: REVIEW

Inserted between DRAFT and CONSENSUS in the project stepper.

**Route:** `/projects/[projectId]/review`

**Stepper order:** Upload → Draft → **Review** → Consensus → Export

### Tab Layout

Full-height tabbed view reusing the `ExplorerTabs` pattern with these tabs:

| Tab | Component | Source | Purpose |
|-----|-----------|--------|---------|
| Graph | `ExplorerCanvas` | `src/components/explorer/explorer-canvas.tsx` | 2D entity relationship graph (ReactFlow) |
| Intent | `IntentDiagram` | `src/components/explorer/intent-diagram.tsx` | Structured flow diagram |
| 3D | `Graph3D` | `src/components/explorer/graph-3d.tsx` | Force-directed 3D visualization |
| Diff | `SideBySideDiff` | `src/components/review/side-by-side-diff.tsx` | Version-over-version changes |
| Model | `ModelReader` | `src/components/explorer/model-reader.tsx` | Tree-style model browser |
| Source | `ModelSource` | `src/components/explorer/model-source.tsx` | Raw model source |

### No Annotation

This is a pure exploration step. No comments, flags, or annotations. Those belong in Consensus.

### Navigation Flow

- **Draft page:** "Move to Review & Consensus" button becomes "Move to Review", transitions phase to REVIEW
- **Review page:** "Move to Consensus" button transitions phase to CONSENSUS
- **Stepper:** All five phases rendered, clickable based on current progress

## Files to Change

1. **`src/components/project-stepper.tsx`** — Add REVIEW step to `steps` array and `phaseOrder`
2. **`src/app/projects/[projectId]/draft/page.tsx`** — Change transition target from CONSENSUS to REVIEW
3. **`src/app/projects/[projectId]/review/page.tsx`** — New page (client component)
4. **`src/app/projects/[projectId]/page.tsx`** — Handle REVIEW phase in redirect logic

### Review Page Structure

```
- Page header (project name, back link)
- ProjectStepper (phase=REVIEW, step=review)
- Full-height tab container
  - Tab bar: Graph | Intent | 3D | Diff | Model | Source
  - Tab content (fills remaining viewport height)
- Footer action bar: "Move to Consensus" button
```

### Data Requirements

The review page needs:
- Project metadata (name, description, phase)
- Latest `IntentModel` from `intentModelVersions[0].modelData`
- Saved explorer positions (for graph layout persistence)
- Model source string (for Source tab)
- Model versions list (for Diff tab to compare versions)

These are all fetched from existing API endpoints:
- `GET /api/projects/[id]` — project + model
- `GET /api/model/versions` — version list for diffs
- `GET /api/model/versions/diff` — computed diff between versions
