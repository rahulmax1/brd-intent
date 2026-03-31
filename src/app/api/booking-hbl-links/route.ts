import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const booking_hbl_linkSchema = z.object({
  chargeable_weight: z.number(), // Chargeable weight for this HBL at time of booking (max of weight vs volume)
  rate: z.number(), // Rate applied to this HBL at time of booking
  per_hbl_fee: z.number(), // Calculated fee for this HBL (chargeable_weight × rate)
})

export type BookingHBLLink = z.infer<typeof booking_hbl_linkSchema>

/**
 * GET /api/booking-hbl-links
 * List all BookingHBLLink records
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
    // const bookingHblLinks = await db.booking_hbl_link.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const bookingHblLinks: BookingHBLLink[] = []

    return NextResponse.json(
      {
        data: bookingHblLinks,
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
    console.error('[GET /api/booking-hbl-links]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/booking-hbl-links
 * Create a new BookingHBLLink
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = booking_hbl_linkSchema.parse(body)

    // TODO: Implement database insert
    // const booking_hbl_link = await db.booking_hbl_link.create({
    //   data: validated,
    // })

    const booking_hbl_link: BookingHBLLink = validated as BookingHBLLink

    return NextResponse.json(
      { data: booking_hbl_link },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/booking-hbl-links]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
