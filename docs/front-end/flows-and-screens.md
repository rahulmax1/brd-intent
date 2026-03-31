# VBS Portal — Flows & Screens (Front-end Only)

> Derived from the intent model. This is a front-end build list — no backend, APIs, or persistence. All data is mocked.

---

## WFF / LSP (Warehouse Freight Forwarder)

| # | Flow / Screen | Status |
|---|--------------|--------|
| 1 | **Login** (username + password) | Not built |
| 2 | **Dashboard** — view assigned HBLs with status, milestone, payment, delegation, booking info | Done |
| 3 | **Delegate shipments** — select HBLs → choose existing LSP or one-off P4TC email → send | Done (UI only) |
| 4 | **Book pickup** — select HBLs → validate readiness → load calc + pricing → pick slot → truck/driver → T&Cs + induction → payment → confirmation | Done (UI only) |
| 5 | **View/Edit booking** — view details, modify truck/driver anytime, modify slot/HBLs before cutoff | Partial (view done, edit logic missing) |
| 6 | **Cancel booking** | Not built |
| 7 | **Upload Delivery Order** per HBL | Drop zone exists, no upload logic |
| 8 | **Flag HBL as under-bond** | Not built |
| 9 | **Request missing docs** (aborts booking flow) | Not built |

---

## P4TC (Party to Collect)

| # | Flow / Screen | Status |
|---|--------------|--------|
| 10 | **Magic link + OTP access** (no login page, link from email) | Not built |
| 11 | **View delegated HBLs** (scoped roster, no history) | Not built |
| 12 | **Delegate further** to another P4TC | Not built |
| 13 | **Book pickup** (same steps as LSP but fresh driver details each time, no saved drivers) | Not built |
| 14 | **Upload missing DO / contact ACFS** | Not built |

---

## ACFS Internal (Admin + User)

| # | Flow / Screen | Status |
|---|--------------|--------|
| 15 | **SSO login** (OAuth/Okta) | Not built |
| 16 | **Slot configuration** — select site → days/times → booking & change cutoffs → heat map threshold → block holidays | Not built |
| 17 | **Manage bookings** — search, view, update, override cutoffs | Not built |
| 18 | **DO validation** — view unvalidated DOs (HBL-centric) → review → validate or flag | Not built |
| 19 | **Pickup verification** — search booking → view details + DO status + audit → validate/reject → mark "processed" | Not built |
| 20 | **User management** — create/update/archive LSP and ACFS users, welcome email | Not built |
| 21 | **Manual HBL assignment** (remedial, for failed auto-assignment) | Not built |
| 22 | **ECST assignment** | Not built |
| 23 | **Override missing DO requirement** (Admin only, audit trail) | Not built |
| 24 | **FOC rebooking for no-shows** (Admin only, reason required) | Not built |
| 25 | **Partially process bookings** (clear HBLs proceed, blocked ones rebook) | Not built |
| 26 | **Edit HBL details/milestones manually** | Not built |
| 27 | **Edit/revoke delegation** between parties | Not built |
| 28 | **Cancel any booking** (with reason + notification) | Not built |

---

## Gatehouse

| # | Flow / Screen | Status |
|---|--------------|--------|
| 29 | **SSO login** | Not built |
| 30 | **Verify arrival** — search booking ref → check driver identity + truck rego | Not built |
| 31 | **Confirm exit** — mark booking as "collected" | Not built |

---

## Shared / Cross-cutting

| # | Screen | Status |
|---|--------|--------|
| 32 | **Bookings list page** (`/bookings`) | Not built |
| 33 | **Notifications page** | Not built |
| 34 | **Payment flow** (Stripe/Compay redirect + confirmation) | Not built |

---

## Notes

- **34 flows/screens total.** 4 are built (WFF dashboard, delegate wizard, booking wizard, booking detail view) — UI only with mock data.
- Driver actor has **no portal access** — excluded from this list.
- P4TC flows mirror LSP booking but with magic link auth, no saved drivers, no persistent account.
- ACFS Admin vs User distinction: items 23, 24 are Admin-only; rest shared.
- Slot heat map (item 16) is nice-to-have for Phase 1.
- Items 21 (manual HBL assignment) and 22 (ECST assignment) are low priority / optional Phase 1.
