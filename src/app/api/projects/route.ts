// Projects API - List and Create
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        archivedAt: null, // Only active projects
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        phase: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            intentModelVersions: true,
          },
        },
      },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    // Validate
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Project name must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Generate slug
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check for slug collisions
    let slug = baseSlug
    let suffix = 1
    while (true) {
      const existing = await prisma.project.findUnique({
        where: { slug },
      })
      if (!existing) break
      slug = `${baseSlug}-${suffix++}`
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        phase: 'UPLOAD',
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
