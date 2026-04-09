// Reset Intent Model API - Deletes all model versions, review decisions, and artifacts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// POST /api/projects/:projectId/reset-model
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Transaction: delete all model-related data and reset phase
    const [, , , project] = await prisma.$transaction([
      prisma.reviewDecision.deleteMany({ where: { projectId } }),
      prisma.generatedArtifact.deleteMany({ where: { projectId } }),
      prisma.intentModelVersion.deleteMany({ where: { projectId } }),
      prisma.project.update({
        where: { id: projectId },
        data: { phase: 'UPLOAD' },
      }),
    ])

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to reset model:', error)
    return NextResponse.json(
      { error: 'Failed to reset intent model' },
      { status: 500 }
    )
  }
}
