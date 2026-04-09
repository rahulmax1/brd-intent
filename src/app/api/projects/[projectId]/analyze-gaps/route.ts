// Analyze gaps between uploaded documents and generated intent model
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk'

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        documents: {
          where: { processingStatus: 'COMPLETED' },
          select: { filename: true, extractedText: true },
        },
        intentModelVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { modelData: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const modelData = project.intentModelVersions[0]?.modelData
    if (!modelData) {
      return NextResponse.json({ error: 'No intent model found' }, { status: 400 })
    }

    const docContents = project.documents
      .filter(d => d.extractedText)
      .map(d => `=== ${d.filename} ===\n${d.extractedText}`)
      .join('\n\n')

    if (!docContents) {
      return NextResponse.json({ error: 'No document content available' }, { status: 400 })
    }

    const client = new AnthropicBedrock({
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    })

    const response = await client.messages.create({
      model: BEDROCK_MODEL,
      system: `You are an expert business analyst. Compare the uploaded source documents against the generated intent model. Identify gaps — things mentioned in the documents that are missing or underrepresented in the intent model.

Return ONLY valid JSON as an array of suggestions:
[
  {
    "id": "gap-1",
    "section": "actors" | "entities" | "journeys" | "businessRules" | "constraints",
    "type": "add" | "modify",
    "title": "Short title of the gap",
    "description": "What's missing or needs changing",
    "evidence": "Quote or reference from the source document",
    "priority": "high" | "medium" | "low"
  }
]

Guidelines:
- Only suggest gaps that are clearly supported by the source documents
- Be specific — reference actual content from the documents
- Limit to 10 most important gaps
- Prioritize high-impact structural gaps over minor wording issues`,
      messages: [
        {
          role: 'user',
          content: `## Source Documents\n${docContents.slice(0, 20000)}\n\n## Current Intent Model\n${JSON.stringify(modelData, null, 2).slice(0, 15000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const content = textBlock?.text
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const jsonStr = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const suggestions = JSON.parse(jsonStr)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Gap analysis failed:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Gap analysis failed', message }, { status: 500 })
  }
}
