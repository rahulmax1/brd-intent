// Project Detail API - Get, Update, Delete
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// GET /api/projects/:projectId - Get project details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            category: true,
            processingStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        intentModelVersions: {
          select: {
            id: true,
            versionNumber: true,
            modelData: true,
            isSeed: true,
            isSnapshot: true,
            snapshotLabel: true,
            createdAt: true,
          },
          orderBy: { versionNumber: 'desc' },
          take: 5,
        },
        generatedArtifacts: {
          select: {
            id: true,
            artifactType: true,
            filename: true,
            sizeBytes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            intentModelVersions: true,
            reviewDecisions: true,
            generatedArtifacts: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/:projectId - Update project
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params
    const body = await request.json()

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build update data
    const updateData: {
      name?: string
      description?: string | null
      phase?: string
      phaseData?: object
    } = {}

    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return NextResponse.json(
          { error: 'Project name must be at least 3 characters' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.phase !== undefined) {
      // Validate phase transition
      const validPhases = ['UPLOAD', 'DRAFT', 'REVIEW', 'CONSENSUS', 'EXPORT', 'ARCHIVED']
      if (!validPhases.includes(body.phase)) {
        return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
      }
      updateData.phase = body.phase
    }

    if (body.phaseData !== undefined) {
      updateData.phaseData = body.phaseData
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData as any,
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:projectId - Archive project
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Soft delete by setting archivedAt
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        archivedAt: new Date(),
        phase: 'ARCHIVED',
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to archive project:', error)
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    )
  }
}
