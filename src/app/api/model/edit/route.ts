import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentModel, getLatestVersionId, storeProposal } from '@/lib/model-store'
import { callOpenAI } from '@/lib/ai-prompt'
import { validateModel } from '@/lib/model-validation'
import { computeModelDiff } from '@/lib/model-diff'
import type { SectionType } from '@/domain/intent-model/types'

const EditRequestSchema = z.object({
  prompt: z.string().min(1),
  scope: z.enum(['section', 'full']),
  sectionType: z.enum(['actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question']).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, scope, sectionType } = EditRequestSchema.parse(body)

    const currentModel = await getCurrentModel()
    const latestVersionId = await getLatestVersionId()

    const { model: proposedModel } = await callOpenAI({
      prompt,
      scope,
      sectionType: sectionType as SectionType | undefined,
      currentModel,
    })

    const validation = validateModel(proposedModel, currentModel, prompt)
    if (!validation.valid) {
      return NextResponse.json({ error: 'validation_failed', details: validation.errors }, { status: 422 })
    }

    const diff = computeModelDiff(currentModel, validation.model)

    if (diff.sections.length === 0) {
      return NextResponse.json({ error: 'no_changes', message: 'No changes detected' }, { status: 200 })
    }

    const proposalId = crypto.randomUUID()
    await storeProposal({
      proposalId,
      proposedModel: validation.model,
      latestVersionId,
      prompt,
    })

    return NextResponse.json({
      proposalId,
      diff,
      proposedModel: validation.model,
      warnings: validation.warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'edit_failed', message }, { status: 500 })
  }
}
