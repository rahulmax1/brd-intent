// Get Review Decisions for Model Version
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string; versionId: string }>
}

// GET /api/projects/:projectId/reviews/:versionId
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId, versionId } = await context.params

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all review decisions for this model version
    const decisions = await prisma.reviewDecision.findMany({
      where: {
        projectId,
        modelVersionId: versionId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ decisions })
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
