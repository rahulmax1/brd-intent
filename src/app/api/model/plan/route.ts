import { z } from 'zod'
import OpenAI from 'openai'
import { getCurrentModel } from '@/lib/model-store'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'
import type { SectionType } from '@/domain/intent-model/types'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI()
  return _openai
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

    const stream = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(text))
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
