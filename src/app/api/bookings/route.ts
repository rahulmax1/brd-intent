import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const bookingSchema = z.object({
  booking_id: z.string(), // System-generated unique reference number
  pickup_window: z.string(), // Selected date/time slot
  driver_name: z.string(), // Driver performing pickup
  driver_license: z.string(), // Driver license number
  truck_rego: z.string(), // Vehicle registration
  fee_amount: z.number(), // Sum of (chargeable_weight × rate) per HBL + minimum charge
  booking_party: z.string(), // LSP or P4TC who created the booking
  tc_accepted: z.boolean(), // Whether booking party accepted terms and conditions
  site_induction_accepted: z.boolean(), // Whether driver site induction was acknowledged
})

export type Booking = z.infer<typeof bookingSchema>

/**
 * GET /api/bookings
 * List all Booking records
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    // TODO: Parse query parameters for filtering, pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // TODO: Implement database query
    // const bookings = await db.booking.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const bookings: Booking[] = []

    return NextResponse.json(
      {
        data: bookings,
        pagination: {
          page,
          limit,
          total: 0, // TODO: Get total count from database
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[GET /api/bookings]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings
 * Create a new Booking
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = bookingSchema.parse(body)

    // TODO: Implement database insert
    // const booking = await db.booking.create({
    //   data: validated,
    // })

    const booking: Booking = validated as Booking

    return NextResponse.json(
      { data: booking },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/bookings]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
