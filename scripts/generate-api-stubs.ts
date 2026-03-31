import { mkdir, writeFile, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { intentModel } from '../src/domain/intent-model/model'
import type { Entity, Field } from '../src/domain/intent-model/types'

// Helper to convert entity ID to plural form for routes
function pluralize(word: string): string {
  const irregulars: Record<string, string> = {
    'hbl': 'hbls',
    'booking': 'bookings',
    'slot': 'slots',
    'site': 'sites',
    'driver_record': 'driver-records',
    'delivery_order': 'delivery-orders',
    'delegation': 'delegations',
    'payment': 'payments',
    'user': 'users',
    'booking_hbl_link': 'booking-hbl-links',
  }

  if (irregulars[word]) {
    return irregulars[word]
  }

  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies'
  }
  if (word.endsWith('s')) {
    return word + 'es'
  }
  return word + 's'
}

// Convert hyphenated string to camelCase for variable names
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

// Convert field type to Zod schema
function fieldToZodSchema(field: Field): string {
  const type = field.type.toLowerCase()

  // Handle union types (e.g., 'pending' | 'completed')
  if (type.includes('|')) {
    const values = type
      .split('|')
      .map(v => v.trim().replace(/['"]/g, ''))
      .filter(v => v)
    return `z.enum([${values.map(v => `'${v}'`).join(', ')}])`
  }

  // Map basic types
  if (type === 'string') return 'z.string()'
  if (type === 'number') return 'z.number()'
  if (type === 'boolean') return 'z.boolean()'
  if (type === 'date') return 'z.string().datetime()'
  if (type === 'time') return 'z.string()'
  if (type.startsWith('string[]')) return 'z.array(z.string())'
  if (type.startsWith('number[]')) return 'z.array(z.number())'

  // Handle object types
  if (type.includes('{')) {
    return 'z.object({})' // Simplified - would need parsing for complex objects
  }

  // Default to string for complex types
  return 'z.string()'
}

// Generate Zod schema for entity
function generateZodSchema(entity: Entity): string {
  const fields = entity.key_fields
    .filter(f => !f.name.includes('_id') || f.name === entity.id + '_id')
    .map(field => {
      const schema = fieldToZodSchema(field)
      const isOptional = field.description.toLowerCase().includes('optional')
      return `  ${field.name}: ${schema}${isOptional ? '.optional()' : ''}, // ${field.description.split('.')[0]}`
    })
    .join('\n')

  return fields
}

// Generate list route (GET /api/[entity])
function generateListRoute(entity: Entity, entityName: string): string {
  const pluralRoute = pluralize(entity.id)
  const pluralVar = toCamelCase(pluralRoute)
  const entityVar = toCamelCase(entity.id)
  const schemaName = entityVar.charAt(0).toLowerCase() + entityVar.slice(1) + 'Schema'

  return `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const ${schemaName} = z.object({
${generateZodSchema(entity)}
})

export type ${entityName} = z.infer<typeof ${schemaName}>

/**
 * GET /api/${pluralRoute}
 * List all ${entityName} records
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
    // const ${pluralVar} = await db.${entityVar}.findMany({
    //   skip: (page - 1) * limit,
    //   take: limit,
    // })

    const ${pluralVar}: ${entityName}[] = []

    return NextResponse.json(
      {
        data: ${pluralVar},
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
    console.error('[GET /api/${pluralRoute}]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/${pluralRoute}
 * Create a new ${entityName}
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const body = await request.json()

    // Validate request body
    const validated = ${schemaName}.parse(body)

    // TODO: Implement database insert
    // const ${entityVar} = await db.${entityVar}.create({
    //   data: validated,
    // })

    const ${entityVar}: ${entityName} = validated as ${entityName}

    return NextResponse.json(
      { data: ${entityVar} },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[POST /api/${pluralRoute}]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 }
    )
  }
}
`
}

// Generate detail route (GET/PUT/DELETE /api/[entity]/[id])
function generateDetailRoute(entity: Entity, entityName: string): string {
  const pluralRoute = pluralize(entity.id)
  const entityVar = toCamelCase(entity.id)
  const schemaName = entityVar.charAt(0).toLowerCase() + entityVar.slice(1) + 'Schema'

  return `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// TODO: Import from database client
// import { db } from '@/lib/db'

// TODO: Add authentication middleware
// import { requireAuth } from '@/lib/auth'

const ${schemaName} = z.object({
${generateZodSchema(entity)}
})

export type ${entityName} = z.infer<typeof ${schemaName}>

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/${pluralRoute}/[id]
 * Get a single ${entityName} by ID
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params

    // TODO: Implement database query
    // const ${entityVar} = await db.${entityVar}.findUnique({
    //   where: { id }
    // })

    // if (!${entityVar}) {
    //   return NextResponse.json(
    //     { error: 'not_found', message: '${entityName} not found' },
    //     { status: 404 }
    //   )
    // }

    const ${entityVar}: ${entityName} | null = null

    if (!${entityVar}) {
      return NextResponse.json(
        { error: 'not_found', message: '${entityName} not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: ${entityVar} },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error(\`[GET /api/${pluralRoute}/\${(await params).id}]\`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/${pluralRoute}/[id]
 * Update a ${entityName}
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validated = ${schemaName}.partial().parse(body)

    // TODO: Implement database update
    // const ${entityVar} = await db.${entityVar}.update({
    //   where: { id },
    //   data: validated,
    // })

    const ${entityVar}: ${entityName} | null = null

    if (!${entityVar}) {
      return NextResponse.json(
        { error: 'not_found', message: '${entityName} not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: ${entityVar} })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error(\`[PUT /api/${pluralRoute}/\${(await params).id}]\`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'update_failed', message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/${pluralRoute}/[id]
 * Delete a ${entityName}
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // TODO: Add authentication check
    // const user = await requireAuth(request)

    const { id } = await params

    // TODO: Implement database delete
    // await db.${entityVar}.delete({
    //   where: { id }
    // })

    return NextResponse.json(
      { success: true, message: '${entityName} deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error(\`[DELETE /api/${pluralRoute}/\${(await params).id}]\`, error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'delete_failed', message },
      { status: 500 }
    )
  }
}
`
}

// Check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

// Main function
async function generateApiStubs() {
  console.log('🚀 Generating API endpoint stubs from intent model...\n')

  // Filter out integration entities and deferred entities
  const entities = intentModel.entities.filter(
    e => !e.is_integration && !e.deferred
  )

  console.log(`Found ${entities.length} entities to generate:\n`)

  for (const entity of entities) {
    const plural = pluralize(entity.id)
    const entityName = entity.name.replace(/[^\w\s]/g, '').replace(/\s+/g, '')

    console.log(`📦 ${entity.name} (${entity.id} → /api/${plural})`)

    // Create directory structure
    const listRoutePath = join(process.cwd(), 'src', 'app', 'api', plural, 'route.ts')
    const detailRoutePath = join(process.cwd(), 'src', 'app', 'api', plural, '[id]', 'route.ts')

    // Check if files exist
    const listExists = await fileExists(listRoutePath)
    const detailExists = await fileExists(detailRoutePath)

    if (listExists && detailExists) {
      console.log(`   ⚠️  Routes already exist - skipping`)
      continue
    }

    // Create directories
    await mkdir(dirname(listRoutePath), { recursive: true })
    await mkdir(dirname(detailRoutePath), { recursive: true })

    // Generate list route
    if (!listExists) {
      const listRoute = generateListRoute(entity, entityName)
      await writeFile(listRoutePath, listRoute)
      console.log(`   ✅ Created ${listRoutePath}`)
    } else {
      console.log(`   ⏭️  List route exists - skipping`)
    }

    // Generate detail route
    if (!detailExists) {
      const detailRoute = generateDetailRoute(entity, entityName)
      await writeFile(detailRoutePath, detailRoute)
      console.log(`   ✅ Created ${detailRoutePath}`)
    } else {
      console.log(`   ⏭️  Detail route exists - skipping`)
    }

    console.log('')
  }

  console.log('✨ API stub generation complete!\n')
  console.log('Next steps:')
  console.log('  1. Set up your database client (e.g., Prisma, Drizzle)')
  console.log('  2. Implement authentication middleware')
  console.log('  3. Replace TODO comments with actual database queries')
  console.log('  4. Test endpoints with your API client\n')
}

// Run
generateApiStubs().catch(console.error)
