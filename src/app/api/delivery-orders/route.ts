import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const delivery_orderSchema = z.object({
  uploaded_by: z.string(), // LSP or P4TC who uploaded the document
  upload_date: z.string().datetime(), // When the DO was uploaded
  document_url: z.string(), // Stored document reference/URL
  tier_level: z.string(), // Which level in the HBL hierarchy this DO covers
})

export type DeliveryOrderDO = z.infer<typeof delivery_orderSchema>

/**
 * GET /api/delivery-orders
 * List all DeliveryOrderDO records
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
    // const deliveryOrders = await db.delivery_order.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const deliveryOrders: DeliveryOrderDO[] = []

    return NextResponse.json(
      {
        data: deliveryOrders,
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
    console.error('[GET /api/delivery-orders]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery-orders
 * Create a new DeliveryOrderDO
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = delivery_orderSchema.parse(body)

    // TODO: Implement database insert
    // const delivery_order = await db.delivery_order.create({
    //   data: validated,
    // })

    const delivery_order: DeliveryOrderDO = validated as DeliveryOrderDO

    return NextResponse.json(
      { data: delivery_order },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/delivery-orders]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
