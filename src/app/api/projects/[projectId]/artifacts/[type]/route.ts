// Artifact Generation API
import { NextRequest, NextResponse } from 'next/server'
import type { ArtifactType } from '@prisma/client'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string; type: string }>
}

type NamedItem = {
  id?: string
  name: string
  description: string
}

type ModelData = {
  actors?: NamedItem[]
  entities?: NamedItem[]
  journeys?: NamedItem[]
  businessRules?: NamedItem[]
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
          artifactType: type as ArtifactType,
        },
      },
    })

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Content is stored in storagePath field
    const content = artifact.storagePath

    return NextResponse.json({ content, filename: artifact.filename })
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
    const validTypes: ArtifactType[] = ['BRD', 'TYPESCRIPT_TYPES', 'ZOD_SCHEMAS', 'API_STUBS', 'MIGRATION']
    if (!validTypes.includes(type as ArtifactType)) {
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
    const modelData = modelVersion.modelData as ModelData

    // Generate artifact content based on type
    let content: string
    let filename: string

    switch (type) {
      case 'BRD':
        content = generateBRD(project.name, modelData)
        filename = `${sanitizeFilename(project.name)}-brd.md`
        break

      case 'TYPESCRIPT_TYPES':
        content = generateTypeScriptTypes(modelData)
        filename = `${sanitizeFilename(project.name)}-types.ts`
        break

      case 'ZOD_SCHEMAS':
        content = generateZodSchemas(modelData)
        filename = `${sanitizeFilename(project.name)}-schemas.ts`
        break

      case 'API_STUBS':
        content = generateAPIStubs(modelData)
        filename = `${sanitizeFilename(project.name)}-api-stubs.ts`
        break

      case 'MIGRATION':
        content = generateMigration(modelData)
        filename = `${sanitizeFilename(project.name)}-migration.sql`
        break

      default:
        return NextResponse.json({ error: 'Unsupported artifact type' }, { status: 400 })
    }

    // Store content in database (storagePath field repurposed for content)
    const artifact = await prisma.generatedArtifact.upsert({
      where: {
        projectId_artifactType: {
          projectId,
          artifactType: type as ArtifactType,
        },
      },
      create: {
        projectId,
        modelVersionId: modelVersion.id,
        artifactType: type as ArtifactType,
        filename,
        storagePath: content,
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
      },
      update: {
        modelVersionId: modelVersion.id,
        filename,
        storagePath: content,
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
      },
    })

    return NextResponse.json({ artifact, content }, { status: 201 })
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

function generateBRD(projectName: string, modelData: ModelData): string {
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

${actors.map((actor) => `### ${actor.name}

${actor.description}
`).join('\n')}

---

## 2. Entities

${entities.map((entity) => `### ${entity.name}

${entity.description}
`).join('\n')}

---

## 3. User Journeys

${journeys.map((journey) => `### ${journey.name}

${journey.description}
`).join('\n')}

---

## 4. Business Rules

${businessRules.map((rule, index) => `### BR-${String(index + 1).padStart(3, '0')}: ${rule.name}

${rule.description}
`).join('\n')}

---

*Generated by Intent Model Platform*
`
}

function generateTypeScriptTypes(modelData: ModelData): string {
  const { entities = [] } = modelData

  let output = `// TypeScript Type Definitions\n// Generated from Intent Model\n\n`

  entities.forEach((entity) => {
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

function generateZodSchemas(modelData: ModelData): string {
  const { entities = [] } = modelData

  let output = `import { z } from 'zod'\n\n// Zod Validation Schemas\n// Generated from Intent Model\n\n`

  entities.forEach((entity) => {
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

function generateAPIStubs(modelData: ModelData): string {
  const { entities = [] } = modelData

  let output = `// API Route Stubs\n// Generated from Intent Model\n// Copy these to your src/app/api directory\n\n`

  entities.forEach((entity) => {
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

function generateMigration(modelData: ModelData): string {
  const { entities = [] } = modelData

  let output = `-- Database Migration\n-- Generated from Intent Model\n\n`

  entities.forEach((entity) => {
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
