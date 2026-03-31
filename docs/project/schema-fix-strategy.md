# Schema Fix Strategy: ACFS VBS Portal
**Date:** 2026-03-26
**Current Schema Version:** v1.1
**Last Updated:** 2026-03-26 (Post-deployment)
**Approach:** Database constraints + Application validation (defense in depth)

## Philosophy

**Use database constraints for:**
- Immutable business rules (BR-004: delegate XOR book)
- Data integrity (GST calculations, non-negative amounts)
- Referential integrity (foreign keys)

**Use application logic for:**
- Complex validation with good error messages (BR-001: booking readiness)
- Derived status updates (BR-028: collected status)
- Business workflows

**Why both?** Database prevents bad data even if app has bugs. Application provides good UX.

---

## 🎯 Recommended Fix Approach

### Phase 1: Database Schema Changes (Week 1)
Add missing columns, constraints, and generated columns.
Safe to run on empty database before launch.

### Phase 2: Application Validation Layer (Week 1-2)
Implement Zod schemas and service layer validations.
Provides user-friendly error messages.

### Phase 3: Automated Status Updates (Week 2)
Background jobs or database triggers for derived statuses.
BR-028 collected status automation.

---

## 📋 Implementation Plan

## Critical Fix #1: BR-004 Delegate XOR Book

### Recommended Approach: Application Layer with DB Enum Protection

**Why?** Database triggers on junction tables are fragile. Better to validate before insert.

### Implementation:

#### 1a. Add application validation (Zod schema)
```typescript
// lib/validations/booking.ts
import { z } from 'zod'

export const createBookingSchema = z.object({
  hblIds: z.array(z.number()).min(1),
  slotId: z.number(),
  // ... other fields
}).refine(
  async (data) => {
    // Check no HBLs are delegated
    const delegatedHbls = await db.hbls.findMany({
      where: {
        id: { in: data.hblIds },
        hbl_status: 'delegated'
      },
      select: { id: true, hbl_number: true }
    })

    return delegatedHbls.length === 0
  },
  {
    message: 'BR-004: Cannot book delegated HBLs',
    path: ['hblIds']
  }
)

export const createDelegationSchema = z.object({
  hblIds: z.array(z.number()).min(1),
  // ... other fields
}).refine(
  async (data) => {
    // Check no HBLs are booked
    const bookedHbls = await db.hbls.findMany({
      where: {
        id: { in: data.hblIds },
        hbl_status: 'booked'
      },
      select: { id: true, hbl_number: true }
    })

    return bookedHbls.length === 0
  },
  {
    message: 'BR-004: Cannot delegate booked HBLs',
    path: ['hblIds']
  }
)
```

#### 1b. Enforce in service layer
```typescript
// lib/services/booking-service.ts
export class BookingService {
  async createBooking(data: CreateBookingInput) {
    // Validate input
    const validated = await createBookingSchema.parseAsync(data)

    // Use transaction to prevent race conditions
    return await db.$transaction(async (tx) => {
      // Lock HBLs for update
      const hbls = await tx.hbls.findMany({
        where: { id: { in: validated.hblIds } },
        // SELECT ... FOR UPDATE prevents concurrent modifications
      })

      // Final check within transaction
      const delegatedHbls = hbls.filter(h => h.hbl_status === 'delegated')
      if (delegatedHbls.length > 0) {
        throw new BusinessRuleError(
          'BR-004',
          `Cannot book delegated HBLs: ${delegatedHbls.map(h => h.hbl_number).join(', ')}`
        )
      }

      // Create booking
      const booking = await tx.bookings.create({ data: bookingData })

      // Update HBL status atomically
      await tx.hbls.updateMany({
        where: { id: { in: validated.hblIds } },
        data: { hbl_status: 'booked' }
      })

      return booking
    })
  }
}
```

#### 1c. Database safety net (PostgreSQL)
```sql
-- Add check constraint to prevent status violations
-- This catches bugs in application code

CREATE OR REPLACE FUNCTION check_hbl_booking_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent booking delegated HBL
  IF TG_TABLE_NAME = 'booking_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'delegated'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot book delegated HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  -- Prevent delegating booked HBL
  IF TG_TABLE_NAME = 'delegation_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'booked'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot delegate booked HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_hbls_br004
  BEFORE INSERT ON booking_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();

CREATE TRIGGER trg_delegation_hbls_br004
  BEFORE INSERT ON delegation_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();
```

**Status:** ✅ Application validation + DB trigger safety net

---

## Critical Fix #2: BR-001 Booking Readiness

### Recommended Approach: Application Layer Only

**Why?** Complex multi-table validation. Better UX with detailed error messages.

### Implementation:

```typescript
// lib/services/booking-readiness.ts
export interface BookingReadinessCheck {
  isReady: boolean
  errors: BookingReadinessError[]
}

export interface BookingReadinessError {
  hblId: number
  hblNumber: string
  rule: 'BR-001'
  reason: 'milestone' | 'customs' | 'delivery_order'
  message: string
}

export async function checkBookingReadiness(
  hblIds: number[]
): Promise<BookingReadinessCheck> {
  const errors: BookingReadinessError[] = []

  // Fetch HBLs with related data
  const hbls = await db.hbls.findMany({
    where: { id: { in: hblIds } },
    include: {
      delivery_orders: {
        where: {
          validation_status: { notIn: ['validated', 'not_required'] }
        }
      }
    }
  })

  for (const hbl of hbls) {
    // Check milestone
    if (!['unpacked', 'collected'].includes(hbl.milestone)) {
      errors.push({
        hblId: hbl.id,
        hblNumber: hbl.hbl_number,
        rule: 'BR-001',
        reason: 'milestone',
        message: `HBL ${hbl.hbl_number} must be unpacked (currently: ${hbl.milestone})`
      })
    }

    // Check customs clearance
    if (hbl.customs_status !== 'fully_cleared') {
      errors.push({
        hblId: hbl.id,
        hblNumber: hbl.hbl_number,
        rule: 'BR-001',
        reason: 'customs',
        message: `HBL ${hbl.hbl_number} must be fully cleared (currently: ${hbl.customs_status})`
      })
    }

    // Check delivery orders
    if (!hbl.do_waived && hbl.delivery_orders.length > 0) {
      errors.push({
        hblId: hbl.id,
        hblNumber: hbl.hbl_number,
        rule: 'BR-001',
        reason: 'delivery_order',
        message: `HBL ${hbl.hbl_number} has ${hbl.delivery_orders.length} unvalidated delivery order(s)`
      })
    }
  }

  return {
    isReady: errors.length === 0,
    errors
  }
}

// Use in booking flow
export class BookingService {
  async createBooking(data: CreateBookingInput) {
    // Check readiness first
    const readiness = await checkBookingReadiness(data.hblIds)

    if (!readiness.isReady) {
      throw new BookingNotReadyError(readiness.errors)
    }

    // Proceed with booking...
  }
}
```

```typescript
// UI usage
// components/booking/hbl-selector.tsx
const { data: readiness } = useQuery({
  queryKey: ['booking-readiness', selectedHblIds],
  queryFn: () => checkBookingReadiness(selectedHblIds),
  enabled: selectedHblIds.length > 0
})

// Show inline warnings
{readiness?.errors.map(error => (
  <Alert key={error.hblId} variant="destructive">
    {error.message}
  </Alert>
))}

<Button
  disabled={!readiness?.isReady}
  onClick={handleBooking}
>
  {readiness?.isReady ? 'Proceed to Booking' : 'Cannot Book - Resolve Issues'}
</Button>
```

**Status:** ✅ Application validation with detailed error messages

---

## Critical Fix #3: Derived Fields Consistency

### Recommended Approach: Generated Columns + Remove Redundant Fields

#### 3a. Fix `chargeable_weight`

**Decision:** Remove from `hbls` table, keep only in `booking_hbls` as snapshot.

**Why?** Weight/volume can change over time. Only the value at booking time matters for fees.

```sql
-- Migration: Remove from hbls
ALTER TABLE hbls DROP COLUMN chargeable_weight;
```

```typescript
// Compute on demand in application
function calculateChargeableWeight(hbl: HBL): number {
  return Math.max(hbl.weight_kg, hbl.volume_m3)
}

// When displaying HBL list
const hblsWithChargeableWeight = hbls.map(hbl => ({
  ...hbl,
  chargeableWeight: calculateChargeableWeight(hbl)
}))

// When creating booking, snapshot to booking_hbls
await tx.booking_hbls.create({
  data: {
    booking_id: bookingId,
    hbl_id: hbl.id,
    chargeable_weight: calculateChargeableWeight(hbl), // Snapshot at booking time
    rate: currentRate,
    per_hbl_fee: calculateChargeableWeight(hbl) * currentRate
  }
})
```

#### 3b. Fix `do_waived` - Use Generated Column

```sql
-- PostgreSQL: Add generated column
ALTER TABLE hbls
  DROP COLUMN do_waived,
  ADD COLUMN do_waived boolean
    GENERATED ALWAYS AS (release_type = 'free_release' OR under_bond = true)
    STORED;
```

```typescript
// No application code needed - database handles it
// Just query normally:
const bookableHbls = await db.hbls.findMany({
  where: {
    milestone: { in: ['unpacked', 'collected'] },
    customs_status: 'fully_cleared',
    do_waived: true  // Automatically computed
  }
})
```

#### 3c. Fix `storage_fee_applicable` - Remove from DB

```sql
-- Migration: Remove column
ALTER TABLE hbls DROP COLUMN storage_fee_applicable;
```

```typescript
// Compute on read
function isStorageFeeApplicable(hbl: HBL): boolean {
  if (!hbl.last_free_storage_date) return false
  return new Date() > new Date(hbl.last_free_storage_date)
}

// Use in queries via application logic
const hblsWithStorageFees = hbls.map(hbl => ({
  ...hbl,
  storageFeeApplicable: isStorageFeeApplicable(hbl)
}))
```

**Status:** ✅ Generated columns + removed redundant fields

---

## Critical Fix #4: GST Calculation Constraints

### Recommended Approach: Check Constraints + Application Helper

```sql
-- Add constraints to bookings table
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_gst_calculation
    CHECK (
      -- Allow 1 cent rounding tolerance
      ABS(gst_amount - (total_fee_excl_gst * 0.10)) < 0.01
      AND ABS(total_fee_incl_gst - (total_fee_excl_gst + gst_amount)) < 0.01
    ),
  ADD CONSTRAINT chk_bookings_fees_non_negative
    CHECK (
      total_fee_excl_gst >= 0
      AND gst_amount >= 0
      AND total_fee_incl_gst >= 0
    );

-- Add constraints to payments table
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_gst_calculation
    CHECK (
      ABS(gst_amount - (amount_excl_gst * 0.10)) < 0.01
      AND ABS(total_amount - (amount_excl_gst + gst_amount)) < 0.01
    );

-- Add constraints to booking_hbls junction
ALTER TABLE booking_hbls
  ADD CONSTRAINT chk_booking_hbls_fee_calculation
    CHECK (
      ABS(per_hbl_fee - (chargeable_weight * rate)) < 0.01
    );
```

```typescript
// lib/utils/gst.ts
export const GST_RATE = 0.10 // 10% per GST Act 1999

export interface GSTCalculation {
  amountExclGst: number
  gstAmount: number
  totalInclGst: number
}

export function calculateGST(amountExclGst: number): GSTCalculation {
  // Round to 2 decimal places
  const gstAmount = Math.round(amountExclGst * GST_RATE * 100) / 100
  const totalInclGst = Math.round((amountExclGst + gstAmount) * 100) / 100

  return {
    amountExclGst,
    gstAmount,
    totalInclGst
  }
}

// Usage in booking creation
const baseAmount = hblFees.reduce((sum, fee) => sum + fee, 0) + minimumCharge
const gst = calculateGST(baseAmount)

await db.bookings.create({
  data: {
    // ... other fields
    total_fee_excl_gst: gst.amountExclGst,
    gst_amount: gst.gstAmount,
    total_fee_incl_gst: gst.totalInclGst
  }
})
// DB constraint will catch any calculation errors
```

**Status:** ✅ Database constraints + application helper

---

## Critical Fix #5: Cutoff Override Tracking

### Recommended Approach: Add Audit Columns

```sql
-- Migration: Add override tracking
ALTER TABLE bookings
  ADD COLUMN cutoff_override_by_user_id int NULL,
  ADD COLUMN cutoff_override_reason text NULL,
  ADD COLUMN cutoff_override_at timestamp NULL,
  ADD CONSTRAINT fk_bookings_cutoff_override_user
    FOREIGN KEY (cutoff_override_by_user_id) REFERENCES users(id);
```

```typescript
// lib/services/booking-modification.ts
export async function modifyBooking(
  bookingId: number,
  changes: BookingChanges,
  userId: number,
  userRole: UserRole
) {
  const booking = await db.bookings.findUnique({
    where: { id: bookingId },
    include: { slot: true }
  })

  // Check if modification is after cutoff
  const now = new Date()
  const changeCutoff = calculateChangeCutoff(booking.slot, booking.slot_date)
  const isAfterCutoff = now > changeCutoff

  // Cost-impacting changes after cutoff
  const isCostImpacting =
    changes.hblIds || changes.slotId || changes.slotDate

  if (isAfterCutoff && isCostImpacting) {
    // ACFS admin can override per BR-015
    if (userRole !== 'acfs_admin') {
      throw new BusinessRuleError(
        'BR-015',
        'Cost-impacting changes after cutoff require ACFS admin override'
      )
    }

    // Require override reason from admin
    if (!changes.overrideReason) {
      throw new BusinessRuleError(
        'BR-015',
        'Override reason required for late modifications'
      )
    }

    // Record override
    await db.bookings.update({
      where: { id: bookingId },
      data: {
        // ... apply changes
        is_late_change: true,
        cutoff_override_by_user_id: userId,
        cutoff_override_reason: changes.overrideReason,
        cutoff_override_at: now
      }
    })
  } else {
    // Normal modification
    await db.bookings.update({
      where: { id: bookingId },
      data: changes
    })
  }
}
```

```typescript
// UI: Admin override dialog
// components/booking/modify-booking-dialog.tsx
{isAfterCutoff && isCostImpacting && (
  <Alert variant="warning">
    <AlertTitle>Late Modification - Admin Override Required</AlertTitle>
    <AlertDescription>
      Change cutoff was {format(changeCutoff, 'PPpp')}.
      This modification requires an admin override reason per BR-015.
    </AlertDescription>
  </Alert>
)}

{isAfterCutoff && isCostImpacting && (
  <FormField
    control={form.control}
    name="overrideReason"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Override Reason *</FormLabel>
        <FormControl>
          <Textarea
            placeholder="e.g., Emergency container yard closure, Customer operational issue"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

**Status:** ✅ Audit columns + application enforcement

---

## Critical Fix #6: BR-028 Derived Collected Status

### Recommended Approach: Background Job (Not Database Trigger)

**Why?** Booking collected status doesn't need to be instant. Background job is easier to maintain and debug than triggers.

#### Option A: Background Job (Recommended)

```typescript
// lib/jobs/update-booking-collected-status.ts
import { CronJob } from 'cron'

/**
 * Updates booking status to 'collected' when all HBLs are collected.
 * Runs every 5 minutes.
 * BR-028: Derived status - no manual setting needed.
 */
export const updateBookingCollectedStatusJob = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    console.log('[Job] Checking for collected bookings...')

    // Find bookings in 'processed' state with all HBLs collected
    const bookingsToUpdate = await db.$queryRaw`
      SELECT DISTINCT b.id, b.booking_reference
      FROM bookings b
      WHERE b.status = 'processed'
      AND NOT EXISTS (
        SELECT 1
        FROM booking_hbls bh
        JOIN hbls h ON bh.hbl_id = h.id
        WHERE bh.booking_id = b.id
        AND h.milestone != 'collected'
      )
    `

    if (bookingsToUpdate.length === 0) {
      console.log('[Job] No bookings to update')
      return
    }

    // Update statuses
    const bookingIds = bookingsToUpdate.map(b => b.id)
    const result = await db.bookings.updateMany({
      where: { id: { in: bookingIds } },
      data: {
        status: 'collected',
        updated_at: new Date()
      }
    })

    console.log(
      `[Job] Updated ${result.count} bookings to collected:`,
      bookingsToUpdate.map(b => b.booking_reference)
    )
  }
)

// Start job in server
// app/api/cron/route.ts or background worker
updateBookingCollectedStatusJob.start()
```

```typescript
// Alternative: Trigger on HBL update via Prisma middleware
// lib/prisma-middleware.ts
prisma.$use(async (params, next) => {
  const result = await next(params)

  // After updating HBL milestone to collected
  if (
    params.model === 'hbls' &&
    params.action === 'update' &&
    params.args.data.milestone === 'collected'
  ) {
    const hblId = params.args.where.id

    // Queue job to check booking status
    await queueUpdateBookingStatus(hblId)
  }

  return result
})

async function queueUpdateBookingStatus(hblId: number) {
  // Find all bookings containing this HBL
  const bookings = await db.bookings.findMany({
    where: {
      status: 'processed',
      booking_hbls: {
        some: { hbl_id: hblId }
      }
    },
    include: {
      booking_hbls: {
        include: { hbl: true }
      }
    }
  })

  // Check each booking
  for (const booking of bookings) {
    const allCollected = booking.booking_hbls.every(
      bh => bh.hbl.milestone === 'collected'
    )

    if (allCollected) {
      await db.bookings.update({
        where: { id: booking.id },
        data: { status: 'collected' }
      })

      console.log(`Booking ${booking.booking_reference} marked as collected`)
    }
  }
}
```

#### Option B: Database Trigger (If you prefer)

```sql
-- PostgreSQL function to check and update booking collected status
CREATE OR REPLACE FUNCTION update_booking_collected_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when HBL milestone changes to 'collected'
  IF NEW.milestone = 'collected' AND OLD.milestone != 'collected' THEN

    -- Update bookings containing this HBL
    UPDATE bookings b
    SET
      status = 'collected',
      updated_at = NOW()
    WHERE
      b.status = 'processed'
      AND b.id IN (
        SELECT bh.booking_id
        FROM booking_hbls bh
        WHERE bh.hbl_id = NEW.id
      )
      -- Only update if ALL HBLs in the booking are collected
      AND NOT EXISTS (
        SELECT 1
        FROM booking_hbls bh2
        JOIN hbls h2 ON bh2.hbl_id = h2.id
        WHERE bh2.booking_id = b.id
        AND h2.milestone != 'collected'
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hbl_update_booking_collected
  AFTER UPDATE OF milestone ON hbls
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_collected_status();
```

**Recommendation:** Use **Option A (Background Job)**. Easier to test, debug, and doesn't add trigger complexity.

**Status:** ✅ Background job recommended

---

## 📦 Migration Script Template

```typescript
// prisma/migrations/xxx_fix_critical_issues/migration.sql

-- ============================================================================
-- Critical Fixes Migration
-- ============================================================================

-- Fix #3: Remove redundant derived fields
ALTER TABLE hbls DROP COLUMN IF EXISTS chargeable_weight;
ALTER TABLE hbls DROP COLUMN IF EXISTS storage_fee_applicable;

-- Fix #3b: Make do_waived a generated column
ALTER TABLE hbls DROP COLUMN IF EXISTS do_waived;
ALTER TABLE hbls ADD COLUMN do_waived boolean
  GENERATED ALWAYS AS (release_type = 'free_release' OR under_bond = true)
  STORED;

-- Fix #4: Add GST validation constraints
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_gst_calculation
    CHECK (
      ABS(gst_amount - (total_fee_excl_gst * 0.10)) < 0.01
      AND ABS(total_fee_incl_gst - (total_fee_excl_gst + gst_amount)) < 0.01
    );

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_fees_non_negative
    CHECK (
      total_fee_excl_gst >= 0
      AND gst_amount >= 0
      AND total_fee_incl_gst >= 0
      AND late_change_fee >= 0
    );

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_gst_calculation
    CHECK (
      ABS(gst_amount - (amount_excl_gst * 0.10)) < 0.01
      AND ABS(total_amount - (amount_excl_gst + gst_amount)) < 0.01
    );

ALTER TABLE booking_hbls
  ADD CONSTRAINT chk_booking_hbls_fee_calculation
    CHECK (
      ABS(per_hbl_fee - (chargeable_weight * rate)) < 0.01
    );

-- Fix #5: Add cutoff override tracking
ALTER TABLE bookings
  ADD COLUMN cutoff_override_by_user_id int NULL,
  ADD COLUMN cutoff_override_reason text NULL,
  ADD COLUMN cutoff_override_at timestamp NULL;

ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_cutoff_override_user
    FOREIGN KEY (cutoff_override_by_user_id) REFERENCES users(id);

-- Fix #1: BR-004 enforcement trigger
CREATE OR REPLACE FUNCTION check_hbl_booking_rules()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'booking_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'delegated'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot book delegated HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'delegation_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'booked'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot delegate booked HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_hbls_br004
  BEFORE INSERT ON booking_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();

CREATE TRIGGER trg_delegation_hbls_br004
  BEFORE INSERT ON delegation_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();

-- Add helpful comments
COMMENT ON COLUMN bookings.cutoff_override_reason IS 'BR-015: Required when ACFS admin overrides change cutoff for cost-impacting modifications';
COMMENT ON TRIGGER trg_booking_hbls_br004 ON booking_hbls IS 'BR-004: Enforces mutual exclusivity - cannot book delegated HBLs';
```

---

## 🎯 Implementation Timeline

### Week 1: Database Changes
- [ ] Day 1: Create migration script
- [ ] Day 2: Test migration on dev database
- [ ] Day 3: Review with team
- [ ] Day 4: Apply to staging
- [ ] Day 5: Monitor staging

### Week 2: Application Logic
- [ ] Day 1-2: Implement BR-001 booking readiness check
- [ ] Day 3-4: Implement BR-004 validation in service layer
- [ ] Day 5: Implement cutoff override logic

### Week 3: Background Jobs
- [ ] Day 1-2: Implement BR-028 collected status job
- [ ] Day 3: Testing and monitoring
- [ ] Day 4-5: Documentation

---

## 🧪 Testing Checklist

### Unit Tests
```typescript
// tests/unit/gst-calculations.test.ts
describe('GST Calculations', () => {
  it('should calculate GST correctly', () => {
    const result = calculateGST(100)
    expect(result.gstAmount).toBe(10)
    expect(result.totalInclGst).toBe(110)
  })

  it('should round to 2 decimal places', () => {
    const result = calculateGST(33.33)
    expect(result.gstAmount).toBe(3.33)
    expect(result.totalInclGst).toBe(36.66)
  })
})

// tests/unit/booking-readiness.test.ts
describe('Booking Readiness (BR-001)', () => {
  it('should reject unpacked HBL', async () => {
    const result = await checkBookingReadiness([hblNotUnpacked.id])
    expect(result.isReady).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ reason: 'milestone' })
    )
  })

  it('should reject non-cleared customs', async () => {
    const result = await checkBookingReadiness([hblNotCleared.id])
    expect(result.isReady).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ reason: 'customs' })
    )
  })
})
```

### Integration Tests
```typescript
// tests/integration/booking-creation.test.ts
describe('Booking Creation', () => {
  it('should prevent booking delegated HBL (BR-004)', async () => {
    // Setup: Create delegated HBL
    const hbl = await createTestHBL({ hbl_status: 'delegated' })

    // Attempt to book
    await expect(
      bookingService.createBooking({ hblIds: [hbl.id], ...bookingData })
    ).rejects.toThrow('BR-004')
  })

  it('should prevent delegating booked HBL (BR-004)', async () => {
    // Setup: Create booked HBL
    const hbl = await createTestHBL({ hbl_status: 'booked' })

    // Attempt to delegate
    await expect(
      delegationService.createDelegation({ hblIds: [hbl.id], ...delegationData })
    ).rejects.toThrow('BR-004')
  })
})
```

### Database Constraint Tests
```sql
-- Test GST constraint
-- This should fail:
INSERT INTO bookings (
  total_fee_excl_gst,
  gst_amount,
  total_fee_incl_gst
) VALUES (
  100,
  9,  -- Wrong! Should be 10
  109
);
-- Expected: ERROR: constraint "chk_bookings_gst_calculation" violated

-- Test BR-004 trigger
-- This should fail:
INSERT INTO hbls (hbl_status, ...) VALUES ('delegated', ...);
INSERT INTO booking_hbls (hbl_id, booking_id) VALUES (last_insert_id(), 1);
-- Expected: ERROR: BR-004: Cannot book delegated HBL
```

---

## 📊 Monitoring & Alerts

```typescript
// lib/monitoring/schema-violations.ts
import * as Sentry from '@sentry/nextjs'

export class BusinessRuleError extends Error {
  constructor(
    public rule: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(`${rule}: ${message}`)
    this.name = 'BusinessRuleError'

    // Log to Sentry
    Sentry.captureException(this, {
      tags: { rule },
      extra: context
    })
  }
}

// Track constraint violations
prisma.$on('query', (e) => {
  if (e.query.includes('constraint')) {
    console.warn('[DB Constraint]', {
      query: e.query,
      params: e.params,
      duration: e.duration
    })

    Sentry.captureMessage('Database constraint triggered', {
      level: 'warning',
      extra: { query: e.query }
    })
  }
})
```

---

## ✅ Success Criteria

Schema fixes are complete when:

1. **All critical issues addressed:**
   - ✅ BR-004 enforced (application + trigger)
   - ✅ BR-001 validated (application layer)
   - ✅ Derived fields fixed (generated columns)
   - ✅ GST constraints added
   - ✅ Override tracking added
   - ✅ Collected status automated

2. **Tests passing:**
   - ✅ All unit tests pass
   - ✅ Integration tests cover edge cases
   - ✅ Database constraint tests written

3. **Documentation updated:**
   - ✅ Migration scripts documented
   - ✅ Business rule enforcement explained
   - ✅ Team trained on new validations

4. **Staging validated:**
   - ✅ Migration runs successfully
   - ✅ No breaking changes to existing flows
   - ✅ Performance acceptable

---

## 🚀 Next Steps

1. **Review this strategy** with Matt/Roni
2. **Create detailed tickets** for each fix
3. **Schedule implementation** in sprint planning
4. **Set up staging environment** for testing
5. **Plan rollback strategy** if issues arise

**Recommendation:** Tackle in order presented. Each fix is independent and can be deployed separately.
