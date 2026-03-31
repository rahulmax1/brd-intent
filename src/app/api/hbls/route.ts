import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const hblSchema = z.object({
  hbl_number: z.string(), // Primary identifier — lowest-level house bill number from Maximus
  alt_hbl_reference: z.string().optional(), // Alternative/parent HBL reference (e
  container_number: z.string(), // Container reference — ties HBL to the top-level container
  ocean_bl: z.string(), // Ocean bill of lading
  consignee: z.string(), // Next party in the chain
  weight_kg: z.number(), // Weight measurement for fee calculation
  volume_m3: z.number(), // Volumetric measurement for fee calculation
  chargeable_weight: z.number(), // Derived: max(weight_kg, volume_m3) per HBL
  quantity: z.number().optional(), // Number of packages (e
  pack_type: z.string().optional(), // Package type description
  description: z.string(), // Goods description
  milestone: z.enum(['on_vessel', 'at_wharf', 'in_yard', 'unpacked', 'collected']), // Physical progress milestone
  hbl_status: z.enum(['unassigned', 'assigned', 'delegated', 'booked']), // Delegation/booking status
  customs_clearance_status: z.string(), // Customs clearance state including quarantine
  under_bond: z.boolean(), // Flag — NOT a lifecycle state
  under_bond_verified: z.boolean(), // Whether ACFS has verified the under-bond marking
  last_free_storage_date: z.string().datetime(), // Last date of free storage
  release_type: z.enum(['do_required', 'free_release']), // Determines DO requirements per tier
  do_waived: z.boolean(), // Derived: true when release_type is "free_release" OR under_bond is true
  assigned_lsp: z.string(), // LSP this HBL is allocated to
  pickup_site: z.string(), // Physical site/warehouse where this HBL will be picked up (references site entity)
  import_ref: z.string().optional(), // Import reference from Maximus
  related_bookings: z.string(), // Bookings this HBL has been included in
})

export type HouseBillofLadingHBL = z.infer<typeof hblSchema>

/**
 * GET /api/hbls
 * List all HouseBillofLadingHBL records
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
    // const hbls = await db.hbl.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const hbls: HouseBillofLadingHBL[] = []

    return NextResponse.json(
      {
        data: hbls,
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
    console.error('[GET /api/hbls]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hbls
 * Create a new HouseBillofLadingHBL
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = hblSchema.parse(body)

    // TODO: Implement database insert
    // const hbl = await db.hbl.create({
    //   data: validated,
    // })

    const hbl: HouseBillofLadingHBL = validated as HouseBillofLadingHBL

    return NextResponse.json(
      { data: hbl },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/hbls]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
