// Review Decision API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// POST /api/projects/:projectId/reviews - Submit review decision
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params
    const body = await request.json()
    const { modelVersionId, targetType, targetId, status, comment } = body

    // Validate
    if (!modelVersionId || !targetType || !targetId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['APPROVED', 'DISPUTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be APPROVED or DISPUTED' },
        { status: 400 }
      )
    }

    const validTypes = ['ACTOR', 'ENTITY', 'JOURNEY', 'BUSINESS_RULE', 'CONSTRAINT', 'OPEN_QUESTION']
    if (!validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if model version exists
    const modelVersion = await prisma.intentModelVersion.findUnique({
      where: { id: modelVersionId },
    })

    if (!modelVersion) {
      return NextResponse.json({ error: 'Model version not found' }, { status: 404 })
    }

    // Upsert review decision
    const decision = await prisma.reviewDecision.upsert({
      where: {
        projectId_modelVersionId_targetType_targetId: {
          projectId,
          modelVersionId,
          targetType,
          targetId,
        },
      },
      create: {
        projectId,
        modelVersionId,
        targetType,
        targetId,
        status,
        comment: comment || null,
      },
      update: {
        status,
        comment: comment || null,
      },
    })

    return NextResponse.json({ decision }, { status: 200 })
  } catch (error) {
    console.error('Failed to submit review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
}
