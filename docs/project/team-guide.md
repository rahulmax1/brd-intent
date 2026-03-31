# VBS Intent Model — Team Guide

How to use the intent model and this platform in your day-to-day work, whether you're a designer, PM, or engineer.

---

## What is the intent model?

The intent model is the **single source of truth** for what the VBS Pickup Portal does. It's a structured document with six pillars:

| Pillar | Count | What it captures | Example |
|--------|-------|-----------------|---------|
| **Actors** | 5 | Who uses the system, how they authenticate, what they can do | LSP logs in with username/password, can delegate or book |
| **Entities** | 10 + 5 integrations | Data objects with fields and lifecycle states | HBL has milestone (on_vessel → collected) and hbl_status (unassigned → booked) |
| **Journeys** | 14 | Step-by-step workflows from a specific actor's perspective | "LSP Books a Pickup" — 8 steps from selection to confirmation |
| **Business Rules** | 21 | Hard constraints the system must enforce | BR-004: LSP can either delegate or book per HBL, never both |
| **Constraints** | 5 | Platform-level limits (access, admin, platform, notification) | C-007: Desktop/laptop only, no mobile responsive design |
| **Open Questions** | 1 | Unresolved decisions that block implementation | OQ-034: HBL hierarchy data source TBD |

Everything downstream — state machines, TypeScript types, database schemas, screens, components — is derived from this model. If it's not in the model, it doesn't exist.

> **Note on recent changes (v0.8.0):** Three new entities added (Payment, User, Booking-HBL Link) to support payment tracking and per-HBL fee breakdown. P4TC actor/journey, Driver Record entity, and Gatehouse actor marked as deferred (fast follow). See the Changelog for full details including v0.7.1 rule consolidation (30 → 21 rules, 8 → 5 constraints).

---

## Getting started

### 1. Open the platform

```
http://localhost:4444
```

Dev server runs on port 4444. Ask the project lead to start it if it's not running (`pnpm dev` in the vbs-intent repo).

### 2. Set your identity

On first visit, a modal asks you to select your name. This links your reviews to your profile. Your selection persists across sessions (stored in your browser).

### 3. Orient yourself

| Page | What it shows | When to use it |
|------|--------------|----------------|
| **Dashboard** (`/review`) | Overall consensus progress, section cards, reviewer table | Start here. See what needs attention. |
| **Section pages** (`/review/actors`, etc.) | Expandable cards for each item with full details and review controls | Deep-dive into specific items, approve or dispute. |
| **Diff** (`/review/diff`) | Version history with side-by-side changes | Understand what changed between versions. |
| **Docs** (`/review/docs`) | Project documents — BRD, specs, plans, meeting notes | Reference source material without leaving the platform. |

### 4. The AI chat panel

The right sidebar is an AI assistant that can edit the model. It's available on all pages except Diff and Docs.

---

## For UI/UX Designers

### What the model gives you

The intent model is your **requirements contract**. Before you open Figma, the model should tell you:

- **Who are you designing for?** → Read **Actors**. Each actor has auth method, responsibilities, and constraints. An LSP with saved drivers needs a different booking flow than a P4TC entering details fresh.
- **What are the user journeys?** → Read **Journeys**. Each journey has ordered steps with detail text. These are your flow diagrams in structured form.
- **What are the hard constraints?** → Read **Business Rules** and **Constraints**. These are non-negotiable. BR-001 says booking requires "unpacked" milestone — your UI must disable the book button before that point.
- **What's still unresolved?** → Read **Open Questions**. Don't design around an open question — flag it and wait for resolution.

### Your review workflow

#### Reviewing the model (weekly or when notified)

1. Go to the **Dashboard**. Check your review progress in the reviewer table.
2. Click into sections relevant to your focus (likely Actors, Journeys, Constraints).
3. **Expand each item** and read the details carefully.
4. For each item, choose one:
   - **Approve** — you're confident this is correct and complete enough to design from
   - **Dispute** — something is unclear, missing, or contradicts your understanding. Add a comment explaining why.
5. If a section shows **"Revised"** status (yellow badge), the model changed since your last review. Re-read and re-approve.

#### Proposing changes via AI chat

You don't need to edit code. Use the chat panel:

```
"Add a precondition to the LSP booking journey:
LSP must have at least one saved driver OR enter new driver details"
```

```
"The P4TC journey is missing a step — after OTP verification,
they should see a welcome message explaining what they can do"
```

```
"Update the driver actor description — clarify that the booking
party forwards the reference via WhatsApp or SMS, not email"
```

The AI will:
1. Show you a plain-English plan of what it will change
2. Ask for confirmation
3. Show a diff preview (green = added, red = removed, blue = modified)
4. Wait for your approval before saving

#### Proposing changes manually (via the project lead)

If you'd rather not use the AI panel, write up your proposed changes and share them with the project lead (Rahul). They'll update the model, and you'll see the changes in the Diff page.

#### Using the model for design

| Design artifact | Intent model source |
|----------------|-------------------|
| User flow diagram | Journey steps + preconditions |
| Screen inventory | Actors (one dashboard per actor type) + Journey steps (one screen per step) |
| Component requirements | Entity key_fields (what data to show) + Business Rules (what to enable/disable) |
| Edge cases & empty states | `warn` and `edge` annotations on responsibilities and journey steps |
| Error states | Business Rules that gate actions (e.g. "booking requires unpacked") |
| Copy/microcopy | Open Questions with resolutions (e.g. "no email to driver") |

#### Checking the Diff page

After the model is updated (e.g. after a PM session), go to **Diff** to see exactly what changed. This tells you which screens or flows need design updates.

---

## For Product Managers

### What the model gives you

The intent model is your **living spec**. It replaces scattered Confluence pages and stale PRDs with a structured, versioned, reviewable document.

- **Actors** = your user personas with precise capabilities
- **Journeys** = your user stories in structured form
- **Business Rules** = your acceptance criteria
- **Open Questions** = your decision log
- **Constraints** = your scope boundaries

### Your review workflow

#### Running a review session

1. Open the **Dashboard**. The progress bar shows overall consensus.
2. Check which sections have disputes or pending reviews.
3. Walk through disputed items with the team. Read the dispute comments — they explain what's unclear.
4. Use the AI chat to make updates in real-time during the session:

```
"Update BR-001 to clarify that customs clearance includes quarantine"
```

```
"Resolve OQ-023 — the minimum charge is $45 per booking,
rate is $0.50 per chargeable kg. Confirmed by Matt on 2026-03-18."
```

```
"Add a new open question: What happens when a P4TC's
magic link expires mid-booking?"
```

5. After updates, ask reviewers to re-review revised items.

#### Managing open questions

Open questions are your **decision backlog**. Each one blocks some part of implementation.

On the **Open Questions** section page:
- **Resolve**: Click "Resolve", then document the decision clearly:
  - **Decision**: What was decided
  - **Impact**: What model changes this triggers
  - **Source**: Who decided, when, in what meeting
- **Defer**: Click "Defer" if the question can't be answered yet. Document why and when to revisit.

#### Tracking versions

Every model change is versioned. The **Diff** page shows:
- Who made the change
- When
- What they asked the AI to do (the prompt)
- Exactly what changed (field-level diffs)

This is your audit trail. If someone asks "why did we change the fee calculation?", the version history has the answer.

#### Using the model for stakeholder communication

Export key sections for stakeholder review:
- **Actors table** → "Here's who uses the system and what they can do"
- **Open Questions** → "Here are the decisions we need from you"
- **Business Rules** → "Here are the constraints we're building to"

The Docs page lets you upload meeting notes, decision records, and updated BRDs so everything lives in one place.

#### Preparing for the next session

Before a PM/client session:
1. Review all **Open Questions** with status "open"
2. Check **Business Rules** with `warn` annotations — these need confirmation
3. Note any items with "Revised" status that haven't been re-reviewed

After the session:
1. Update the model via AI chat with decisions made
2. Resolve open questions that were answered
3. Add new open questions that surfaced
4. Bump the version and snapshot: `pnpm intent:snapshot`

---

## For Front-end Engineers

### What the model gives you

The intent model is your **implementation spec**. It maps directly to code:

| Intent model | Code artifact |
|-------------|--------------|
| Actor.id | Route group, auth guard, role enum |
| Actor.auth | Auth strategy (password flow, magic link + OTP flow, SSO) |
| Actor.responsibilities | API endpoints, page features, permission checks |
| Entity.key_fields | TypeScript interface fields, Zod schema, DB columns |
| Entity.lifecycle.states | Status enum, state machine states |
| Entity.lifecycle.transitions | State machine transitions, guard functions |
| Journey.steps | Page flow, stepper/wizard UI, API call sequence |
| Journey.preconditions | Route guards, middleware checks |
| BusinessRule | Validation functions, conditional UI logic |
| Constraint | System config, feature flags |
| OpenQuestion (resolved) | Confirmed behaviour to implement |
| OpenQuestion (open) | Do NOT implement yet — placeholder or configurable |

### Reading the model programmatically

The model is a typed TypeScript constant:

```typescript
import { intentModel } from '@/domain/intent-model/model'

// Access any pillar
intentModel.actors        // Actor[]
intentModel.entities      // Entity[]
intentModel.journeys      // Journey[]
intentModel.business_rules // BusinessRule[]
intentModel.constraints   // Constraint[]
intentModel.open_questions // OpenQuestion[]
```

Types are in `@/domain/intent-model/types.ts`. Use them in your own code:

```typescript
import type { Actor, Entity, Journey, BusinessRule } from '@/domain/intent-model/types'
```

### Your review workflow

#### Reviewing for implementability

Focus on:
- **Entities**: Are the field types precise enough? Is `type: 'string'` too vague — should it be an enum?
- **Lifecycles**: Are all transitions accounted for? Are guards implementable?
- **Business Rules**: Can you write a test for each one? If not, it's too vague — dispute it.
- **Journeys**: Do the steps map to a clear API call sequence? Are there missing error/edge cases?

Dispute with technical specifics:

```
"BR-005 says cutoffs are relative day+time but doesn't specify
timezone handling. What timezone are cutoffs evaluated in?"
```

```
"The booking lifecycle is missing a 'cancelled' state.
What happens when ACFS cancels a booking?"
```

#### Using the AI chat for engineering concerns

```
"Add a warn to the customs_clearance_status field —
ICS update frequency is unknown, data may be stale at booking time"
```

```
"Add an edge case to journey step 2 of lsp-books-pickup:
what happens if customs clearance changes between validation and payment?"
```

```
"Add a new constraint: booking fee calculation must be idempotent —
same inputs always produce same fee regardless of when calculated"
```

#### Deriving code from the model

**State machines** — extract from entity lifecycles:

```typescript
// From intentModel.entities[0].lifecycle (HBL)
const hblMilestoneTransitions = {
  on_vessel: ['at_wharf'],
  at_wharf: ['in_yard'],
  in_yard: ['unpacked'],
  unpacked: ['collected'],
  collected: [],
}
```

**Validation functions** — derive from business rules:

```typescript
// From BR-001
function canBook(hbls: HBL[]): boolean {
  return hbls.every(h =>
    h.milestone === 'unpacked' || h.milestone === 'collected'
  )
}

// From BR-004
function canDelegate(hbl: HBL): boolean {
  return hbl.hbl_status !== 'booked'
}

// From BR-002 — DO waiver (computed field)
function isDoWaived(hbl: HBL): boolean {
  return hbl.release_type === 'free_release' || hbl.under_bond
}
```

**API route structure** — derive from journeys:

```
POST /api/booking/validate    ← Journey step 2 (validate readiness)
POST /api/booking/calculate   ← Journey step 3 (load calculation)
GET  /api/slots/available     ← Journey step 4 (select slot)
POST /api/booking/create      ← Journey steps 5-8 (details → pay → confirm)
```

**Zod schemas** — derive from entity key_fields:

```typescript
// From intentModel.entities[0].key_fields (HBL)
const HBLSchema = z.object({
  hbl_number: z.string(),
  milestone: z.enum(['on_vessel', 'at_wharf', 'in_yard', 'unpacked', 'collected']),
  hbl_status: z.enum(['unassigned', 'assigned', 'delegated', 'booked']),
  customs_clearance_status: z.string(),
  release_type: z.enum(['do_required', 'free_release']),
  under_bond: z.boolean(),
  do_waived: z.boolean(), // derived: release_type === 'free_release' || under_bond
  // ...
})
```

### Editing the model directly (advanced)

If you prefer to skip the AI chat, you can edit `src/domain/intent-model/model.ts` directly. It's a plain TypeScript file. The type system will catch structural errors.

After editing:
1. Run `pnpm lint` to check for issues
2. The review system will detect the change (content hash mismatch) and mark affected items as "Revised"
3. Reviewers will see the changes and can approve/dispute

### Version snapshots

Before a version bump:
```bash
pnpm intent:snapshot  # saves current model to history/
```

Snapshots are JSON files in `src/domain/intent-model/history/`. They're used for diffing and rollback.

---

## Cross-role workflows

### After a client meeting (PM + Designer + Engineer)

```
PM:       Update model via AI chat with decisions from the meeting
          Resolve open questions, add new ones
          Bump version → pnpm intent:snapshot

Designer: Check Diff page → see what changed
          Re-review affected journeys and actors
          Update Figma flows if journey steps changed

Engineer: Check Diff page → see what changed
          Re-review affected entities and business rules
          Update state machines / validation logic if needed
```

### Disputing a requirement (any role)

```
1. Find the item in the section page
2. Click "Dispute"
3. Write a clear comment: what's wrong, what you think it should be
4. The item shows as "Disputed" (red) on the dashboard
5. PM reviews dispute in next session
6. PM updates model → item resets to "Revised"
7. Original disputer re-reviews
```

### Adding a brand-new feature (PM leads, all roles review)

```
PM:       "Add a new journey for ACFS cancelling a booking.
           Include steps for refund trigger and notification."
          → AI adds the journey with steps

Designer: Reviews journey steps → disputes if flow doesn't make sense
          → "Step 3 should split into two — notification to LSP
             and separate notification to driver"

Engineer: Reviews journey steps → disputes if technically unclear
          → "What booking states can be cancelled from?
             Need explicit lifecycle transitions."

PM:       Resolves disputes, updates model
All:      Re-review → approve → consensus reached
```

### Resolving an open question (PM leads)

```
PM:       Opens OQ section → clicks "Resolve" on OQ-023
          Writes: "Decision: Minimum charge is $45 per booking.
          Rate is $0.50/kg chargeable weight.
          Source: Matt confirmed 2026-03-18."

          Then updates the model:
          "Update BR-019 with the confirmed minimum charge of $45
           and rate of $0.50/kg. Remove the warn annotation."

Engineer: Sees OQ-023 resolved, BR-019 updated
          → implements fee calculation with confirmed values

Designer: Sees fee confirmed → updates booking summary screen
          with exact fee breakdown layout
```

---

## Tips

- **Don't design or build around open questions.** If OQ-023 is open, don't hardcode a fee — make it configurable or wait.
- **Check `warn` annotations.** Items with warnings have known uncertainty. Factor that into your estimates and designs.
- **Use the Diff page after any model update.** It's faster than re-reading the whole model — just see what changed.
- **Dispute early.** It's cheaper to fix a requirement in the model than to rework code or designs.
- **Resolve disputes with specifics.** "This is wrong" is not actionable. "This should be X because Y" is.
- **The AI chat is safe to use.** It always shows a diff preview before applying changes. You can reject any change.
- **The model is versioned.** If something breaks, revert to a previous version from the chat panel's version history.
- **Upload reference docs.** Meeting recordings, updated BRDs, client emails — drag them into the Docs page so everything lives in one place.
