import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const paymentSchema = z.object({
  payment_id: z.string(), // System-generated unique payment reference
  amount: z.number(), // Total amount charged
  payment_gateway: z.string(), // Gateway used (Stripe for Phase 1, abstracted for future swap to Compay)
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']), // Transaction status
  payment_timestamp: z.string().datetime(), // When the payment was processed
})

export type Payment = z.infer<typeof paymentSchema>

/**
 * GET /api/payments
 * List all Payment records
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
    // const payments = await db.payment.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const payments: Payment[] = []

    return NextResponse.json(
      {
        data: payments,
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
    console.error('[GET /api/payments]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments
 * Create a new Payment
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = paymentSchema.parse(body)

    // TODO: Implement database insert
    // const payment = await db.payment.create({
    //   data: validated,
    // })

    const payment: Payment = validated as Payment

    return NextResponse.json(
      { data: payment },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/payments]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
