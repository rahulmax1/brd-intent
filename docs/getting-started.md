# Getting Started with Adapt Canvas

A complete setup guide for security teams, clients, and project managers using Adapt Canvas for penetration testing engagement planning.

---

## Overview

Adapt Canvas is a collaborative platform for structuring penetration testing engagements using the intent model framework. Define actors (who's involved), entities (what you're testing), journeys (how testing flows), and rules (what governs the engagement) — then reach consensus before testing begins.

---

## Prerequisites

- **Node.js** 18+ (check with `node -v`)
- **pnpm** 8+ (install with `npm install -g pnpm`)
- **Git** configured
- **Code editor** (VS Code recommended)
- **OpenAI API key** (for AI-powered model editing)

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url> adapt-canvas
cd adapt-canvas
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create `.env.local`:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

Optional (for production deployment):
```bash
KV_REST_API_URL=your-vercel-kv-url
KV_REST_API_TOKEN=your-vercel-kv-token
```

### 4. Start the dev server

```bash
pnpm dev
```

Opens at: http://localhost:4444

---

## Creating Your First Model

### Option 1: Using AI (Recommended)

The fastest way to build your model is using the AI chat panel.

1. **Open the AI chat panel** (bottom-right corner or press `/` key)

2. **Describe your engagement**:
   ```
   I'm planning a penetration test for a financial services company.
   Add a Red Team actor responsible for external network reconnaissance,
   vulnerability assessment, and exploitation.
   ```

3. **Review the proposed changes** in the diff view

4. **Approve or reject** the changes

5. **Continue building**:
   ```
   Add a Target entity with fields for IP address, hostname,
   operating system, open ports, and discovered vulnerabilities.
   ```

6. **Add journeys**:
   ```
   Create a reconnaissance journey that starts with passive information
   gathering, moves to active network scanning, and ends with
   service enumeration and vulnerability identification.
   ```

### Option 2: Manual Editing

Edit `src/domain/intent-model/model.ts` directly. The model structure:

```typescript
{
  meta: { version, project, lastUpdated, status },
  actors: [],        // Who's involved
  entities: [],      // What you're testing/tracking
  journeys: [],      // How testing flows
  businessRules: [], // Rules governing the engagement
  constraints: [],   // Boundaries and limitations
  openQuestions: []  // Unresolved decisions
}
```

See [Prompts Guide](prompts-guide.md) for example content.

---

## Understanding the Structure

### Actors
Who's involved in the engagement:
- Red Team (offensive security)
- Client (organization being tested)
- Blue Team (defensive monitoring)
- Project Manager (coordination)
- Target Organization (if different from client)

### Entities
What you're testing or tracking:
- Targets (systems under test)
- Vulnerabilities (discovered weaknesses)
- Findings (documented results)
- Exploits (attack techniques)
- Reports (deliverables)

### Journeys
How testing flows (step-by-step):
- Reconnaissance → Information Gathering → Target Identification
- Vulnerability Assessment → Scanning → Validation
- Exploitation → Initial Access → Privilege Escalation → Persistence
- Reporting → Documentation → Presentation → Remediation Guidance

### Business Rules
Rules governing the engagement:
- All exploitation requires explicit authorization
- Testing must occur within defined windows
- Critical findings require immediate notification
- No social engineering without prior approval

### Constraints
Boundaries and limitations:
- Testing hours: Mon-Fri 8am-6pm
- Excluded systems: production databases, payment systems
- Approval required for: destructive tests, DoS simulation
- Maximum concurrent connections: 10

---

## Basic Workflow

### 1. Scope Definition Phase

Use AI or manual editing to define:
- **Actors**: Who's participating
- **Targets**: What's in scope
- **Rules**: What's allowed/forbidden
- **Constraints**: Boundaries

### 2. Consensus Review Phase

1. Navigate to `/review`
2. Go through each section
3. Approve or dispute content
4. Resolve open questions
5. Get sign-off from all stakeholders

### 3. During Engagement

- Update model as new systems are discovered
- Track findings in real-time
- Document scope changes
- Version history tracks all changes

### 4. Post-Engagement

- Export to BRD format for documentation
- Archive final model version
- Reference for future engagements

---

## Key Features

### AI Chat Panel
- Bottom-right corner or press `/`
- Conversational model building
- See diffs before applying
- Full version history

### 3D Visualizations (`/explorer`)
- Force graph: network view of relationships
- Lifecycle view: flow visualization
- Actor layers: hierarchical responsibilities

### Consensus Review (`/review`)
- Section-by-section approval
- Track who approved what
- Dispute resolution
- Progress tracking

### Version History (`/review/versions`)
- Compare any two versions
- See exactly what changed
- Revert to previous versions
- Full audit trail

### BRD Generation (`/brd`)
- Auto-generated documentation
- Export to markdown
- Professional formatting
- Always in sync with model

---

## Common Tasks

### Add an actor
```
Add a Blue Team actor responsible for monitoring network traffic,
detecting intrusions, and coordinating defensive responses.
```

### Add an entity
```
Create a Vulnerability entity with CVSS score, description,
affected systems, exploitation status, and remediation priority.
```

### Add a journey
```
Add an exploitation journey: validate vulnerability exists,
develop proof of concept, gain initial access, escalate privileges,
establish persistence, document access path.
```

### Add a rule
```
Add a business rule that production systems require additional
approval before testing, with escalation to CTO for destructive tests.
```

### Update existing content
```
Update the Red Team actor to add post-exploitation and
lateral movement responsibilities.
```

---

## Scripts

### Generate Type Definitions
```bash
pnpm generate:ai-types
```
Run after modifying `src/domain/intent-model/types.ts`

### Generate Validation Schemas
```bash
pnpm generate:schemas
```
Run after modifying type definitions

### Snapshot Model
```bash
pnpm intent:snapshot
```
Create a timestamped snapshot of the current model

### Validate Model
```bash
pnpm validate:model
```
Check model for internal consistency

See [Scripts Reference](scripts-reference.md) for details.

---

## Troubleshooting

### Dev server won't start
- Check Node.js version: `node -v` (need 18+)
- Clear `.next`: `rm -rf .next && pnpm dev`
- Reinstall: `rm -rf node_modules && pnpm install`

### AI chat not working
- Check `OPENAI_API_KEY` in `.env.local`
- Verify API key is valid
- Check browser console for errors

### Changes not saving
- Check file permissions on `src/domain/intent-model/`
- In production: verify Vercel KV credentials

### TypeScript errors
- Run `pnpm generate:schemas` after type changes
- Run `pnpm generate:ai-types` after type changes
- Check `src/domain/intent-model/types.ts` for syntax errors

---

## Next Steps

- [Prompts Guide](prompts-guide.md) — Example prompts for building models
- [Workflows](workflows.md) — Detailed workflow guidance
- [Scripts Reference](scripts-reference.md) — All available scripts

---

## Support

For issues or questions:
- Check this documentation
- Review existing model in `src/domain/intent-model/model.ts`
- Check GitHub issues in your repository
