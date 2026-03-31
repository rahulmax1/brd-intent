# Intent Model → Portal Workflow

**Last updated:** 2026-03-24
**Context:** How `vbs-intent` and `vbs-portal` stay synchronized as the source of truth and implementation evolve.

---

## Repository Architecture

```
vbs-intent/                           # Source of truth for requirements
├── src/domain/intent-model/
│   ├── model.ts                     # The intent model (entities, rules, journeys)
│   └── history/                     # Archived model snapshots
├── scripts/export-contract.ts       # Export script
└── docs/

                ↓ pnpm run export:contract

vbs-portal/                           # Implementation
├── src/lib/intent-contract.ts       # Auto-generated contract
├── docs/intent-contract-rules-checklist.md  # Business rules checklist
└── src/app/                         # Portal screens
```

**Key principle:** The intent model in `vbs-intent` is the **source of truth** for business requirements. The portal in `vbs-portal` is built from those requirements. Changes flow one direction: intent model → portal.

---

## The Contract Export Process

### What Gets Exported

The contract export generates two files in `vbs-portal`:

1. **`src/lib/intent-contract.ts`** — TypeScript contract containing:
   - Domain entities (fields, states, transitions)
   - Business rules (with verification status)
   - Contract metadata (version, export date, status)

2. **`docs/intent-contract-rules-checklist.md`** — Markdown checklist of all business rules for tracking implementation progress

### How to Export

```bash
# From vbs-intent directory
pnpm run export:contract
```

This reads `src/domain/intent-model/model.ts` and generates the contract files in `../vbs-portal` (expects both repos to be in the same parent directory).

**Preserves verification state:** When re-exporting, the script preserves the `verified: true/false` status on business rules. This is the ONLY field engineers should edit manually in the contract file.

---

## When to Update Which Repo

| Change Type | Example | Update vbs-intent? | Update vbs-portal? | Notes |
|-------------|---------|-------------------|-------------------|-------|
| **New entity** | Payment, User, Booking-HBL Link | ✅ Yes | ⏱️ After export | Source of truth |
| **New field on entity** | `storage_fee_flag` on HBL | ✅ Yes | ⏱️ After export | Source of truth |
| **Entity lifecycle change** | Add new state to Booking | ✅ Yes | ⏱️ After export | Source of truth |
| **Business rule change** | Fee formula, DO validation logic | ✅ Yes | ⏱️ After export | Source of truth |
| **Actor/responsibility change** | P4TC can now cancel bookings | ✅ Yes | ⏱️ After export | Source of truth |
| **Navigation structure** | Rename "House Bills" → "My Bookings" | ❌ No | ✅ Yes | Implementation detail |
| **Table column order** | Move Booking Ref before Pickup Date | ❌ No | ✅ Yes | Implementation detail |
| **UI component choice** | Modal vs sidebar | ❌ No | ✅ Yes | Implementation detail |
| **Visual design** | Icon style, colors, spacing | ❌ No | ✅ Yes | Implementation detail |
| **Form validation UX** | Error message copy | ❌ No | ✅ Yes | Implementation detail |
| **Status card labels** | "Assigned" vs "Unassigned" logic | Maybe* | ✅ Yes | *If business logic changed |

---

## Workflow Patterns

### Pattern 1: New Business Requirement (BRD Update)

**Scenario:** Client adds a new feature or changes business logic.

```bash
# 1. Update intent model (vbs-intent)
cd ~/DBiz/vbs-intent
# Edit src/domain/intent-model/model.ts
git add src/domain/intent-model/model.ts
git commit -m "feat: add X entity / change Y rule"

# 2. Export contract
pnpm run export:contract

# 3. Switch to portal and pull contract
cd ../vbs-portal
git pull origin main  # or manually copy if needed
git add src/lib/intent-contract.ts docs/intent-contract-rules-checklist.md
git commit -m "chore: sync contract from intent model vX.X.X"

# 4. Implement in portal
# Build screens, components, logic
git commit -m "feat: implement X feature"
```

### Pattern 2: UX Refinement (Design Feedback)

**Scenario:** Design review reveals UI improvements (like Kavya's feedback).

```bash
# Work directly in vbs-portal
cd ~/DBiz/vbs-portal

# Make UI changes (navigation, styling, column order, etc.)
git commit -m "refactor: improve LSP dashboard UX per design review"

# Optional: Document what shipped back in intent model later
cd ../vbs-intent
# Update journey steps or add notes about what actually shipped
git commit -m "docs: update journey notes based on portal v1.0 implementation"
```

**Key point:** Don't let intent model updates block UX work. Ship first, document later if needed.

### Pattern 3: Sync Decision (Model Reconciliation)

**Scenario:** Reconciling intent model with BRD/Miro/meeting notes (like March 23 sync).

```bash
# 1. Document decisions (vbs-intent)
cd ~/DBiz/vbs-intent
# Create docs/sync-decisions-YYYY-MM-DD.md
git add docs/sync-decisions-2026-03-23.md
git commit -m "docs: record sync decisions for model v0.X.X"

# 2. Apply changes to model
# Edit src/domain/intent-model/model.ts
git add src/domain/intent-model/model.ts
git commit -m "feat: apply sync decisions - add Payment/User entities, mark P4TC deferred"

# 3. Export and continue with Pattern 1
pnpm run export:contract
```

---

## Drift Policy (When Models Diverge)

The intent model is a **reference document**, not a living spec. Once code is being written, drift is expected and acceptable.

### Acceptable Drift (Don't Update Model)

- **Implementation details** — field ordering, component choices, loading states, error copy
- **UX refinements** — "we split this into two steps" or "we added a confirmation dialog"
- **Minor data changes** — renamed field in schema
- **Tech decisions** — drawer vs modal, pagination size

### Requires Discussion (Update Model Only If Time Permits)

- **Business logic changes discovered during build** — "relative cutoffs don't work, switching to absolute dates"
- **Scope negotiations** — "heat map cut from Phase 1"
- **Data source changes** — "AGS gives us X instead of Y"

### Not Acceptable (Must Discuss with Team First)

- **Business rule changes** — fee formula, DO validation logic, booking modification rules
- **Actor/auth changes** — "P4TC now needs login" or "drivers get emails"
- **Flow changes** — "removing T&Cs step" or "cancellation has a fee"
- **Silent changes** — changing rules without team notification

**Rule of thumb:** If the change would surprise Matt (client) or Roni (PM), discuss first.

### When to Sync Back

- **Major business rule change** from client
- **New journey discovered** not in original scope
- **Open question gets resolved**
- **Before phase review or stakeholder checkpoint** — bring model in sync as summary of what shipped vs planned

### When to Stop Updating Model Entirely

After Phase 1 ships. The model served its purpose: pre-build alignment. Post-ship, the code and deployed product are the spec.

---

## Verification Workflow for Business Rules

The contract includes a `verified` field on each business rule. This tracks implementation status.

### How to Mark Rules as Verified

```typescript
// In vbs-portal/src/lib/intent-contract.ts
export const contractRules: ContractRule[] = [
  {
    id: 'BR-001',
    description: 'Booking can only be created for HBLs with DO_REQUIRED or UNDER_BOND release',
    applies_to: ['booking_entity'],
    source: 'BRD Section 4.2.1',
    verified: true,  // ← Engineer changes this after implementing + testing
  },
  // ...
]
```

### Workflow

1. Engineer implements business rule
2. Engineer writes tests validating the rule
3. Tests pass → engineer sets `verified: true` in contract
4. Next contract export preserves this status

### Checklist for Tracking

The auto-generated `docs/intent-contract-rules-checklist.md` provides a markdown checklist for tracking which rules have been implemented. Use this during sprint planning and reviews.

---

## Common Issues

### Contract Export Fails

**Error:** `Portal directory not found at ../vbs-portal`

**Fix:** Both repos must be siblings in the same parent directory:

```
~/DBiz/
├── vbs-intent/
└── vbs-portal/
```

### Contract Not Updating in Portal

**Issue:** Made changes to model but portal contract unchanged.

**Fix:**
1. Verify you ran `pnpm run export:contract` in `vbs-intent`
2. Check console output shows export succeeded
3. If portal is open in editor, reload the file (`intent-contract.ts`)

### Merge Conflicts in Contract File

**Issue:** Contract file has conflicts after pulling.

**Fix:**
1. Re-export from intent model: `cd ../vbs-intent && pnpm run export:contract`
2. Copy verification statuses from conflicted version if needed
3. Do NOT hand-merge — always regenerate from source

---

## Quick Reference

| Task | Command | Repo |
|------|---------|------|
| Update business requirements | Edit `src/domain/intent-model/model.ts` | vbs-intent |
| Export contract | `pnpm run export:contract` | vbs-intent |
| Verify contract synced | Check git status | vbs-portal |
| Mark rule verified | Edit `src/lib/intent-contract.ts` | vbs-portal |
| Check implementation status | Review `docs/intent-contract-rules-checklist.md` | vbs-portal |
| Make UI changes | Work in `src/app/` or `src/components/` | vbs-portal |

---

## Related Documentation

- **[Intent Model to Screens Process](../intent-model-to-screens-process.md)** — How to design screens from the model
- **[BRD to Engineering Process](brd-to-engineering-process.md)** — Full pipeline validation
- **[Getting Started Guide](getting-started.md)** — Setup instructions for both repos
- **[Team Guide](team-guide.md)** — Using the intent model platform for reviews
