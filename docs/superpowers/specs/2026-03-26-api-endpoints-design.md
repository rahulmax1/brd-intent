---
name: API Endpoints Documentation Page
description: Documentation page for 48 VBS Portal API endpoints (validated against schema v1.0)
type: design
status: validated
---

# API Endpoints Documentation Page Design

## Overview

Create a documentation page at `/review/api-endpoints` that lists 48 validated API endpoints for the VBS Pickup Portal, organized by domain, with detailed specs and a consolidation analysis section.

**Validation Status:** ✅ Endpoints validated against Production Schema v1.0 (2026-03-26)
**See:** `api-endpoints-validation.md` for full validation report

## Context

The team expressed concern that 52 endpoints is high. After validation against the production database schema, we've consolidated to **48 endpoints** (10 removed, 8 added). This page serves two purposes:
1. **Reference documentation** — comprehensive API specs for developers
2. **Architecture review** — validated consolidation analysis with schema alignment

## Critical Findings

🚨 **BLOCKER:** Current schema uses sequential integer IDs (`int [pk, increment]`), but Ranjith requires **non-sequential UUIDs** to prevent enumeration attacks. Schema must be migrated to `uuid` type before implementation.

## Goals

- Document all 48 validated endpoints with clear specs (method, route, params, auth, permissions)
- Use non-sequential reference IDs (e.g., `API-H729`) for easy discussion
- **Prominently note UUID requirement** — all resource IDs must use UUIDs after schema migration
- Provide validated consolidation analysis (52 → 48 endpoints)
- Match the existing review page aesthetic (warm minimal, Linear-inspired)

## Page Structure

### Route
`/review/api-endpoints`

### Layout
Uses the existing `layout-shell` component with nav. Follows the same spacing, typography, and color scheme as other review pages.

### Sections

```
┌─────────────────────────────────────────────┐
│ Header                                      │
│ • Title: "API Endpoints"                    │
│ • Subtitle: "Portal API Reference & Analysis"│
│ • Stats badge: "48 endpoints | 13 domains"  │
│ • 🚨 UUID requirement alert banner          │
│ • Search/filter bar                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ UUID Requirement Alert (dismissible)        │
│ ⚠️ Schema uses sequential IDs - must migrate│
│ to UUIDs before implementation (see docs)   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Quick Summary Stats                         │
│ [Card: 48 total | 13 domains | validated]  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Endpoint Catalog (by domain)                │
│                                             │
│ ▼ HBLs/Shipments (6)                       │
│   [endpoint cards...]                       │
│                                             │
│ ▼ Bookings (7)                             │
│   [endpoint cards...]                       │
│                                             │
│ ▼ Slots (6)                                │
│ ▼ Delivery Orders (6)                      │
│ ▼ Delegations (4)                          │
│ ▼ Parties/LSPs (2)                         │
│ ▼ Drivers (4)                              │
│ ▼ Users (5)                                │
│ ▼ Sites (1)                                │
│ ▼ Auth (3)                                 │
│ ▼ Payments (3)                             │
│ ▼ P4TC (2) - deferred                      │
│ ▼ Stats/Dashboard (3)                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Consolidation Analysis                      │
│                                             │
│ Validated: 52 initial → 48 endpoints        │
│ • Removed: 10 (merged or deferred)          │
│ • Added: 8 (schema gaps filled)             │
│                                             │
│ By domain:                                  │
│ • HBLs/Shipments: 6 → 4 endpoints           │
│ • Bookings: 7 → 6 endpoints                 │
│ • Slots: 6 → 4 endpoints                    │
│ • Delivery Orders: 6 → 5 endpoints          │
│ • Users: 5 → 4 endpoints                    │
│ • Pricing Zones: 0 → 4 endpoints (NEW)      │
│ • Containers: 0 → 2 endpoints (NEW)         │
│ • P4TC: 2 → 0 (Phase 1 deferred)            │
│                                             │
│ Detailed recommendations with trade-offs    │
└─────────────────────────────────────────────┘
```

## Endpoint Card Design

Each endpoint is displayed as a card with the following structure:

```
┌─────────────────────────────────────────────┐
│ [GET] /api/hbls/:id              API-H294   │ ← method badge, route, ref ID
│                                             │
│ Get single HBL details                      │ ← description
│                                             │
│ Parameters:                                 │
│ • id (path): HBL UUID - unique identifier   │ ← UUID notation
│                                             │
│ Auth: Bearer token (LSP, ACFS, P4TC)        │
│                                             │
│ Response: HBL object with nested data       │
└─────────────────────────────────────────────┘
```

### Visual treatment
- **HTTP method badge**: color-coded pill
  - GET: green (#10b981)
  - POST: blue (#3b82f6)
  - PATCH: amber (#f59e0b)
  - DELETE: red (#ef4444)
- **Reference ID**: top-right corner, muted text, format `API-X###` (X = domain letter, ### = 3-digit random number)
- **Background**: warm off-white (#F8F8F7) with subtle border
- **Typography**: DM Sans, weights 400/500/600

### Non-sequential reference IDs

Format: `API-{domain-letter}{3-digit-random}`

Domain letters:
- H = HBLs/Shipments
- B = Bookings
- S = Slots
- D = Delivery Orders
- G = Delegations
- P = Parties/LSPs
- R = Drivers
- U = Users
- I = Sites
- A = Auth
- Y = Payments
- T = P4TC
- X = Stats/Dashboard

Examples: `API-H294`, `API-B731`, `API-S047`

**Why random 3-digit?** Prevents the appearance of a sequence (not 001, 002, 003). Makes it clear these are stable reference identifiers for discussion, not implementation order.

### UUID notation

Every endpoint that uses resource IDs in the path or response includes a note:

> **:id parameter uses UUID** — e.g., `550e8400-e29b-41d4-a716-446655440000`

This applies to:
- Path parameters (`:id`, `:hblId`, `:bookingId`, etc.)
- Response fields (`id`, `hbl_id`, `booking_id`, etc.)

## Data Model

The page sources its data from a static TypeScript object (no API call needed). The 52 endpoints are defined in the earlier conversation context and will be transcribed into `src/lib/api-endpoints-data.ts`.

Structure:

```typescript
type ApiEndpoint = {
  id: string                    // API-H294
  domain: string                // 'HBLs/Shipments'
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string                  // '/api/hbls/:id'
  description: string           // 'Get single HBL details'
  parameters: {
    name: string                // 'id'
    location: 'path' | 'query' | 'body'
    type: string                // 'UUID' | 'string' | 'number' | ...
    description: string         // 'HBL unique identifier'
    required: boolean
  }[]
  auth: string[]                // ['LSP', 'ACFS', 'P4TC']
  response: string              // 'HBL object with nested data'
  usesUuid: boolean             // true if :id or similar in path
}

type ConsolidationOpportunity = {
  domain: string
  current: number               // 6 endpoints
  proposed: number              // 4 endpoints
  savings: number               // 2
  recommendations: {
    action: string              // 'Merge search endpoints'
    endpoints: string[]         // ['API-H047', 'API-H291']
    rationale: string           // 'Both do keyword search...'
    newEndpoint: string         // 'GET /api/hbls with ?q= param'
    tradeoff: string            // 'Slightly more complex query params'
  }[]
}
```

## Consolidation Analysis Section

This section appears after all endpoint cards. Structure:

### Summary card
```
┌─────────────────────────────────────────────┐
│ Consolidation Analysis (Validated)          │
│                                             │
│ Initial proposal: 52 endpoints              │
│ Validated & refined: 48 endpoints           │
│ Net change: -4 endpoints (8% reduction)     │
│                                             │
│ Changes:                                    │
│ • Removed: 10 endpoints (merged/deferred)   │
│ • Added: 8 endpoints (schema gaps)          │
│ • Kept: 42 endpoints (validated)            │
│                                             │
│ Strategy: RESTful patterns, fill schema     │
│ gaps, defer P4TC to fast follow             │
└─────────────────────────────────────────────┘
```

### By-domain breakdown

For each domain, show:
1. Current count → Proposed count
2. List of consolidation opportunities
3. Rationale and trade-offs

**Note:** The following examples are from the validated API endpoints (see `api-endpoints-validation.md` for full report).

Examples:

```markdown
### HBLs/Shipments: 6 → 4 endpoints (-2) ✅

**Change 1: Merge search into list**
- Removed: `API-H047 GET /api/hbls/search`
- Kept: `API-H729 GET /api/hbls` with `?q=` search param
- Rationale: Search is just filtered list — combine into one endpoint
- Trade-off: None — standard REST pattern
- Status: ✅ Validated against schema

**Change 2: Remove dedicated flag endpoint**
- Removed: `API-H931 POST /api/hbls/:id/flag-under-bond`
- Alternative: Use `API-H518 PATCH /api/hbls/:id` with `{ under_bond: true }`
- Rationale: Flagging is a property update, not a separate action
- Trade-off: None — simpler and more RESTful
- Status: ✅ Validated

### Pricing Zones: 0 → 4 endpoints (+4) ✅ NEW

**Gap: Missing ACFS admin configuration**
- Schema has `pricing_zones` table but no API endpoints
- Added:
  - `GET /api/pricing-zones` - list zones
  - `POST /api/pricing-zones` - create zone
  - `PATCH /api/pricing-zones/:id` - update rate
  - `DELETE /api/pricing-zones/:id` - deactivate zone
- Rationale: ACFS admin must configure rates per site for fee calculation
- Status: ✅ Required for schema completeness

### P4TC: 2 → 0 endpoints (-2) ⏸️ DEFERRED

**Phase 1 Scope Decision**
- Removed: `API-T647 POST /api/p4tc/verify-otp`
- Removed: `API-T392 GET /api/p4tc/session`
- Rationale: P4TC actor deferred to fast follow per BRD v1.5
- Trade-off: Phase 1 LSP-only, P4TC comes later
- Status: ⏸️ Deferred, not deleted
```

### Consolidation principles

Document the guiding principles for API design:

1. **Use query params for filtering** — `GET /api/resource?filter=value` instead of dedicated filter endpoints
2. **Use PATCH for property updates** — don't create dedicated POST endpoints for boolean flags
3. **Combine list + search** — single endpoint with optional `?q=` param
4. **Nested resources for tight coupling** — e.g., `/api/bookings/:id/hbls` instead of separate endpoint
5. **Avoid action-specific endpoints** — use HTTP verbs + resource updates instead of `/api/resource/:id/do-thing`

## Interactive Features

### Search/filter bar
- Filter by domain (checkboxes)
- Filter by method (GET/POST/PATCH/DELETE)
- Filter by actor permission (LSP/ACFS/P4TC)
- Text search across endpoint descriptions

### Collapsible sections
- Each domain section can collapse/expand
- Default: all expanded
- State persists in localStorage

### Copy reference ID
- Click reference ID (e.g., `API-H294`) to copy to clipboard
- Brief toast confirmation

## Implementation Notes

### File structure

```
src/
  app/
    review/
      api-endpoints/
        page.tsx                      # main page component
        endpoint-card.tsx             # individual endpoint card
        consolidation-analysis.tsx    # analysis section
  lib/
    api-endpoints-data.ts            # source data (52 endpoints)
    api-consolidation-data.ts        # consolidation opportunities
```

### Key decisions

1. **Static data, no API** — all endpoint specs are hardcoded TypeScript objects. This is documentation, not dynamic data.

2. **Non-sequential ID generation** — use a seeded random number generator to create stable IDs (same run = same IDs). Avoids sequential appearance while remaining deterministic.

3. **UUID format** — document that UUIDs follow v4 format (random). Don't prescribe ULID/nanoid unless there's a specific requirement.

4. **Responsive design** — endpoint cards stack on mobile, 2-col on tablet, 3-col on desktop.

5. **Print-friendly** — consolidation analysis should print well (team may want to discuss offline).

## Validation Report

Full validation against Production Schema v1.0 available at:
**`docs/superpowers/specs/api-endpoints-validation.md`**

This report includes:
- Endpoint-by-endpoint schema validation
- UUID migration requirements
- Missing endpoints identified and added
- Consolidation decisions with rationale
- REST API design pattern analysis
- Implementation checklist

## Open Questions

**BLOCKER:** UUID migration must be completed before API implementation. Options:
1. Migrate schema to UUIDs first (recommended)
2. Use UUIDs in API layer with int→uuid mapping (technical debt)
3. Accept sequential IDs (security risk per Ranjith)

**Recommendation:** Option 1 — migrate schema to UUIDs before starting API work.

## Success Metrics

- ✅ Team can reference specific endpoints by ID during discussions
- ✅ Clear visibility into validated consolidation (52 → 48)
- ✅ All endpoints validated against production schema
- ⏳ Decision made on UUID migration approach
- ⏳ Phase 1 scope confirmed (48 endpoints or subset)
