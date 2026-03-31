import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const siteSchema = z.object({
  site_name: z.string(), // Human-readable site name (e
  branch_code: z.string(), // Branch code (e
})

export type Site = z.infer<typeof siteSchema>

/**
 * GET /api/sites
 * List all Site records
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
    // const sites = await db.site.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const sites: Site[] = []

    return NextResponse.json(
      {
        data: sites,
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
    console.error('[GET /api/sites]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites
 * Create a new Site
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = siteSchema.parse(body)

    // TODO: Implement database insert
    // const site = await db.site.create({
    //   data: validated,
    // })

    const site: Site = validated as Site

    return NextResponse.json(
      { data: site },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/sites]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
