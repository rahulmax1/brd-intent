# How the VBS Intent Model Platform Works

## What is this?

A collaborative review platform where the team (designer, PM, tech lead) align on the intent model — the single source of truth that defines what the VBS Pickup Portal does, who uses it, and how it works. Every downstream artifact (state machines, types, screens, code) is derived from this model.

## The Intent Model

The model contains:
- **Actors** — who uses the system and how they authenticate
- **Entities** — data objects (HBL, Booking, Delivery Order, Pickup Window) with fields and lifecycle states
- **Journeys** — step-by-step workflows (e.g., "Carrier Books a Pickup")
- **Business Rules** — non-negotiable constraints (e.g., "delegate or book, never both per HBL")
- **Constraints** — capacity, pricing, access, and temporal limits
- **Open Questions** — things still unresolved that block implementation

## Review Process

1. **Select your name** from the Reviewer dropdown
2. **Navigate to a section** — Actors, Entities, Journeys, Rules, Constraints, or Open Questions
3. **Read each item** and either Approve or Dispute it with a comment
4. **Track consensus progress** on the dashboard until all sections are approved

## Editing the Model

Use the **AI Chat panel** on the right to update the model with natural language:
- Describe what needs to change in plain English
- The AI proposes changes and shows a diff preview (GitHub-style inline format)
- Review the diff — approve or reject
- Approved changes create a new version with full history

The platform includes validation guards:
- **Deletion guard** — fields dropped by the AI without being mentioned in your prompt are automatically restored
- **Duplicate detection** — if the AI adds a replacement field but keeps the old one, the old one is cleaned up
- **Annotation preservation** — warn/edge flags are preserved unless you explicitly mention them

## Model Status

Status auto-updates based on open questions and warning flags:

| Status | Meaning |
|--------|---------|
| **Draft** | Open questions with no resolution, or warn flags exist |
| **In Review** | Some questions resolved, others still open |
| **Approved** | All questions resolved and no warn flags remain |

## Version History

Every edit creates a versioned snapshot. You can:
- View the diff between any version and its parent (click "Show diff" in History)
- Revert to any previous version
- Track who made what change and when

## When Disputes Arise

1. Disputed items are flagged for the model author to revise
2. The author updates the intent model via the AI Chat panel or directly in `model.ts`
3. Changed items automatically reset to "Revised" — reviewers re-review only what changed

## When Consensus Is Reached

1. All sections approved by all assigned reviewers → status moves to "Approved"
2. Run `pnpm intent:snapshot` to save the approved version
3. The approved intent model feeds directly into the next phases

## What the Approved Model Feeds Into

| Phase | Name | Description |
|---|---|---|
| Phase 3 | State Machines | Extract lifecycle transitions into formal state machines |
| Phase 4 | Domain Types | Generate TypeScript types, Zod schemas, and status utilities |
| Phase 5 | Info Architecture | Derive routes, screens, and navigation from actors and journeys |
| Phase 6–9 | Design → Code → Validate | Wireframes, design system, code generation, and final validation |

## Docs

The **Docs** section in the sidebar gives the team access to all project documents — BRD, interface guide, specs, plans, and meeting notes — rendered inline without leaving the platform.

## Workflow in Practice

```
1. pnpm intent:snapshot           # save the approved v0.1.0
2. Bump version in model.ts       # → v0.2.0
3. Open Claude Code in the same repo
4. "Extract state machines from the approved intent model"
   → AI reads model.ts entities + journeys
   → Generates state machine definitions
5. Continue through Phase 4, 5, etc. — each phase reads the same model
```

The intent model is the single source of truth. Every downstream artifact is derived from it, never the other way around.
