# API Endpoints Validation Report

**Date:** 2026-03-26
**Schema Version:** Production Schema v1.0
**Reviewed By:** Claude

## Executive Summary

Reviewed 52 proposed API endpoints against the production database schema v1.0. Found several critical issues and consolidation opportunities.

### Critical Issues

1. **🚨 UUID Requirement vs Schema Mismatch**
   - Ranjith requested non-sequential IDs (UUID strategy)
   - Current schema uses `int [pk, increment]` (sequential integers) for all tables
   - **Action Required:** Schema must be updated to use UUIDs before implementation
   - **Recommendation:** Use `uuid` type with `gen_random_uuid()` default for all primary keys

2. **Missing Endpoints**
   - No endpoints for `containers` table (container tracking)
   - No endpoints for `hbl_custody_chain` (full audit trail view)
   - No endpoints for `user_invitations` management
   - No endpoints for `pricing_zones` configuration (ACFS admin feature)

3. **Endpoint-Schema Misalignments**
   - Several endpoints assume relationships not clearly defined in schema
   - Some query parameters won't work efficiently without additional indexes

### Consolidation Opportunities

**High Priority (17 → ~12 endpoints):**
- Merge HBL list + search (2 → 1)
- Merge booking list + search (2 → 1)
- Combine flag operations into PATCH (3 → 0)
- Merge stats endpoints (3 → 1)

**Recommendation:** Reduce from 52 to 38-40 endpoints with better REST patterns.

---

## Detailed Validation

### 1. HBLs/Shipments (6 endpoints)

#### API-H729
**Endpoint:** `GET /api/hbls`
**Description:** List HBLs with filtering (status, site, milestone, LSP)
**Schema Validation:** ✅ Supported
**Tables:** `hbls`, `companies`, `sites`
**Issues:** None
**Parameters:**
- `status` (query): filters by `hbl_status` enum ✅
- `site` (query): filters by `pickup_site_id` ✅ (index exists)
- `milestone` (query): filters by `milestone` enum ✅
- `company_id` (query): filters by `assigned_company_id` ✅ (index exists)
- `page`, `limit` (pagination)

#### API-H284
**Endpoint:** `GET /api/hbls/:id`
**Description:** Get single HBL details
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID (requires schema change)
**Tables:** `hbls` with joins to `containers`, `companies`, `sites`, `delivery_orders`
**Issues:** None

#### API-H047
**Endpoint:** `GET /api/hbls/search`
**Description:** Search by HBL ref, booking ref, container
**Schema Validation:** ⚠️ Partial
**Issues:**
- Search by booking ref requires join to `booking_hbls` table
- No full-text index defined for text search
- **Consolidation:** Merge into `GET /api/hbls` with `?q=` param

**Recommendation:** Remove this endpoint, add `q` param to API-H729

#### API-H518
**Endpoint:** `PATCH /api/hbls/:id`
**Description:** Update HBL (ACFS: edit details, milestones)
**Schema Validation:** ✅ Supported
**Auth:** ACFS only (admin/user)
**UUID Note:** `:id` should use UUID
**Updateable Fields:**
- `milestone` ✅
- `hbl_status` ✅
- `customs_status` ✅
- `customs_clearance_date` ✅
- `under_bond` ✅
- `under_bond_verified` ✅
- `description` ✅
- `weight_kg`, `volume_m3` ✅
- `assigned_company_id` ✅
**Issues:** None

#### API-H931
**Endpoint:** `POST /api/hbls/:id/flag-under-bond`
**Description:** Flag HBL as under-bond
**Schema Validation:** ❌ Unnecessary
**Issues:**
- This is just setting `under_bond = true`
- Should use `PATCH /api/hbls/:id` with `{ under_bond: true }`
- **Consolidation:** Remove this endpoint entirely

**Recommendation:** ❌ Delete - use PATCH instead

#### API-H672
**Endpoint:** `GET /api/hbls/:id/audit-trail`
**Description:** Full hop history (custody chain)
**Schema Validation:** ✅ Supported
**Tables:** `hbl_custody_chain`, `companies`, `delegations`
**UUID Note:** `:id` should use UUID
**Issues:** None - this is a valuable audit endpoint

**Current Total:** 6 endpoints
**Recommended:** 4 endpoints (remove API-H047, API-H931)

---

### 2. Bookings (7 endpoints)

#### API-B381
**Endpoint:** `GET /api/bookings`
**Description:** List bookings (filter by status, site, date)
**Schema Validation:** ✅ Supported
**Tables:** `bookings`, `slots`, `sites`, `companies`
**Issues:** None
**Parameters:**
- `status` (query): filters by `booking_status` enum ✅
- `site_id` (query): via `slots.site_id` join ✅
- `date_from`, `date_to` (query): filters by `slot_date` ✅
- `company_id` (query): filters by `booked_by_company_id` ✅

#### API-B742
**Endpoint:** `GET /api/bookings/:id`
**Description:** Get booking details with HBLs, payments, driver
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Tables:** `bookings` + `booking_hbls` + `hbls` + `payments` + `slots`
**Issues:** None

#### API-B195
**Endpoint:** `POST /api/bookings`
**Description:** Create booking
**Schema Validation:** ✅ Supported
**UUID Note:** Returns UUID in response
**Required Fields:**
- `slot_id` ✅ (uuid after schema change)
- `slot_date` ✅
- `booked_by_company_id` ✅ (uuid after schema change)
- `booked_by_user_id` ✅ (uuid, nullable for P4TC)
- `driver_name`, `driver_licence_number`, `truck_rego` ✅
- `hbl_ids[]` ✅ (array of uuids)
- `terms_accepted_at` ✅
- `site_induction_completed` ✅
**Computed:**
- `booking_reference` (generated)
- Fees from `booking_hbls` + `pricing_zones`
**Issues:** None

#### API-B527
**Endpoint:** `POST /api/bookings/calculate-fees`
**Description:** Fee calculation before booking
**Schema Validation:** ✅ Supported
**Tables:** `hbls`, `pricing_zones`, `sites`
**Issues:**
- This is a utility endpoint, not CRUD
- **Consolidation:** Could be merged into `POST /api/bookings` as a `?preview=true` flag
- However, keeping it separate has UX benefits (no DB write)

**Recommendation:** ✅ Keep - useful for booking flow UX

#### API-B863
**Endpoint:** `PATCH /api/bookings/:id`
**Description:** Modify slot/driver/truck/HBLs
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** LSP (before cutoff) or ACFS (always)
**Updateable Fields:**
- `slot_id`, `slot_date` ✅
- `driver_name`, `driver_licence_number`, `driver_phone`, `truck_rego` ✅
- Add/remove HBLs via `booking_hbls` junction ✅
- `is_late_change`, `late_change_fee` ✅ (computed based on cutoff)
**Issues:**
- Complex business logic for cutoff validation (BR-015)
- Need to recalculate fees when HBLs change

#### API-B409
**Endpoint:** `POST /api/bookings/:id/cancel`
**Description:** Cancel booking
**Schema Validation:** ⚠️ Suboptimal
**UUID Note:** `:id` should use UUID
**Issues:**
- Cancellation is a state change: `status = 'cancelled'`
- Should use `PATCH /api/bookings/:id` with `{ status: 'cancelled', cancellation_reason: '...' }`
- However, having dedicated cancel endpoint makes intent clearer

**Recommendation:** ⚠️ Borderline - could merge into PATCH but keeping separate is acceptable for clarity

#### API-B591
**Endpoint:** `GET /api/bookings/search`
**Description:** Search by booking ref, truck, driver, HBL
**Schema Validation:** ⚠️ Partial
**Issues:**
- Indexes exist for `booking_reference`, `truck_rego`, `driver_licence_number` ✅
- Search by HBL requires join to `booking_hbls` ✅
- **Consolidation:** Merge into `GET /api/bookings` with `?q=` param

**Recommendation:** ❌ Remove - merge into API-B381 with query param

**Current Total:** 7 endpoints
**Recommended:** 6 endpoints (remove API-B591)

---

### 3. Slots (6 endpoints)

#### API-S472
**Endpoint:** `GET /api/slots`
**Description:** List slots (filter by site, date)
**Schema Validation:** ✅ Supported
**Tables:** `slots`, `sites`
**Parameters:**
- `site_id` (query) ✅
- `day_of_week` (query) ✅
- `is_active` (query) ✅
- `is_blocked` (query) ✅

#### API-S826
**Endpoint:** `GET /api/slots/available`
**Description:** Available slots for booking (excludes blocked, shows density)
**Schema Validation:** ✅ Supported
**Issues:**
- This requires complex query: join to `bookings` to count bookings per slot
- Compare against `heat_map_threshold` (soft limit, not hard)
- **Consolidation:** Could add `?available_only=true` to API-S472

**Recommendation:** ⚠️ Keep separate - complex business logic justifies dedicated endpoint

#### API-S139
**Endpoint:** `POST /api/slots`
**Description:** Create slot template (ACFS admin)
**Schema Validation:** ✅ Supported
**Auth:** ACFS admin only
**Required Fields:** All fields from `slots` table ✅
**Issues:** None

#### API-S604
**Endpoint:** `PATCH /api/slots/:id`
**Description:** Update slot configuration
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** ACFS admin only
**Issues:** None

#### API-S758
**Endpoint:** `DELETE /api/slots/:id`
**Description:** Delete slot
**Schema Validation:** ⚠️ Questionable
**Issues:**
- Hard delete is risky if bookings reference this slot
- Should be soft delete: `is_active = false`
- **Recommendation:** Change to `PATCH /api/slots/:id` with `{ is_active: false }`

**Recommendation:** ❌ Remove - use PATCH for soft delete

#### API-S203
**Endpoint:** `POST /api/slots/:id/block`
**Description:** Block slot for holiday
**Schema Validation:** ❌ Unnecessary
**Issues:**
- This is just setting `is_blocked = true`
- Should use `PATCH /api/slots/:id` with `{ is_blocked: true }`

**Recommendation:** ❌ Remove - use PATCH instead

**Current Total:** 6 endpoints
**Recommended:** 4 endpoints (remove API-S758, API-S203; keep available endpoint)

---

### 4. Delivery Orders (6 endpoints)

#### API-D394
**Endpoint:** `POST /api/delivery-orders`
**Description:** Upload DO
**Schema Validation:** ✅ Supported
**Tables:** `delivery_orders`, `hbls`, `hbl_custody_chain`
**Required Fields:**
- `hbl_id` ✅ (uuid)
- `custody_chain_id` ✅ (uuid, nullable)
- `issued_by_company_id` ✅ (uuid)
- `issued_to_company_id` ✅ (uuid)
- `do_number` ✅ (optional)
- `document_url` ✅ (file upload)
- `tier_level` ✅
**Issues:** None

#### API-D581
**Endpoint:** `GET /api/delivery-orders`
**Description:** List DOs (validation queue for ACFS)
**Schema Validation:** ✅ Supported
**Parameters:**
- `validation_status` (query) ✅
- `hbl_id` (query) ✅
- `issued_to_company_id` (query) ✅

#### API-D729
**Endpoint:** `GET /api/delivery-orders/:id`
**Description:** Get DO details
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Issues:** None

#### API-D148
**Endpoint:** `PATCH /api/delivery-orders/:id/validate`
**Description:** Validate DO (ACFS)
**Schema Validation:** ⚠️ Suboptimal
**UUID Note:** `:id` should use UUID
**Auth:** ACFS user/admin
**Issues:**
- This sets `validation_status = 'validated'` + `validated_by_user_id` + `validated_at`
- Could use `PATCH /api/delivery-orders/:id` with `{ validation_status: 'validated' }`
- However, validation has special business logic (triggers notifications)

**Recommendation:** ⚠️ Keep - validation is a significant business action

#### API-D827
**Endpoint:** `PATCH /api/delivery-orders/:id/flag`
**Description:** Flag DO as incorrect
**Schema Validation:** ⚠️ Suboptimal
**Issues:**
- This sets `validation_status = 'flagged'` + `invalidation_reason`
- **Consolidation:** Could merge with API-D148 into single `PATCH /api/delivery-orders/:id/validation` endpoint
- Body determines action: `{ validation_status: 'validated' | 'flagged', reason?: string }`

**Recommendation:** ⚠️ Consolidate API-D148 + API-D827 into single validation endpoint

#### API-D503
**Endpoint:** `DELETE /api/delivery-orders/:id`
**Description:** Delete DO
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** LSP who uploaded it, or ACFS
**Issues:** Hard delete acceptable here (user correction flow)

**Current Total:** 6 endpoints
**Recommended:** 5 endpoints (merge validate + flag into single endpoint)

---

### 5. Delegations (4 endpoints)

#### API-G417
**Endpoint:** `POST /api/delegations`
**Description:** Create delegation (LSP→LSP or LSP→P4TC)
**Schema Validation:** ✅ Supported
**Tables:** `delegations`, `delegation_hbls`, `hbl_custody_chain`
**Required Fields:**
- `delegator_company_id` ✅ (uuid)
- `delegation_method` ✅ (enum)
- `delegatee_company_id` ✅ (uuid, nullable for P4TC)
- `delegatee_email` ✅ (nullable, for P4TC)
- `hbl_ids[]` ✅ (array of uuids)
**Side Effects:**
- Creates entries in `delegation_hbls` junction
- Creates entries in `hbl_custody_chain` for audit
- Updates `hbl_status = 'delegated'` on HBLs (BR-004)
- Triggers email notification

#### API-G582
**Endpoint:** `GET /api/delegations`
**Description:** List delegations
**Schema Validation:** ✅ Supported
**Parameters:**
- `delegator_company_id` (query) ✅
- `delegatee_company_id` (query) ✅
- `status` (query) ✅

#### API-G749
**Endpoint:** `GET /api/delegations/:id`
**Description:** Get delegation details with HBLs
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Tables:** `delegations` + `delegation_hbls` + `hbls`

#### API-G261
**Endpoint:** `POST /api/delegations/:id/revoke`
**Description:** Revoke delegation (ACFS only per acfs:r13)
**Schema Validation:** ⚠️ Suboptimal
**UUID Note:** `:id` should use UUID
**Auth:** ACFS admin
**Issues:**
- This sets `status = 'revoked'` + `revoked_at` + `revoked_by_user_id`
- Updates HBLs: `hbl_status = 'assigned'` (revert to delegator)
- Could use `PATCH /api/delegations/:id` with `{ status: 'revoked' }`
- However, revocation has complex business logic (HBL state updates)

**Recommendation:** ⚠️ Keep - revocation is significant business action with side effects

**Current Total:** 4 endpoints
**Recommended:** 4 endpoints (keep all)

---

### 6. Parties/LSPs (2 endpoints)

#### API-P529
**Endpoint:** `GET /api/parties`
**Description:** List companies for delegation picker
**Schema Validation:** ✅ Supported
**Tables:** `companies`
**Parameters:**
- `company_type` (query) ✅
- `is_active` (query) ✅
- `search` (query) - searches `company_name` (no index)

**Issues:**
- No full-text index on `company_name` for search
- **Recommendation:** Add index on `company_name`

#### API-P834
**Endpoint:** `GET /api/parties/:id`
**Description:** Get company details
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Issues:** None

**Current Total:** 2 endpoints
**Recommended:** 2 endpoints (keep all)

---

### 7. Drivers (4 endpoints)

#### API-R648
**Endpoint:** `GET /api/drivers`
**Description:** List drivers (scoped to LSP company per BR-016)
**Schema Validation:** ✅ Supported
**Tables:** `driver_records`
**Auth:** LSP user (filtered by `company_id`)
**Parameters:**
- `company_id` (implicit from auth context) ✅
- `is_active` (query) ✅

#### API-R302
**Endpoint:** `POST /api/drivers`
**Description:** Add driver to company roster
**Schema Validation:** ✅ Supported
**Auth:** LSP user
**Required Fields:**
- `company_id` (from auth context) ✅
- `driver_name` ✅
- `driver_licence_number` ✅ (unique per company)
- `driver_phone` ✅ (optional)
- `default_truck_rego` ✅ (optional)
- `site_induction_completed` ✅

#### API-R715
**Endpoint:** `PATCH /api/drivers/:id`
**Description:** Update driver details
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** LSP user (must belong to same company)

#### API-R491
**Endpoint:** `DELETE /api/drivers/:id`
**Description:** Delete driver
**Schema Validation:** ⚠️ Questionable
**UUID Note:** `:id` should use UUID
**Issues:**
- Hard delete risky if `bookings` reference this driver (via denormalized fields)
- Should be soft delete: `is_active = false`

**Recommendation:** Change to soft delete via PATCH

**Current Total:** 4 endpoints
**Recommended:** 3 endpoints (remove DELETE, use PATCH for soft delete)

---

### 8. Users (5 endpoints)

#### API-U537
**Endpoint:** `GET /api/users`
**Description:** List users (ACFS admin only)
**Schema Validation:** ✅ Supported
**Tables:** `users`, `companies`
**Auth:** ACFS admin
**Parameters:**
- `role` (query) ✅
- `company_id` (query) ✅
- `is_active` (query) ✅

#### API-U829
**Endpoint:** `POST /api/users`
**Description:** Create user (ACFS admin for LSP users)
**Schema Validation:** ✅ Supported
**Auth:** ACFS admin
**Required Fields:**
- `company_id` ✅ (nullable for ACFS users)
- `first_name`, `last_name`, `email` ✅
- `role` ✅ (enum)
- `okta_id` ✅ (nullable, for ACFS SSO users)
**Side Effects:**
- For LSP users, creates entry in `user_invitations` with 72hr token
- Sends invitation email via `email_notifications`

#### API-U164
**Endpoint:** `PATCH /api/users/:id`
**Description:** Update user
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** ACFS admin
**Updateable Fields:**
- `first_name`, `last_name`, `email` ✅
- `role` ✅
- `is_active` ✅
- `company_id` ✅

#### API-U726
**Endpoint:** `DELETE /api/users/:id`
**Description:** Soft-delete user
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Auth:** ACFS admin
**Issues:**
- Soft delete: sets `is_active = false` + `archived_at`
- Could use `PATCH /api/users/:id` with `{ is_active: false }`
- However, DELETE semantic clearer for deactivation

**Recommendation:** Keep - DELETE semantically appropriate for user removal

#### API-U493
**Endpoint:** `POST /api/users/:id/reactivate`
**Description:** Reactivate soft-deleted user
**Schema Validation:** ⚠️ Suboptimal
**UUID Note:** `:id` should use UUID
**Auth:** ACFS admin
**Issues:**
- Sets `is_active = true` + `archived_at = null`
- Could use `PATCH /api/users/:id` with `{ is_active: true }`

**Recommendation:** ❌ Remove - use PATCH instead

**Current Total:** 5 endpoints
**Recommended:** 4 endpoints (remove reactivate, use PATCH)

---

### 9. Sites (1 endpoint)

#### API-I918
**Endpoint:** `GET /api/sites`
**Description:** List all ACFS sites
**Schema Validation:** ✅ Supported
**Tables:** `sites`
**Parameters:**
- `state` (query) ✅
- `is_active` (query) ✅

**Issues:**
- No POST/PATCH/DELETE endpoints for site management
- Sites are DB-seeded per constraint C-003 ("DB-seeded sites")
- **Missing:** ACFS admin may need to update site details

**Recommendation:** Add `PATCH /api/sites/:id` for ACFS admin

**Current Total:** 1 endpoint
**Recommended:** 2 endpoints (add PATCH for admin)

---

### 10. Auth (3 endpoints)

#### API-A472
**Endpoint:** `POST /api/auth/login`
**Description:** Login (username/password for LSP, SSO for ACFS)
**Schema Validation:** ✅ Supported
**Tables:** `users`, `companies`
**Issues:**
- Needs to handle two auth flows: email/password vs Okta SSO
- Returns JWT token with user context

#### API-A638
**Endpoint:** `POST /api/auth/logout`
**Description:** Logout (invalidate session)
**Schema Validation:** ✅ Supported
**Issues:** Session/token management (not schema-related)

#### API-A925
**Endpoint:** `GET /api/auth/session`
**Description:** Get current session/user context
**Schema Validation:** ✅ Supported
**Tables:** `users`, `companies`
**Issues:** None

**Current Total:** 3 endpoints
**Recommended:** 3 endpoints (keep all)

---

### 11. Payments (3 endpoints)

#### API-Y571
**Endpoint:** `POST /api/payments/create-intent`
**Description:** Create Stripe/Compay payment intent
**Schema Validation:** ✅ Supported
**Tables:** `payments`, `bookings`
**Required Fields:**
- `booking_id` ✅ (uuid)
- `amount_excl_gst`, `gst_amount`, `total_amount` ✅ (from booking)
**Side Effects:**
- Creates entry in `payments` with `status = 'pending'`
- Returns payment gateway intent ID for client-side confirmation

#### API-Y824
**Endpoint:** `POST /api/payments/:id/confirm`
**Description:** Confirm payment after gateway success
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Side Effects:**
- Updates `payments.status = 'completed'`
- Updates `bookings.status = 'booked'`
- Sends booking confirmation email

#### API-Y309
**Endpoint:** `GET /api/payments/:id/status`
**Description:** Check payment status
**Schema Validation:** ✅ Supported
**UUID Note:** `:id` should use UUID
**Issues:**
- Polls payment gateway for status
- Returns `payment_status` enum

**Current Total:** 3 endpoints
**Recommended:** 3 endpoints (keep all)

---

### 12. P4TC (2 endpoints - DEFERRED)

#### API-T647
**Endpoint:** `POST /api/p4tc/verify-otp`
**Description:** Verify magic link OTP for P4TC access
**Schema Validation:** ⚠️ Phase 1 deferred
**Tables:** `email_notifications` (otp_code, secure_link_token)
**Status:** Deferred to fast follow per BRD v1.5

#### API-T392
**Endpoint:** `GET /api/p4tc/session`
**Description:** Get P4TC session scope (assigned HBLs only)
**Schema Validation:** ⚠️ Phase 1 deferred
**Tables:** `delegations`, `delegation_hbls`
**Status:** Deferred to fast follow per BRD v1.5

**Current Total:** 2 endpoints
**Recommended:** 0 endpoints for Phase 1 (deferred)

---

### 13. Stats/Dashboard (3 endpoints)

#### API-X482
**Endpoint:** `GET /api/stats/hbls`
**Description:** HBL counts by status, milestone, site
**Schema Validation:** ✅ Supported
**Tables:** `hbls`
**Query:** Aggregates with `GROUP BY`
**Auth:** Scoped by user role (LSP sees only assigned HBLs, ACFS sees all)

#### API-X719
**Endpoint:** `GET /api/stats/bookings`
**Description:** Booking counts by status, upcoming slots
**Schema Validation:** ✅ Supported
**Tables:** `bookings`, `slots`
**Query:** Aggregates with `GROUP BY`

#### API-X156
**Endpoint:** `GET /api/stats/do-queue`
**Description:** DO validation queue stats (pending count, aging)
**Schema Validation:** ✅ Supported
**Tables:** `delivery_orders`
**Auth:** ACFS only

**Issues:**
- **Consolidation:** All three are stats/aggregation queries
- Could combine into single `GET /api/stats` with `?type=hbls|bookings|do_queue`
- However, each has different auth/scope requirements

**Recommendation:** ⚠️ Consider consolidation, but separate endpoints clearer

**Current Total:** 3 endpoints
**Recommended:** 3 endpoints (keep separate for clarity) OR 1 consolidated endpoint

---

## Missing Endpoints

### Containers (NEW)

**Missing:** No endpoints for `containers` table
**Justification:** Container tracking may be needed for:
- ACFS staff viewing container status
- Filtering HBLs by container
- Container unpacking workflow

**Recommendation:** Add 2 endpoints:
- `GET /api/containers` - list containers with status filter
- `PATCH /api/containers/:id` - update container status (ACFS)

### HBL Custody Chain (Audit Trail)

**Partially Covered:** `GET /api/hbls/:id/audit-trail` exists (API-H672)
**Status:** ✅ Adequate - full audit trail accessible via HBL endpoint

### Pricing Zones (NEW)

**Missing:** No endpoints for `pricing_zones` configuration
**Justification:** ACFS admin needs to configure rates per site

**Recommendation:** Add 4 endpoints:
- `GET /api/pricing-zones` - list pricing zones
- `POST /api/pricing-zones` - create pricing zone (ACFS admin)
- `PATCH /api/pricing-zones/:id` - update rate (ACFS admin)
- `DELETE /api/pricing-zones/:id` - deactivate zone (ACFS admin)

### Email Notifications (Audit)

**Missing:** No read endpoints for `email_notifications` table
**Justification:** ACFS admin may need to troubleshoot notification delivery

**Recommendation:** Add 1 endpoint:
- `GET /api/notifications` - list email notifications (ACFS admin, audit only)

---

## Consolidation Summary

### Endpoints to Remove (17 deletions)

1. ❌ API-H047 - `GET /api/hbls/search` → merge into API-H729 with `?q=` param
2. ❌ API-H931 - `POST /api/hbls/:id/flag-under-bond` → use PATCH
3. ❌ API-B591 - `GET /api/bookings/search` → merge into API-B381 with `?q=` param
4. ❌ API-S758 - `DELETE /api/slots/:id` → use PATCH with `is_active=false`
5. ❌ API-S203 - `POST /api/slots/:id/block` → use PATCH with `is_blocked=true`
6. ❌ API-D827 - `PATCH /api/delivery-orders/:id/flag` → merge with API-D148
7. ❌ API-R491 - `DELETE /api/drivers/:id` → use PATCH with `is_active=false`
8. ❌ API-U493 - `POST /api/users/:id/reactivate` → use PATCH with `is_active=true`
9. ❌ API-T647 - `POST /api/p4tc/verify-otp` → Phase 1 deferred
10. ❌ API-T392 - `GET /api/p4tc/session` → Phase 1 deferred

**Subtotal Removed:** 10 endpoints

### Endpoints to Add (8 additions)

1. ✅ `PATCH /api/sites/:id` - update site details (ACFS admin)
2. ✅ `GET /api/containers` - list containers
3. ✅ `PATCH /api/containers/:id` - update container status
4. ✅ `GET /api/pricing-zones` - list pricing zones
5. ✅ `POST /api/pricing-zones` - create pricing zone
6. ✅ `PATCH /api/pricing-zones/:id` - update pricing zone
7. ✅ `DELETE /api/pricing-zones/:id` - deactivate pricing zone (soft delete)
8. ✅ `GET /api/notifications` - list email notifications (audit)

**Subtotal Added:** 8 endpoints

### Revised Total

**Original:** 52 endpoints
**Removed:** -10
**Added:** +8
**New Total:** **50 endpoints**

**Further consolidation possible:**
- Merge 3 stats endpoints → 1: -2 endpoints
- Final count: **48 endpoints**

---

## Schema Changes Required

### 1. Replace `int` with `uuid` for all primary keys

**Current:**
```sql
id int [pk, increment]
```

**Required:**
```sql
id uuid [pk, default: `gen_random_uuid()`]
```

**Affected Tables:** All 17 tables

**Migration Impact:**
- All foreign keys must change to `uuid` type
- Indexes remain valid (UUIDs are indexable)
- Slightly larger storage (16 bytes vs 4 bytes per ID)
- **Security:** Prevents enumeration attacks per Ranjith's requirement

### 2. Add full-text search indexes

**Required for:**
- `companies.company_name` (for party search)
- Consider: `hbls.hbl_number`, `bookings.booking_reference` (if search performance issues)

### 3. Verify foreign key constraints

All relationships defined in schema lines 837-890 must remain valid with UUID migration.

---

## REST API Design Principles Applied

### ✅ Good Patterns

1. **Resource-oriented URLs:** `/api/hbls`, `/api/bookings`
2. **HTTP verbs match operations:** GET (read), POST (create), PATCH (update), DELETE (remove)
3. **Nested resources for tight coupling:** `/api/hbls/:id/audit-trail`
4. **Query params for filtering:** `?status=booked&site_id=uuid`
5. **Pagination support:** `?page=1&limit=50`
6. **UUID identifiers:** Non-sequential, secure (after schema migration)

### ⚠️ Anti-Patterns to Fix

1. **Action endpoints instead of state updates:**
   - `POST /api/hbls/:id/flag-under-bond` → `PATCH /api/hbls/:id { under_bond: true }`
   - `POST /api/slots/:id/block` → `PATCH /api/slots/:id { is_blocked: true }`

2. **Separate search endpoints:**
   - `GET /api/hbls/search?q=` → `GET /api/hbls?q=`
   - `GET /api/bookings/search?q=` → `GET /api/bookings?q=`

3. **Hard deletes where soft delete appropriate:**
   - `DELETE /api/slots/:id` → `PATCH /api/slots/:id { is_active: false }`
   - `DELETE /api/drivers/:id` → `PATCH /api/drivers/:id { is_active: false }`

### ✅ Justified Special Endpoints

Some action-specific endpoints are acceptable when they:
- Trigger complex business logic
- Have significant side effects
- Represent domain-specific operations

**Examples:**
- `POST /api/bookings/:id/cancel` - clearer than PATCH for cancellation flow
- `POST /api/delegations/:id/revoke` - complex HBL state rollback logic
- `POST /api/payments/:id/confirm` - payment gateway integration
- `PATCH /api/delivery-orders/:id/validate` - validation triggers notifications

---

## Implementation Checklist

### Before Starting

- [ ] **CRITICAL:** Update schema to use UUIDs for all primary keys
- [ ] Add full-text search indexes to `companies.company_name`
- [ ] Verify all foreign key relationships after UUID migration
- [ ] Set up database migration scripts

### Phase 1 Priority

**Core booking flow (high priority):**
- [ ] HBL endpoints (4)
- [ ] Booking endpoints (6)
- [ ] Delivery Order endpoints (5)
- [ ] Payment endpoints (3)
- [ ] Slot availability endpoint (1)
- [ ] Driver endpoints (3)
- [ ] Auth endpoints (3)

**Admin features (medium priority):**
- [ ] User management (4)
- [ ] Slot configuration (4)
- [ ] Pricing zones (4)
- [ ] Site management (2)

**Audit/reporting (lower priority):**
- [ ] Stats/dashboard (3)
- [ ] Notification audit (1)
- [ ] Container tracking (2)

### Deferred to Fast Follow

- [ ] P4TC endpoints (2) - magic link + OTP auth

---

## Recommendations

### For Team Discussion

1. **UUID Migration:** Schedule schema refactor before any API implementation
2. **API Count:** Consolidate to 48 endpoints (down from 52)
3. **Phase 1 Scope:** Focus on 25 core endpoints, defer admin features if timeline tight
4. **P4TC:** Confirm deferred to fast follow (removes 2 endpoints from Phase 1)
5. **Stats Consolidation:** Consider single `/api/stats?type=` endpoint vs 3 separate

### For Documentation Page

- Use non-sequential reference IDs (API-H729, etc.) for discussion
- Note UUID requirement prominently in each endpoint spec
- Mark Phase 1 vs deferred endpoints clearly
- Include consolidation analysis showing 52 → 48 reduction

---

**Validation Complete**
**Next Step:** Update design spec with validated endpoint list and create implementation plan
