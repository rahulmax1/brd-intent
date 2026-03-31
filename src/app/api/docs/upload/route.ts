import { NextResponse } from 'next/server'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const UPLOADS_DIR = join(process.cwd(), 'docs', 'uploads')
const ALLOWED_TYPES = ['application/pdf', 'text/markdown', 'text/x-markdown', 'text/plain']
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'md') {
      return NextResponse.json({ error: 'Only .pdf and .md files are allowed' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type) && ext !== 'md') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Sanitise filename: lowercase, replace spaces with hyphens, strip non-alphanumeric
    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
    const slug = `upload-${baseName}`
    const fileName = `${baseName}.${ext}`
    const filePath = join(UPLOADS_DIR, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    return NextResponse.json({
      slug,
      label: file.name.replace(/\.[^.]+$/, ''),
      fileName,
      type: ext,
    })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
