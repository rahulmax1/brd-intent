# API Stub Generator

Automatically generates Next.js App Router API endpoint stubs from the intent model entities.

## Usage

```bash
pnpm run generate:api-stubs
```

## What it does

For each entity in the intent model (`src/domain/intent-model/model.ts`), the script:

1. Generates CRUD API routes at `src/app/api/[entity-plural]/`
2. Creates TypeScript types from entity fields
3. Generates Zod validation schemas
4. Includes error handling boilerplate
5. Adds TODO comments for database integration

## Generated structure

For an entity like `booking`, it creates:

```
src/app/api/bookings/
  route.ts          # GET (list) and POST (create) endpoints
  [id]/
    route.ts        # GET (detail), PUT (update), DELETE endpoints
```

## Features

- **Type-safe**: Exports TypeScript types inferred from Zod schemas
- **Validation**: Request body validation with detailed error messages
- **Idempotent**: Skips existing files to avoid overwriting customizations
- **Pagination**: Includes query parameter parsing for page/limit
- **Error handling**: Consistent error response format
- **Entity filtering**: Skips integration entities and deferred entities

## Example output

```typescript
// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bookingSchema = z.object({
  booking_id: z.string(),
  pickup_window: z.string(),
  driver_name: z.string(),
  // ... more fields
})

export type Booking = z.infer<typeof bookingSchema>

export async function GET(request: NextRequest) {
  // TODO: Implement database query
  const bookings: Booking[] = []
  return NextResponse.json({ data: bookings })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validated = bookingSchema.parse(body)
  // TODO: Implement database insert
  return NextResponse.json({ data: validated }, { status: 201 })
}
```

## Next steps after generation

1. Set up your database client (Prisma, Drizzle, etc.)
2. Create authentication middleware at `src/lib/auth.ts`
3. Replace TODO comments with actual database queries
4. Add business logic and authorization checks
5. Test endpoints with your API client

## Entities generated

The script processes these entities (as of v0.9.0):

- HBL (House Bill of Lading) → `/api/hbls`
- Booking → `/api/bookings`
- Pickup Slot → `/api/slots`
- Site → `/api/sites`
- Delivery Order → `/api/delivery-orders`
- Delegation → `/api/delegations`
- Payment → `/api/payments`
- User → `/api/users`
- Booking-HBL Link → `/api/booking-hbl-links`

Integration entities (Maximus, AGS, email, payment gateways) and deferred entities (Driver Record, P4TC, Gatehouse) are skipped.
