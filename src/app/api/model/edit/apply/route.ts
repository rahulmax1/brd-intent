import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProposal, addVersion, getLatestVersionId } from '@/lib/model-store'
import { writeBRD } from '@/lib/brd-generator'
import { exportContract } from '@/lib/contract-export'
import type { ModelVersion } from '@/lib/model-store'
import { computeModelStatus } from '@/lib/model-validation'
import { validateModelSync } from '@/lib/model-sync-validator'

const ApplyRequestSchema = z.object({
  proposalId: z.string(),
  author: z.string(),
  prompt: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { proposalId, author, prompt } = ApplyRequestSchema.parse(body)

    const proposal = await getProposal(proposalId)
    if (!proposal) {
      return NextResponse.json({ error: 'proposal_expired' }, { status: 410 })
    }

    const currentLatest = await getLatestVersionId()
    if (currentLatest !== proposal.latestVersionId) {
      return NextResponse.json({ error: 'version_conflict', currentVersionId: currentLatest }, { status: 409 })
    }

    // Validate model sync before applying
    const validation = await validateModelSync(proposal.proposedModel)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'validation_failed',
        issues: validation.issues,
        suggestions: validation.suggestions,
      }, { status: 400 })
    }

    // Log warnings if any
    const warnings = validation.issues.filter(i => i.severity === 'warning')
    if (warnings.length > 0) {
      console.warn('[Model Sync] Validation warnings:', warnings)
    }

    // Recompute status before persisting
    const model = proposal.proposedModel
    model.meta.status = computeModelStatus(model)
    model.meta.lastUpdated = new Date().toISOString().split('T')[0]

    const version: ModelVersion = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      author,
      prompt,
      model,
      parentId: proposal.latestVersionId,
    }

    await addVersion(version)

    // Auto-generate BRD + export contract (local dev only — no persistent FS on Vercel)
    if (!process.env.KV_REST_API_URL) {
      await writeBRD(version.model)
      exportContract(version.model)
    }

    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'apply_failed', message }, { status: 500 })
  }
}
