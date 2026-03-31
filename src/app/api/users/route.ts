import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const userSchema = z.object({
  user_id: z.string(), // System-generated unique ID
  username: z.string(), // Login identifier
  role: z.enum(['lsp', 'acfs_admin', 'acfs_user']), // User role determining permissions and portal access level
  status: z.enum(['active', 'inactive']), // Account status
})

export type User = z.infer<typeof userSchema>

/**
 * GET /api/users
 * List all User records
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
    // const users = await db.user.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const users: User[] = []

    return NextResponse.json(
      {
        data: users,
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
    console.error('[GET /api/users]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new User
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = userSchema.parse(body)

    // TODO: Implement database insert
    // const user = await db.user.create({
    //   data: validated,
    // })

    const user: User = validated as User

    return NextResponse.json(
      { data: user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/users]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
