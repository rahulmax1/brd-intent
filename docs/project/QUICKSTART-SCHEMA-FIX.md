# Schema Fix Quick Start

**Current Status:** Schema v1.1 deployed to production (2026-03-26)
**Latest Changes:** Added `import_ref` field for Maximus integration

## What You Have

Since you have **no production data** (only dummy data), we can fix everything cleanly with a fresh schema.

## Files Created

1. **`src/data/acfs-production-schema-v1.1-FIXED.dbml`**
   - Fixed DBML schema (for documentation & dbdiagram.io)
   - All 6 critical issues resolved
   - Ready to use as your schema source of truth

2. **`migrations/001-production-schema-v1.1-FIXED.sql`**
   - Complete PostgreSQL schema creation script
   - Includes all tables, constraints, triggers
   - Run this to recreate your database

3. **`schema-fix-strategy.md`**
   - Detailed implementation guide
   - Code examples for application layer validation
   - Background job implementations

4. **`schema-review.md`**
   - Original analysis of issues
   - Complete breakdown of what was wrong

## ✅ What Was Fixed

### Critical Issues ✅
1. **BR-004 (Delegate XOR Book)** → PostgreSQL trigger prevents violations
2. **BR-001 (Booking Readiness)** → Application validation (see strategy doc)
3. **Derived Fields Consistency** → Generated columns, removed redundant fields
4. **GST Calculation Constraints** → Check constraints with ±1¢ tolerance
5. **Cutoff Override Tracking** → New audit columns on bookings table
6. **BR-028 (Collected Status)** → Background job (see strategy doc)

### Bonus Improvements ✅
- **Entity audit trail** → New `entity_audit_log` table
- **Optimistic locking** → Version columns on bookings, slots, hbls
- **Email retry** → Retry mechanism on notifications
- **Type safety** → Enums for payment_gateway, entity_type
- **Soft-delete consistency** → archived_at on companies, driver_records
- **Upload tracking** → uploaded_by_user_id on delivery_orders

## 🚀 How to Apply

### Option 1: Fresh Database (Recommended - No Production Data)

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS vbs_portal;"
psql -U postgres -c "CREATE DATABASE vbs_portal;"

# Run the fixed schema
psql -U postgres -d vbs_portal -f migrations/001-production-schema-v1.1-FIXED.sql

# Verify
psql -U postgres -d vbs_portal -c "\dt"
```

**Success message:**
```
✅ ACFS VBS Portal Schema v1.1 FIXED created successfully
   - All critical fixes applied
   - BR-004 trigger active
   - GST constraints enforced
   - Generated columns created
   - Audit trail ready
```

### Option 2: Keep Existing Database, Just Check Differences

```bash
# Export current schema
pg_dump -U postgres -d vbs_portal --schema-only > current-schema.sql

# Compare with fixed version
diff current-schema.sql migrations/001-production-schema-v1.1-FIXED.sql
```

## 📋 Next Steps

### 1. Update Your ORM/Schema Tool

If using **Prisma**:
```bash
# Introspect the new database
npx prisma db pull

# Generate Prisma Client
npx prisma generate
```

If using **Drizzle**:
```bash
# Introspect
npx drizzle-kit introspect:pg

# Generate
npx drizzle-kit generate:pg
```

### 2. Implement Application Validation

Add these service layer validations (code in `schema-fix-strategy.md`):

```typescript
// lib/services/booking-readiness.ts
export async function checkBookingReadiness(hblIds: number[]) {
  // Check milestone, customs, DOs
  // Returns detailed errors for UI
}

// lib/services/booking-service.ts
export async function createBooking(data: CreateBookingInput) {
  // Validate readiness first
  const readiness = await checkBookingReadiness(data.hblIds)

  if (!readiness.isReady) {
    throw new BookingNotReadyError(readiness.errors)
  }

  // Use transaction with row locking
  return await db.$transaction(async (tx) => {
    // Create booking
  })
}
```

### 3. Set Up Background Job

For BR-028 (auto-update collected status):

```typescript
// lib/jobs/update-booking-collected-status.ts
import { CronJob } from 'cron'

export const updateBookingCollectedStatusJob = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    // Find bookings in 'processed' with all HBLs collected
    // Update status to 'collected'
  }
)

// Start in your server
updateBookingCollectedStatusJob.start()
```

Full implementation in `schema-fix-strategy.md`.

### 4. Add Helper Functions

```typescript
// lib/utils/hbl.ts
export function calculateChargeableWeight(hbl: HBL): number {
  return Math.max(hbl.weight_kg || 0, hbl.volume_m3 || 0)
}

export function isStorageFeeApplicable(hbl: HBL): boolean {
  if (!hbl.last_free_storage_date) return false
  return new Date() > new Date(hbl.last_free_storage_date)
}

// lib/utils/gst.ts
export const GST_RATE = 0.10

export function calculateGST(amountExclGst: number) {
  const gstAmount = Math.round(amountExclGst * GST_RATE * 100) / 100
  const totalInclGst = Math.round((amountExclGst + gstAmount) * 100) / 100

  return { amountExclGst, gstAmount, totalInclGst }
}
```

### 5. Update Seed Data

```bash
# Re-run your seed scripts with the new schema
pnpm db:seed
# or
npm run db:seed
```

## 🧪 Testing

### 1. Test BR-004 Trigger

```sql
-- This should fail with BR-004 error:
INSERT INTO hbls (hbl_number, hbl_status, ...) VALUES ('TEST-001', 'delegated', ...);
INSERT INTO booking_hbls (hbl_id, booking_id) VALUES (1, 1);
-- Expected: ERROR: BR-004: Cannot book delegated HBL

-- This should fail too:
INSERT INTO hbls (hbl_number, hbl_status, ...) VALUES ('TEST-002', 'booked', ...);
INSERT INTO delegation_hbls (hbl_id, delegation_id) VALUES (2, 1);
-- Expected: ERROR: BR-004: Cannot delegate booked HBL
```

### 2. Test GST Constraints

```sql
-- This should fail:
INSERT INTO bookings (
  total_fee_excl_gst, gst_amount, total_fee_incl_gst, ...
) VALUES (
  100, 9, 109  -- Wrong! GST should be 10
);
-- Expected: ERROR: constraint "chk_bookings_gst_calculation" violated
```

### 3. Test Generated Column

```sql
-- Insert HBL with free_release
INSERT INTO hbls (
  hbl_number, release_type, under_bond, ...
) VALUES (
  'TEST-003', 'free_release', false, ...
);

-- Check do_waived - should be true automatically
SELECT hbl_number, release_type, under_bond, do_waived
FROM hbls WHERE hbl_number = 'TEST-003';
-- Expected: do_waived = true (automatically)
```

## 📊 Schema Comparison

| Aspect | v1.0 (Old) | v1.1 FIXED (New) |
|--------|------------|------------------|
| **BR-004 Enforcement** | ❌ None | ✅ Trigger |
| **GST Validation** | ❌ None | ✅ Check constraints |
| **Derived Fields** | ⚠️ Stored (inconsistent) | ✅ Generated/computed |
| **Audit Trail** | ⚠️ Partial | ✅ Complete |
| **Override Tracking** | ❌ None | ✅ Full audit |
| **Optimistic Locking** | ❌ None | ✅ Version columns |
| **Type Safety** | ⚠️ Varchar enums | ✅ Real enums |
| **Email Retry** | ❌ None | ✅ Built-in |

## 🎯 Production Readiness Checklist

- [ ] Database recreated with v1.1 schema
- [ ] ORM/schema tool updated
- [ ] Booking readiness validation implemented
- [ ] Background job for collected status running
- [ ] Helper functions added (chargeable weight, GST)
- [ ] Seed data recreated
- [ ] BR-004 trigger tested
- [ ] GST constraints tested
- [ ] Generated columns tested
- [ ] Team reviewed changes
- [ ] Documentation updated

## ⚠️ Important Notes

### What Changed on Tables

#### `hbls` table:
- **REMOVED**: `chargeable_weight` → compute as `max(weight_kg, volume_m3)`
- **REMOVED**: `storage_fee_applicable` → compute as `current_date > last_free_storage_date`
- **CHANGED**: `do_waived` → now GENERATED column (always consistent)
- **ADDED**: `last_edited_by_user_id` → audit trail
- **ADDED**: `version` → optimistic locking

#### `bookings` table:
- **ADDED**: `cutoff_override_by_user_id` → who approved override
- **ADDED**: `cutoff_override_reason` → why override granted
- **ADDED**: `cutoff_override_at` → when override happened
- **ADDED**: `version` → optimistic locking
- **ADDED**: Check constraints on GST calculations

#### `payments` table:
- **CHANGED**: `payment_gateway` → now enum (was varchar)
- **ADDED**: Check constraints on GST calculations

#### `email_notifications` table:
- **CHANGED**: `related_entity_type` → now enum (was varchar)
- **ADDED**: `retry_count`, `next_retry_at`, `max_retries` → retry logic

#### New tables:
- **`entity_audit_log`** → comprehensive audit trail

### Migration Safety

✅ **SAFE** because:
- No production data exists
- Only dummy data will be lost
- Can recreate seed data easily
- No backwards compatibility needed

🚫 **DO NOT** use ALTER migration approach - just recreate fresh.

## 🆘 Troubleshooting

### Error: relation already exists

You're trying to run on existing database. Use Option 1 above (DROP DATABASE first).

### Error: type already exists

You have partial schema. Run:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
Then run the migration again.

### Generated column not working

Check PostgreSQL version:
```sql
SELECT version();
-- Need PostgreSQL 12+ for GENERATED columns
```

### Trigger not firing

Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%br004%';
```

## 📚 Additional Resources

- **Full implementation guide**: `schema-fix-strategy.md`
- **Original analysis**: `schema-review.md`
- **Fixed DBML**: `src/data/acfs-production-schema-v1.1-FIXED.dbml`
- **SQL migration**: `migrations/001-production-schema-v1.1-FIXED.sql`

---

**Ready to go!** 🚀

Questions? Check the strategy doc for code examples.
