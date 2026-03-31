# API Endpoints Documentation Page

**Route:** `/review/api-endpoints`

## Purpose

Comprehensive reference documentation for 48 validated API endpoints for the VBS Pickup Portal, with consolidation analysis to address team concerns about API surface size.

## Features

### Endpoint Catalog
- **48 validated endpoints** across 13 domains
- **Non-sequential reference IDs** (API-H729 format) for easy discussion
- **UUID requirement notation** on all endpoints using resource IDs
- **Color-coded HTTP methods**: GET (green), POST (blue), PATCH (amber), DELETE (red)
- **Full parameter specs** with type, location, required flag
- **Auth requirements** (LSP, ACFS, P4TC)
- **Schema tables** referenced by each endpoint

### Interactive Features
- **Search**: Filter by endpoint ID, path, description, method
- **Method filter**: Show only GET/POST/PATCH/DELETE
- **Auth filter**: Show only LSP/ACFS/P4TC accessible
- **Collapsible domains**: Click to collapse/expand, state persists
- **Copy reference ID**: Click to copy API-H729 style IDs

### Consolidation Analysis
- **Summary stats**: 52 initial → 48 validated (-4, 8% reduction)
- **Domain-by-domain breakdown**: Shows removed/added/kept endpoints
- **REST principles**: Documents guiding API design principles
- **Validation status**: All endpoints validated against schema v1.0

### Alerts
- **UUID requirement banner**: Dismissible alert about schema migration
- **Phase deferred badges**: Marks P4TC endpoints as deferred

## Data Sources

- **Static data**: All 48 endpoints defined in `src/lib/api-endpoints-data.ts`
- **Consolidation data**: Changes documented in `src/lib/api-consolidation-data.ts`
- **Validation report**: `docs/superpowers/specs/api-endpoints-validation.md`

## Technical Details

- **Stable IDs**: Generated with seeded random (deterministic, non-sequential)
- **Persistent state**: Collapsed domains + dismissed alert in localStorage
- **Responsive grid**: 1 col (mobile), 2 col (tablet), 3 col (desktop)
- **Type-safe**: Full TypeScript coverage for endpoint specs

## Critical Finding

⚠️ **Schema uses sequential integer IDs** but team requires non-sequential UUIDs for security. Schema must be migrated to `uuid` type before API implementation.

## See Also

- Design spec: `docs/superpowers/specs/2026-03-26-api-endpoints-design.md`
- Validation report: `docs/superpowers/specs/api-endpoints-validation.md`
- Implementation plan: `docs/superpowers/plans/2026-03-26-api-endpoints-page.md`
