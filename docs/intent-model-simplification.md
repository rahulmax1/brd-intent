# Intent Model Simplification Proposal

**Version**: 0.7.0 review
**Date**: 2026-03-22
**Status**: Proposal — not yet implemented

---

## Rule Consolidation

### 1. DO Policy (BR-002 + BR-003 + BR-021 + BR-031 → single rule)

**Current state — 4 rules saying facets of the same thing:**

| Rule | Says |
|------|------|
| BR-002 | Under-bond HBLs skip DO requirement |
| BR-003 | Each tier uploads own DO independently, no inheritance |
| BR-021 | Each HBL needs DO or free_release flag |
| BR-031 | Multiple DOs per HBL (one per tier), ACFS validates each individually |

**Proposed — single "DO Policy" rule:**

> Each HBL requires a validated DO per delegation tier. DO requirement is waived by `under_bond` flag (manual, verified by ACFS) or `free_release` flag (per tier). Each tier uploads independently — no inheritance. ACFS validates each DO individually, HBL-centric.

One rule, zero logic lost.

---

### 2. Notification Policy (BR-012 + BR-020 + C-004 → single rule)

**Current state:**

| Rule | Says |
|------|------|
| BR-012 | Booking confirmation to account/P4TC email only, not driver |
| BR-020 | Update notification sent when ACFS modifies booking |
| C-004 | Driver has no portal access, no system emails |

BR-012 and C-004 both restrict driver communication. BR-020 is the update trigger for the same notification system.

**Proposed — single "Notification Policy" rule + keep C-004 as access constraint:**

> Booking confirmation, modification, and cancellation notifications sent to booking party email (LSP account email or P4TC email). Driver receives nothing from the system — booking party forwards externally.

C-004 stays as a constraint but simplified to: *"Driver has no portal access."* The no-email part is now covered by the rule. C-008 (email as primary channel) stays unchanged.

---

### 3. Modification Policy (BR-006 + BR-015 + BR-027 → single rule)

**Current state:**

| Rule | Says |
|------|------|
| BR-015 | Truck/driver anytime, slot/HBL before cutoff, cost-impacting needs ACFS override |
| BR-006 | No-show rebooking is inline edit on existing booking, fee-free |
| BR-027 | Admin modifications (add/remove HBLs, change slot) fee-free Phase 1 |

BR-006 and BR-027 are special cases of BR-015.

**Proposed — single "Modification Policy" rule:**

> Truck/driver changeable anytime until collection. Slot/HBL changes allowed before change cutoff only — cost-impacting changes after cutoff require ACFS admin. Admin and no-show rebookings are fee-free inline edits on the existing booking (no new booking created). P4TC cannot self-modify (must contact ACFS).

This also absorbs BR-023 (P4TC can't self-modify) since it's a modification permission.

**4 rules → 1.**

---

### 4. User Management (BR-014 + BR-024 + BR-025 → single rule)

**Current state:**

| Rule | Says |
|------|------|
| BR-014 | ACFS manages user lifecycle, permissions configurable per user |
| BR-024 | Removal is soft-delete (archive), access disabled |
| BR-025 | Welcome email link expires in 72 hours |

BR-024 and BR-025 are implementation details of BR-014's lifecycle.

**Proposed — single "User Management" rule:**

> ACFS manages user lifecycle (create, update, remove) with configurable permissions per user. Removal is soft-delete — access and notifications disabled, data retained. Welcome email link expires in 72 hours.

**3 rules → 1.**

---

### 5. Cancellation + Refund (BR-022 + C-003 → BR-022 only)

**Current state:**

| Rule | Says |
|------|------|
| BR-022 | LSP cancels own, ACFS cancels any (reason required), refund offline |
| C-003 | Refunds completely offline, portal refund-agnostic |

C-003 is restating what BR-022 already says.

**Proposed:** Kill C-003. BR-022 already covers it.

---

### Rules that stay as-is

| Rule | Why it stays |
|------|-------------|
| BR-001 | Booking gate (unpacked + customs) — core validation, distinct from everything else |
| BR-004 | Delegate OR book per HBL — mutual exclusivity, unique concern |
| BR-005 | Slot cutoff format (relative day + time) — configuration spec |
| BR-007 | Partial processing — unique ACFS capability |
| BR-009 | LSP scoped visibility — access control |
| BR-010 | Auto-sync on login — integration behavior |
| BR-011 | Missing DO aborts booking (hard stop) — validation gate |
| BR-013 | P4TC chain delegation — unique to P4TC |
| BR-016 | Driver records scoped per LSP account — data scoping |
| BR-017 | Two separate acceptances (T&Cs + site induction) — UX requirement |
| BR-018 | DO validation separate from pickup verification — operational concern |
| BR-019 | Fee calculation formula — pricing logic |
| BR-026 | Can't remove slots with active bookings — slot protection |
| BR-028 | "collected" is derived status — state machine behavior |
| BR-029 | Audit trail split (slim on booking, full on HBL) — data architecture |
| BR-030 | LSP reuses ACFS booking interface — UI architecture |

---

### Constraints: reclassification

**Move to rules (product decisions, not platform limits):**

| Constraint | Recommendation |
|------------|---------------|
| C-001 | No hard capacity limits, density indicator only → merge into BR-005 (slot configuration) as a detail |
| C-002 | Slots with bookings can't be modified Phase 1 → merge into BR-026 (slot protection) |

**Keep as constraints (true platform/scope limits):**

| Constraint | What it is |
|------------|-----------|
| C-004 | Driver has no portal access (simplify — remove email mention, now in notification rule) |
| C-005 | P4TC has no persistent credentials (magic link + OTP only) |
| C-006 | Site management DB-seeded Phase 1, no CRUD UI |
| C-007 | Desktop/laptop only, no mobile/tablet |
| C-008 | Email primary notification channel |

**Kill:**

| Constraint | Why |
|------------|-----|
| C-003 | Already covered by BR-022 (cancellation rule mentions refund offline) |

---

### Scorecard

| | Before | After | Delta |
|--|--------|-------|-------|
| Business rules | 31 | 22 | -9 |
| Constraints | 8 | 5 | -3 |
| Total items | 39 | 27 | -12 (31% reduction) |

Zero logic removed. Every condition is still captured.

---

## Entity Field Simplification

### 1. The DO-waiver triangle on HBL

Three fields control whether a DO is needed:

| Field | Type | Who sets it | Effect |
|-------|------|-------------|--------|
| `under_bond` | boolean | LSP/ACFS manually | Skips DO entirely |
| `under_bond_verified` | boolean | ACFS only | Records ACFS verification of under-bond |
| `release_type` | `'do_required' \| 'free_release'` | System/data | Waives DO for that tier |

`under_bond` and `free_release` produce the same outcome (no DO needed) but represent different business concepts:
- **Under-bond** = legal status (Australian Border Force customs bond). Has its own verification flow.
- **Free release** = shipping term. No verification needed.

**Recommendation: Keep both, add a computed field.**

The booking flow shouldn't check three fields. Add a derived `do_waived` that collapses the logic:

```
do_waived = release_type === 'free_release' || under_bond === true
```

Booking readiness checks `do_waived` instead of juggling three fields. Source fields stay separate because they represent different business concepts with different workflows (under-bond needs ACFS verification, free release doesn't).

---

### 2. Drop `storage_fee_flag` — it's computed

The field description says: *"Derived from last_free_storage_date — auto-calculated, not manually set."*

This is `Date.now() > last_free_storage_date`. Storing it creates staleness risk — if the date passes overnight but nobody recalculates the flag, the UI lies.

**Recommendation:** Remove `storage_fee_flag` from the entity. Compute on read from `last_free_storage_date`. The entity description already says it's derived — make that real.

---

### 3. Consider dropping `chargeable_weight` — it's computed

The field description says: *"Max of weight vs volume per HBL. Calculated and stored."*

This is `Math.max(weight_kg, volume_m3)`. Storing a value derived from two other fields on the same entity invites sync issues.

**Recommendation:** Remove from entity definition. Let the fee calculation (BR-019) compute it inline. If the backend team wants it materialized for performance, that's an implementation detail, not a model concern.

---

### 4. Move integrations out of entities

Five "entities" aren't really entities:

| "Entity" | What it actually is |
|-----------|-------------------|
| `integration_maximus` | Inbound data spec (Maximus → Portal) |
| `integration_ags` | Inbound data spec (AGS → Portal) |
| `integration_payment` | Outbound payment spec (Portal → Stripe) |
| `integration_email` | Outbound notification spec (Portal → Email) |
| `integration_lsp_registry` | One-time seed spec (AGS → Portal) |

These have no real lifecycle, no state transitions, and their "key fields" are metadata descriptions, not data model fields. They're integration specs wearing entity costumes.

**Recommendation:** Add a separate `integrations` section to the model type. This:
- Drops entity count from 11 → 6 (the real domain objects)
- Makes the entity list represent actual things with data and state
- Keeps integration specs fully documented, just in the right place

**New entity list (6):**
1. HBL (House Bill of Lading)
2. Booking
3. Pickup Slot
4. Site
5. Driver Record
6. Delivery Order (DO)

Plus a new `integrations` section with 5 entries.

---

### 5. Booking driver fields — intentional denormalization, keep as-is

Booking has `driver_name`, `driver_license`, `truck_rego` — duplicated from Driver Record. This is **by design**: the booking snapshots the driver at booking time. If the driver record gets updated later, the booking retains the original values for verification purposes.

No change needed.

---

### 6. HBL `quantity` and `pack_type` — marked optional, question their presence

Both fields say *"Optional — may not be required for decision-making."* They're not referenced by any business rule, constraint, journey step, or fee calculation. They exist because Maximus provides them.

**Recommendation:** Flag these as display-only fields. If they don't drive any logic, they should be documented as informational rather than sitting alongside fields that gate booking readiness. Consider grouping HBL fields into "decision fields" vs "display fields" to help stakeholders understand what matters.

---

## Entity Field Summary

| Change | Type | Impact | Risk |
|--------|------|--------|------|
| Add computed `do_waived` from `release_type` + `under_bond` | Additive | Simplifies booking flow | Low |
| Drop `storage_fee_flag`, compute on read | Remove field | Eliminates staleness | Low |
| Drop `chargeable_weight`, compute inline | Remove field | Eliminates sync risk | Low-medium |
| Move 5 integrations to separate section | Structural | 11 → 6 entities | Low |
| Flag `quantity` + `pack_type` as display-only | Documentation | Clarifies field importance | None |
| Keep booking driver fields denormalized | No change | Snapshot by design | None |
| Keep `under_bond` + `release_type` separate | No change | Different business concepts | None |

---

## Combined Impact

| Area | Before | After |
|------|--------|-------|
| Business rules | 30 | 21 |
| Constraints | 8 | 5 |
| Entities | 11 | 7 + 5 tagged integrations (was 11, now separated) |
| HBL fields | 19 | 18 (-1 removed, +1 computed) |
| Total rules/constraints | 38 | 26 |

32% fewer rules and constraints. Same logic. Clearer model.

## Implementation Status

**Completed 2026-03-22:**

### vbs-intent (intent model — source of truth)
- `src/domain/intent-model/model.ts` — rules consolidated, constraints reduced, HBL fields updated, integrations tagged
- `src/domain/intent-model/types.ts` — added `is_integration?: boolean` to Entity type

### vbs-portal (frontend portal)
- `src/lib/intent-contract.ts` — rules synced to match consolidated model, HBL fields updated

### Rules removed (absorbed into consolidated rules)
- BR-003, BR-006, BR-020, BR-021, BR-023, BR-024, BR-025, BR-027, BR-031

### Constraints removed (absorbed into rules)
- C-001 → absorbed into BR-005
- C-002 → absorbed into BR-026
- C-003 → absorbed into BR-022

### No frontend code changes needed
- `storage_fee_flag` remains in portal types/mock data/components — model change is requirements-level (backend should compute it, not store it)
- `chargeable_weight` remains in use — description updated to note it's derived
- `do_waived` added as computed field — frontend can adopt when ready
- `drift-report.json` references stale rule IDs — will refresh on next export
