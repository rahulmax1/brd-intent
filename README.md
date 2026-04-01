# Adapt Canvas

A collaborative platform for structuring penetration testing engagements. Adapt Canvas provides a structured intent model (actors, entities, journeys, business rules, constraints, and open questions) that security teams and clients use to reach consensus before testing begins.

Built with Next.js, React, TypeScript, TailwindCSS, and ShadCN.

## What is Adapt Canvas?

Adapt Canvas helps mixed teams (security practitioners, clients, project managers) collaborate on pentest scope and requirements using a structured intent model framework. Define who's involved (actors), what you're testing (entities), how testing flows (journeys), and what rules govern the engagement — then reach consensus before testing begins.

## Features

- **Consensus review** — section-by-section review with approve/dispute tracking across reviewers
- **AI-powered editing** — describe changes in plain language, see diffs, approve/reject
- **Version history** — full diff tracking between any two model versions
- **BRD generation** — auto-generated documentation from the live model
- **3D explorer** — interactive visualizations:
  - **Force graph** — network-style visualization of relationships
  - **Lifecycle view** — flow visualization showing progression
  - **Actor layers** — hierarchical view of actor responsibilities
- **IA map** — implementation architecture linking responsibilities to deliverables
- **Docs hub** — upload and reference project documents alongside the model

## Getting started

### Quick start

```bash
pnpm install
pnpm dev        # starts on http://localhost:4444
```

### For new users

See the **[Getting Started Guide](docs/getting-started.md)** for:
- Complete setup instructions
- Creating your first pentest model
- Using AI to build your model quickly
- Workflow guidance
- Troubleshooting

**Quick links:**
- [AI Journey Playbook](docs/ai-journey-playbook.md) — see how the AI-assisted workflow actually works
- [Prompts Guide](docs/prompts-guide.md) — example prompts for building pentest models
- [Workflows](docs/workflows.md) — how to use Adapt for pentest engagements
- [Scripts Reference](docs/scripts-reference.md) — available scripts and when to use them

## Project structure

```
src/
  domain/intent-model/
    model.ts          # the intent model (source of truth)
    types.ts          # TypeScript types for all model sections
    history/          # archived model snapshots
  components/
    explorer/         # 3D graph visualizations
    review/           # consensus review UI
    ai/               # AI chat panel, diff preview, version history
    ia/               # implementation architecture map
  lib/
    model-store.ts    # versioning, KV/local persistence
    model-diff.ts     # diff computation between model versions
    model-schemas.ts  # zod validation schemas
    ai-prompt.ts      # AI system prompt for model editing
    brd-generator.ts  # BRD generation logic
    docs-config.ts    # docs page configuration
  app/
    review/           # review pages
    api/              # API routes
docs/
  getting-started.md         # Setup and onboarding
  ai-journey-playbook.md     # Step-by-step AI workflow demonstration
  prompts-guide.md           # AI prompt examples
  workflows.md               # Pentest workflows
  scripts-reference.md       # Scripts documentation
```

## Using for your pentest engagement

This tool is designed to be used for any penetration testing engagement. Three steps:

### 1. Build your model

Use the AI chat panel to quickly build your model:
- "Add a Red Team actor responsible for reconnaissance and exploitation"
- "Create a Target entity with IP, hostname, services, and vulnerabilities"
- "Add a reconnaissance journey for network scanning"

Or edit `src/domain/intent-model/model.ts` directly.

### 2. Review and reach consensus

Use the consensus review feature to get team alignment on scope, rules, and deliverables before testing begins.

### 3. Export documentation

Generate a BRD automatically or export your model for reporting.

## Environment variables

- `OPENAI_API_KEY` — required for AI-powered model editing
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — optional, for Vercel KV storage in production (falls back to local JSON files in dev)

## Deployment

See the **[Deployment Guide](docs/deployment.md)** for complete instructions on deploying to Vercel, including:
- GitHub repository setup
- Vercel KV database configuration
- Environment variables setup
- Production verification

Quick deploy:
```bash
vercel --scope db-iz
```

## License

ISC
