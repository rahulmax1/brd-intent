// Artifact Generation API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'

type RouteContext = {
  params: Promise<{ projectId: string; type: string }>
}

// GET /api/projects/:projectId/artifacts/:type - Download artifact
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, type } = await context.params

    // Get artifact by type
    const artifact = await prisma.generatedArtifact.findUnique({
      where: {
        projectId_artifactType: {
          projectId,
          artifactType: type as any,
        },
      },
    })

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Read file
    const content = await readFile(artifact.storagePath, 'utf-8')

    // Determine content type
    const mimeTypes: Record<string, string> = {
      '.md': 'text/markdown',
      '.ts': 'text/plain',
      '.sql': 'text/plain',
      '.json': 'application/json',
    }

    const ext = artifact.filename.substring(artifact.filename.lastIndexOf('.'))
    const contentType = mimeTypes[ext] || 'text/plain'

    // Return file
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to download artifact:', error)
    return NextResponse.json(
      { error: 'Failed to download artifact' },
      { status: 500 }
    )
  }
}

// POST /api/projects/:projectId/artifacts/:type - Generate artifact
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, type } = await context.params

    // Validate artifact type
    const validTypes = ['BRD', 'TYPESCRIPT_TYPES', 'ZOD_SCHEMAS', 'API_STUBS', 'MIGRATION']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid artifact type' }, { status: 400 })
    }

    // Get project with latest model version
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        intentModelVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.intentModelVersions.length === 0) {
      return NextResponse.json(
        { error: 'No intent model found. Generate a draft first.' },
        { status: 400 }
      )
    }

    const modelVersion = project.intentModelVersions[0]
    const modelData = modelVersion.modelData as any

    // Generate artifact content based on type
    let content: string
    let filename: string
    let mimeType: string

    switch (type) {
      case 'BRD':
        content = generateBRD(project.name, modelData)
        filename = `${sanitizeFilename(project.name)}-brd.md`
        mimeType = 'text/markdown'
        break

      case 'TYPESCRIPT_TYPES':
        content = generateTypeScriptTypes(modelData)
        filename = `${sanitizeFilename(project.name)}-types.ts`
        mimeType = 'text/plain'
        break

      case 'ZOD_SCHEMAS':
        content = generateZodSchemas(modelData)
        filename = `${sanitizeFilename(project.name)}-schemas.ts`
        mimeType = 'text/plain'
        break

      case 'API_STUBS':
        content = generateAPIStubs(modelData)
        filename = `${sanitizeFilename(project.name)}-api-stubs.ts`
        mimeType = 'text/plain'
        break

      case 'MIGRATION':
        content = generateMigration(modelData)
        filename = `${sanitizeFilename(project.name)}-migration.sql`
        mimeType = 'text/plain'
        break

      default:
        return NextResponse.json({ error: 'Unsupported artifact type' }, { status: 400 })
    }

    // Save artifact to disk
    const artifactsDir = join(process.cwd(), 'artifacts', projectId)
    await mkdir(artifactsDir, { recursive: true })

    const storagePath = join(artifactsDir, filename)
    await writeFile(storagePath, content, 'utf-8')

    // Create or update artifact record
    const artifact = await prisma.generatedArtifact.upsert({
      where: {
        projectId_artifactType: {
          projectId,
          artifactType: type,
        },
      },
      create: {
        projectId,
        modelVersionId: modelVersion.id,
        artifactType: type,
        filename,
        storagePath,
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
      },
      update: {
        modelVersionId: modelVersion.id,
        filename,
        storagePath,
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
      },
    })

    return NextResponse.json({ artifact }, { status: 201 })
  } catch (error) {
    console.error('Failed to generate artifact:', error)
    return NextResponse.json(
      { error: 'Failed to generate artifact' },
      { status: 500 }
    )
  }
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateBRD(projectName: string, modelData: any): string {
  const { actors = [], entities = [], journeys = [], businessRules = [] } = modelData

  return `# Business Requirements Document: ${projectName}

**Generated:** ${new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

---

## 1. Actors

${actors.map((actor: any) => `### ${actor.name}

${actor.description}
`).join('\n')}

---

## 2. Entities

${entities.map((entity: any) => `### ${entity.name}

${entity.description}
`).join('\n')}

---

## 3. User Journeys

${journeys.map((journey: any) => `### ${journey.name}

${journey.description}
`).join('\n')}

---

## 4. Business Rules

${businessRules.map((rule: any, index: number) => `### BR-${String(index + 1).padStart(3, '0')}: ${rule.name}

${rule.description}
`).join('\n')}

---

*Generated by Intent Model Platform*
`
}

function generateTypeScriptTypes(modelData: any): string {
  const { entities = [] } = modelData

  let output = `// TypeScript Type Definitions\n// Generated from Intent Model\n\n`

  entities.forEach((entity: any) => {
    const typeName = toPascalCase(entity.name)
    output += `export type ${typeName} = {\n`
    output += `  id: string\n`
    output += `  // Add fields based on entity: ${entity.description}\n`
    output += `  createdAt: Date\n`
    output += `  updatedAt: Date\n`
    output += `}\n\n`
  })

  return output
}

function generateZodSchemas(modelData: any): string {
  const { entities = [] } = modelData

  let output = `import { z } from 'zod'\n\n// Zod Validation Schemas\n// Generated from Intent Model\n\n`

  entities.forEach((entity: any) => {
    const schemaName = `${toCamelCase(entity.name)}Schema`
    output += `export const ${schemaName} = z.object({\n`
    output += `  id: z.string().uuid(),\n`
    output += `  // Add fields based on entity: ${entity.description}\n`
    output += `  createdAt: z.date(),\n`
    output += `  updatedAt: z.date(),\n`
    output += `})\n\n`
  })

  return output
}

function generateAPIStubs(modelData: any): string {
  const { entities = [] } = modelData

  let output = `// API Route Stubs\n// Generated from Intent Model\n// Copy these to your src/app/api directory\n\n`

  entities.forEach((entity: any) => {
    const routeName = toKebabCase(entity.name)
    output += `// src/app/api/${routeName}/route.ts\n`
    output += `export async function GET() {\n`
    output += `  // List all ${entity.name} records\n`
    output += `  return NextResponse.json({ data: [] })\n`
    output += `}\n\n`
    output += `export async function POST(request: NextRequest) {\n`
    output += `  // Create new ${entity.name}\n`
    output += `  const body = await request.json()\n`
    output += `  return NextResponse.json({ data: body })\n`
    output += `}\n\n`
  })

  return output
}

function generateMigration(modelData: any): string {
  const { entities = [] } = modelData

  let output = `-- Database Migration\n-- Generated from Intent Model\n\n`

  entities.forEach((entity: any) => {
    const tableName = toSnakeCase(entity.name)
    output += `CREATE TABLE ${tableName} (\n`
    output += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`
    output += `  -- Add columns based on entity: ${entity.description}\n`
    output += `  created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n`
    output += `  updated_at TIMESTAMP NOT NULL DEFAULT NOW()\n`
    output += `);\n\n`
  })

  return output
}

function toPascalCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(str: string): string {
  return str
    .split(/[\s_]+/)
    .map(word => word.toLowerCase())
    .join('-')
}

function toSnakeCase(str: string): string {
  return str
    .split(/[\s-]+/)
    .map(word => word.toLowerCase())
    .join('_')
}
