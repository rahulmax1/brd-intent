import { z } from 'zod'
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk'
import { getCurrentModel } from '@/lib/model-store'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'
import type { SectionType } from '@/domain/intent-model/types'

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

let _client: AnthropicBedrock | null = null
function getClient() {
  if (!_client) {
    _client = new AnthropicBedrock({
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    })
  }
  return _client
}

const PlanRequestSchema = z.object({
  prompt: z.string().min(1),
  scope: z.enum(['section', 'full']),
  sectionType: z.enum(['actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question']).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, scope, sectionType } = PlanRequestSchema.parse(body)

    const currentModel = await getCurrentModel()

    let contextJson: string
    if (scope === 'section' && sectionType) {
      const modelKey = SECTION_TYPE_TO_MODEL_KEY[sectionType as SectionType]
      contextJson = JSON.stringify(currentModel[modelKey], null, 2)
    } else {
      contextJson = JSON.stringify(currentModel, null, 2)
    }

    const systemPrompt = `You are an expert business analyst reviewing a structured intent model for a software project.

The user wants to make a change. Your job is to explain WHAT you would change and WHY, so they can confirm before you proceed.

Rules:
- Be concise — 2-4 bullet points max
- Reference specific item names and IDs from the model
- Mention what will be added, modified, or removed
- End with: "Shall I go ahead with these changes?"
- Do NOT return JSON — this is a plain text explanation`

    const userContent = `## Current model (${scope === 'section' ? sectionType : 'full'})
${contextJson}

## Requested change
${prompt}`

    const stream = getClient().messages.stream({
      model: BEDROCK_MODEL,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: 'plan_failed', message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
