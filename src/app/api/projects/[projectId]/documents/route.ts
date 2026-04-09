// Document Upload API
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// POST /api/projects/:projectId/documents - Upload documents
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate files
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        )
      }
    }

    // Process each file — extract text and store in database
    const documents = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const textContent = buffer.toString('utf-8')

      const category = determineCategory(file.name)

      const document = await prisma.document.create({
        data: {
          projectId,
          filename: file.name,
          originalFilename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          storagePath: 'db',
          label: file.name,
          category: category as any,
          processingStatus: 'COMPLETED',
          extractedText: textContent,
        },
      })

      documents.push(document)
    }

    return NextResponse.json({ documents }, { status: 201 })
  } catch (error) {
    console.error('Failed to upload documents:', error)
    return NextResponse.json(
      { error: 'Failed to upload documents' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:projectId/documents?id=xxx - Delete a document
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { projectId } = await context.params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, projectId },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.document.delete({ where: { id: documentId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

function determineCategory(filename: string): string {
  const lower = filename.toLowerCase()

  if (lower.includes('brd') || lower.includes('requirements')) {
    return 'BRD'
  }
  if (lower.includes('transcript') || lower.includes('meeting')) {
    return 'TRANSCRIPT'
  }
  if (lower.includes('miro') || lower.includes('whiteboard')) {
    return 'MIRO'
  }
  if (lower.includes('technical') || lower.includes('spec')) {
    return 'TECHNICAL'
  }

  return 'UPLOAD'
}
