// Generate Draft Intent Model API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readFile } from 'fs/promises'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// POST /api/projects/:projectId/generate-draft
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        documents: {
          where: {
            processingStatus: 'COMPLETED',
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents available to generate draft' },
        { status: 400 }
      )
    }

    // Read document contents
    const documentContents: string[] = []
    for (const doc of project.documents) {
      try {
        const content = await readFile(doc.storagePath, 'utf-8')
        documentContents.push(`=== ${doc.filename} ===\n${content}`)
      } catch (err) {
        console.error(`Failed to read document ${doc.id}:`, err)
      }
    }

    // Check if a draft already exists
    const existingVersion = await prisma.intentModelVersion.findFirst({
      where: { projectId },
    })

    if (existingVersion) {
      return NextResponse.json(
        { error: 'Draft already exists' },
        { status: 409 }
      )
    }

    // Generate intent model using AI
    // For MVP, we'll use a mock implementation
    // In production, this would call Anthropic Claude API
    const modelData = await generateIntentModel(documentContents, project.name)

    // Get next version number (should be 1 since we checked no versions exist)
    const versionNumber = 1

    // Create model version
    const modelVersion = await prisma.intentModelVersion.create({
      data: {
        projectId,
        versionNumber,
        modelData,
        isSeed: versionNumber === 1,
        prompt: 'Initial draft generation from uploaded documents',
      },
    })

    return NextResponse.json({ modelVersion }, { status: 201 })
  } catch (error) {
    console.error('Failed to generate draft:', error)
    return NextResponse.json(
      { error: 'Failed to generate draft' },
      { status: 500 }
    )
  }
}

// AI-powered intent model generation using Claude via Bedrock
async function generateIntentModel(
  documentContents: string[],
  projectName: string
): Promise<object> {
  const AnthropicBedrock = (await import('@anthropic-ai/bedrock-sdk')).default
  const BEDROCK_MODEL = 'anthropic.claude-sonnet-4-20250514-v1:0'

  try {
    const client = new AnthropicBedrock({
      awsRegion: process.env.AWS_REGION ?? 'ap-southeast-2',
    })

    const allDocuments = documentContents.join('\n\n')

    const systemPrompt = `You are an expert business analyst. Analyze the provided documents and extract a structured intent model with these components:

1. **Actors**: People or systems that interact with the system (roles, not specific individuals)
2. **Entities**: Core data objects or domain concepts
3. **Journeys**: Key user workflows or processes
4. **Business Rules**: Constraints, validations, or policies that govern the system

Return ONLY valid JSON in this exact format:
{
  "actors": [{"id": "actor-1", "name": "string", "description": "string"}],
  "entities": [{"id": "entity-1", "name": "string", "description": "string"}],
  "journeys": [{"id": "journey-1", "name": "string", "description": "string"}],
  "businessRules": [{"id": "rule-1", "name": "string", "description": "string"}]
}

Guidelines:
- Generate 2-5 items per category based on document content
- IDs must be unique and sequential (actor-1, actor-2, etc.)
- Names should be concise (3-6 words)
- Descriptions should be clear and specific (10-20 words)
- Extract from actual document content, don't invent generic items`

    const response = await client.messages.create({
      model: BEDROCK_MODEL,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Project: ${projectName}\n\nDocuments:\n${allDocuments.slice(0, 30000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const content = textBlock?.text

    if (!content) {
      console.error('No content in Claude response')
      return generateMockModel(projectName)
    }

    // Parse JSON response — strip markdown fences if present
    const jsonStr = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (!parsed.actors || !parsed.entities || !parsed.journeys || !parsed.businessRules) {
      console.error('Invalid model structure from AI')
      return generateMockModel(projectName)
    }

    return parsed
  } catch (error) {
    console.error('Failed to generate with AI:', error)
    return generateMockModel(projectName)
  }
}

// Fallback mock generation if API unavailable
function generateMockModel(projectName: string): object {
  return {
    actors: [
      {
        id: 'actor-1',
        name: 'System Administrator',
        description: 'Manages system configuration, user accounts, and overall platform health',
      },
      {
        id: 'actor-2',
        name: 'End User',
        description: 'Primary user who interacts with the system to accomplish their goals',
      },
    ],
    entities: [
      {
        id: 'entity-1',
        name: 'User Account',
        description: 'Represents a registered user with authentication credentials and profile information',
      },
      {
        id: 'entity-2',
        name: 'Document',
        description: 'An uploaded file containing requirements, specifications, or other project information',
      },
    ],
    journeys: [
      {
        id: 'journey-1',
        name: 'User Onboarding',
        description: 'New user registers, verifies email, and completes initial profile setup',
      },
      {
        id: 'journey-2',
        name: 'Document Processing',
        description: 'User uploads documents, system processes and extracts text, marks as ready for analysis',
      },
    ],
    businessRules: [
      {
        id: 'rule-1',
        name: 'Document Size Limit',
        description: 'All uploaded documents must be under 10MB in size',
      },
      {
        id: 'rule-2',
        name: 'Phase Progression',
        description: 'Projects must progress through phases: Upload → Draft → Consensus → Export',
      },
    ],
  }
}
