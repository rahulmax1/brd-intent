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

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/booking-hbl-links/[id]
 * Get a single BookingHBLLink by ID
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params

    // TODO: Implement database query
    // const booking_hbl_link = await db.booking_hbl_link.findUnique({
    //   where: { id }
    // })

    // if (!booking_hbl_link) {
    //   return NextResponse.json(
    //     { error: 'not_found', message: 'BookingHBLLink not found' },
    //     { status: 404 }
    //   )
    // }

    const booking_hbl_link: BookingHBLLink | null = null

    if (!booking_hbl_link) {
      return NextResponse.json(
        { error: 'not_found', message: 'BookingHBLLink not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: booking_hbl_link },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error(`[GET /api/booking-hbl-links/${(await params).id}]`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/booking-hbl-links/[id]
 * Update a BookingHBLLink
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validated = booking_hbl_linkSchema.partial().parse(body)

    // TODO: Implement database update
    // const booking_hbl_link = await db.booking_hbl_link.update({
    //   where: { id },
    //   data: validated,
    // })

    const booking_hbl_link: BookingHBLLink | null = null

    if (!booking_hbl_link) {
      return NextResponse.json(
        { error: 'not_found', message: 'BookingHBLLink not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: booking_hbl_link })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error(`[PUT /api/booking-hbl-links/${(await params).id}]`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'update_failed', message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/booking-hbl-links/[id]
 * Delete a BookingHBLLink
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params

    // TODO: Implement database delete
    // await db.booking_hbl_link.delete({
    //   where: { id }
    // })

    return NextResponse.json(
      { success: true, message: 'BookingHBLLink deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error(`[DELETE /api/booking-hbl-links/${(await params).id}]`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'delete_failed', message },
      { status: 500 }
    )
  }
}
