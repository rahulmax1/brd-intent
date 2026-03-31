# How I Built This

> Rahul's build log — a personal account of building the VBS Intent Model Review platform from scratch, the decisions that shaped it, and what I learned along the way.
>
> **March 2026**

---

## The problem

ACFS needed a pickup booking portal for their warehouse. A BRD existed — 40-page PDF, dense, full of jargon. The client team, the PM, design, and dev all needed to get on the same page about what exactly the system should do before anyone wrote a line of production code.

The usual approach: Jira tickets, shared docs, video calls, Miro boards. Things get lost, decisions get forgotten, nobody's sure what the current truth is.

I wanted something different: **a single structured model** that everyone reviews together, in the same tool, with AI helping iterate on it in real time.

---

## Week 1 — The intent model

### The core idea

Instead of writing specs, I wrote a **structured data model** — a TypeScript object that captures everything the system needs to do:

- **Actors** — who uses the system (LSP, P4TC, ACFS, etc.)
- **Entities** — the data objects (HBL, Booking, Pickup Slot, Delivery Order)
- **Journeys** — step-by-step user flows ("LSP Books a Pickup")
- **Business Rules** — hard constraints the system must enforce
- **Constraints** — platform-level limitations
- **Open Questions** — things nobody's answered yet

Everything is typed. Everything has an ID. Everything cross-references. The model *is* the spec.

### v0.1.0 — Seeding from the BRD

I read the BRD cover to cover and extracted:
- 4 actors, 2 entities, 1 journey, 3 rules, 2 constraints, 20 open questions

That last number is the important one. 20 things the BRD didn't answer. That's the value of structured modeling — it forces you to find the gaps.

### v0.2.0 — PM session blowout

Sat down with Roni and went through all 20 open questions. The model exploded:
- HBL got completely reworked (milestone vs. status as two separate dimensions)
- New actors appeared (One-off Customer, Gatehouse)
- 7 new business rules, 3 reworked constraints
- 5 new open questions surfaced

This was the moment I knew the approach worked. A 90-minute conversation produced more clarity than weeks of back-and-forth on documents.

### v0.3.0 — The Miro board

Someone shared a Miro process flow diagram. I reconciled it against the model — found contradictions, new flows, renamed actors. WFF + FF + Carrier collapsed into "LSP" (Logistics Service Provider). This version also added the full delegation chain and P4TC magic-link flow.

### v0.7.0 → v0.7.1 — Consolidation

By this point the model had grown organically. 30 business rules, some overlapping. 8 constraints, some redundant. I did a consolidation pass:
- 30 rules → 21 (absorbed redundancies)
- 8 constraints → 5
- Tagged 5 integration entities separately from domain entities
- Final count: 5 actors, 12 entities, 14 journeys, 21 rules, 5 constraints, 1 open question

---

## Week 1 — The review platform

### Scaffolding (Day 1)

Started with `create-next-app`, added ShadCN, TailwindCSS, DM Sans font. Nothing fancy.

The first page was a dashboard showing the 6 model sections as cards — actors, entities, journeys, rules, constraints, open questions. Each card links to a section detail page.

### Consensus review

The core mechanic: each reviewer picks their name, then goes through every item in the model and either **approves** or **disputes** (with a comment). A dashboard tracks consensus across all reviewers.

This is intentionally simple. Not a voting system, not a comment thread — just thumbs up or thumbs down with a note. The goal is to surface disagreements, not manage them.

State lives in Vercel KV (production) or local JSON (dev).

### The design language

I wanted it to feel like Linear — clean, fast, purposeful. Not like Jira.

- Warm off-white backgrounds (#F8F8F7)
- ACFS navy (#002C61) for brand anchoring
- Blue (#0081F2) for interactive elements
- DM Sans Variable — geometric, modern, readable
- Generous whitespace, soft shadows, 200ms transitions
- Abbreviation tooltips — hover any domain term (HBL, DO, WFF) and get a plain-English expansion

---

## Week 2 — AI-powered editing

### The chat panel

The right side of the screen is an AI chat panel. You describe what you want to change in plain English:

> "Add a new journey for ACFS assigning HBLs to LSPs"

The AI reads the current model, generates a plan, shows you what it wants to do, then produces a GitHub-style diff. You approve or reject. Approved changes create a new model version.

### The hard parts

**Scoped editing** — when you say "update the booking entity", the AI should only touch the booking entity, not rewrite the entire model. I send only the relevant section to the LLM, with a compact ID index for cross-references.

**Deletion guard** — LLMs love to "clean up" by dropping fields they don't understand. I built a post-processing pipeline that detects fields dropped without being mentioned in the user's prompt and restores them automatically.

**Annotation preservation** — the model has `warn` and `edge` flags on items that need attention. The AI kept removing them. Now they're explicitly preserved unless the user mentions them.

**Validation** — every AI response runs through Zod schemas before it touches the model. Invalid changes are rejected with a clear error.

### Two-step flow

Originally the AI just generated changes. Too risky. Now it's two steps:
1. AI proposes a **plan** (what it will change and why)
2. User confirms → AI generates the **diff**
3. User approves the diff → changes applied

This builds trust. Nobody likes an AI that silently changes things.

---

## Week 2 — Visualizations

### The 2D explorer

A React Flow graph showing all entities, actors, and their relationships. Draggable nodes, color-coded by type. Useful for getting a spatial feel for the model.

### The 3D views

I built three Three.js visualizations:

**Force graph** — every model item as a translucent sphere with a Lucide icon inside, connected by force-directed edges. Click a node to cascade particles through its connections. Purely for the "wow" factor in client presentations.

**Lifecycle view** — the HBL milestone pipeline as a 3D spine. Each milestone gets a low-poly 3D icon (ship, anchor, warehouse, package, truck). Related entities orbit around each milestone.

**Actor layers** — horizontal platforms per actor, with their responsibilities and connected entities floating above. Shows who owns what at a glance.

These were fun to build but also legitimately useful — the client team immediately understood the model structure when they saw the 3D views, after struggling with the flat text version.

### The IA map

An implementation architecture map linking every actor responsibility to a screen. Uses dagre for auto-layout with manual position overrides saved to KV. Each node shows build status (not-started, in-progress, done). This is how we track what's been implemented.

### The data model ERD

The latest addition — a React Flow graph showing entities as database-style table nodes with their fields, types, and relationships. Integration entities get a distinct style. Auto-layout with ELK.

---

## Week 2 — Supporting tools

### BRD generation

The model auto-generates a formatted BRD document. Every time the model changes, the BRD updates. Inline decision annotations show which PM session or meeting note led to each rule. This replaced the static PDF.

### Docs hub

A docs page where you can browse project documents (the original BRD PDF, team guide, changelog, specs, plans) and upload new ones. Markdown files render inline with the same abbreviation tooltips. PDFs render in an iframe.

### Auto-export to portal

When the model changes, an `intent-contract.ts` file auto-exports to the actual portal codebase (`vbs-portal`). This keeps the production code's type definitions in sync with the model without manual copy-paste.

---

## What I'd do differently

**Start with the 3D views earlier.** They're not just eye candy — they genuinely accelerate comprehension for non-technical stakeholders. I built them late as a nice-to-have, but they turned out to be one of the most valuable features.

**Less iteration on the consensus UI.** I spent too long on approve/dispute mechanics that nobody used heavily. The real value was the AI editing and the visualizations. The review UI could have been simpler.

**Version the model as Git commits from day one.** I built a custom versioning system with diffs and snapshots. It works, but Git already does this. Next project, I'd use the filesystem as the source of truth and lean on Git history.

---

## The stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| UI | React, TailwindCSS, ShadCN |
| 3D | Three.js, @react-three/fiber |
| Graphs | React Flow, dagre, ELK |
| AI | OpenAI API (GPT-4) |
| Validation | Zod |
| State | Zustand (client), Vercel KV (server) |
| Font | DM Sans Variable |
| Package manager | pnpm |
| Deployment | Vercel |

---

## The numbers

- **262 commits** over ~2 weeks
- **v0.1.0 → v0.7.1** of the intent model (4 actors → 5, 2 entities → 12, 20 open questions → 1)
- **6 visualization modes** (2D explorer, force graph, lifecycle, actor layers, IA map, data model ERD)
- **21 business rules** consolidated from 30
- **14 user journeys** documented end-to-end
- All built with Claude Code as the primary development partner

---

*Last updated: March 24, 2026*
