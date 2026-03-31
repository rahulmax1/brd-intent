import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const delegationSchema = z.object({
  delegation_id: z.string(), // System-generated unique ID
  delegator: z.string(), // LSP or P4TC who initiated the delegation
  delegatee: z.string(), // Target party — existing LSP (by ID) or new P4TC (by email)
  delegation_method: z.enum(['existing_lsp', 'one_off_p4tc']), // Whether delegating to a registered LSP or creating a one-off P4TC
  created_at: z.string().datetime(), // When the delegation was created
})

export type Delegation = z.infer<typeof delegationSchema>

/**
 * GET /api/delegations
 * List all Delegation records
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
    // const delegations = await db.delegation.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const delegations: Delegation[] = []

    return NextResponse.json(
      {
        data: delegations,
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
    console.error('[GET /api/delegations]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delegations
 * Create a new Delegation
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = delegationSchema.parse(body)

    // TODO: Implement database insert
    // const delegation = await db.delegation.create({
    //   data: validated,
    // })

    const delegation: Delegation = validated as Delegation

    return NextResponse.json(
      { data: delegation },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/delegations]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
