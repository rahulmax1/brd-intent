import OpenAI from 'openai'
import type { IntentModel, SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'
import { IntentModelSchema, SectionSchemas } from './model-schemas'
import { projectConfig } from '@/lib/project-config'
import { generateTypeDefinitions } from './ai-type-definitions'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

// Generate type definitions dynamically from source types
const TYPE_DEFINITIONS = generateTypeDefinitions()

function buildSystemPrompt(scope: 'full' | 'section', sectionType?: SectionType): string {
  const scopeInstruction = scope === 'full'
    ? 'Return the complete updated IntentModel as valid JSON.'
    : `Return only the updated "${sectionType}" section as a JSON object with a single key "${SECTION_TYPE_TO_MODEL_KEY[sectionType!]}".`

  return `You are an expert business analyst editing a structured intent model for a software project.

## Type Definitions
${TYPE_DEFINITIONS}

## Rules
- ${scopeInstruction}
- Preserve ALL existing data unless the user's prompt explicitly asks to change it.
- Preserve all "warn" and "edge" annotations unless the user specifically asks to modify them.
- Generate sequential IDs following existing patterns (e.g. ${projectConfig.ai.idPatternHint}).
- Return ONLY valid JSON. No markdown, no explanation, no wrapping.`
}

export type EditRequest = {
  prompt: string
  scope: 'full' | 'section'
  sectionType?: SectionType
  currentModel: IntentModel
}

export type EditResponse = {
  model: IntentModel
}

export async function callOpenAI(req: EditRequest): Promise<EditResponse> {
  const systemPrompt = buildSystemPrompt(req.scope, req.sectionType)

  let userContent: string
  if (req.scope === 'section' && req.sectionType) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[req.sectionType]
    // Compact ID index for cross-referencing without sending full model
    const idIndex = {
      actors: req.currentModel.actors.map(a => a.id),
      entities: req.currentModel.entities.map(e => e.id),
      journeys: req.currentModel.journeys.map(j => j.id),
      businessRules: req.currentModel.businessRules.map(r => r.id),
      constraints: req.currentModel.constraints.map(c => c.id),
      openQuestions: req.currentModel.openQuestions.map(q => q.id),
    }
    userContent = `## Available IDs in other sections (for cross-references)
${JSON.stringify(idIndex)}

## Section to edit: ${modelKey}
${JSON.stringify(req.currentModel[modelKey], null, 2)}

## Edit instruction
${req.prompt}`
  } else {
    userContent = `## Current model
${JSON.stringify(req.currentModel, null, 2)}

## Edit instruction
${req.prompt}`
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    max_tokens: req.scope === 'section' ? 8000 : 16000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')

  const parsed = JSON.parse(content)

  // Validate with zod
  if (req.scope === 'section' && req.sectionType) {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[req.sectionType]
    const schema = SectionSchemas[modelKey as keyof typeof SectionSchemas]
    const result = schema.parse(parsed)
    // Merge back into full model
    const merged = structuredClone(req.currentModel)
    const newItems = (result as Record<string, unknown>)[modelKey] as Array<{ id: string }>
    const originalItems = (req.currentModel[modelKey] as Array<{ id: string }>)

    // Restore any items the LLM dropped (common with gpt-4o-mini on scoped edits)
    const newIds = new Set(newItems.map(i => i.id))
    for (const original of originalItems) {
      if (!newIds.has(original.id)) {
        newItems.push(structuredClone(original))
      }
    }

    ;(merged as Record<string, unknown>)[modelKey] = newItems
    return { model: merged }
  }

  const validated = IntentModelSchema.parse(parsed)
  return { model: validated as IntentModel }
}
