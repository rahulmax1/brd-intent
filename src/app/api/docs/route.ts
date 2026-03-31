import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { getDoc, getAllDocs } from '@/lib/docs-config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({
      docs: getAllDocs().map(d => ({ slug: d.slug, label: d.label, category: d.category, type: d.type ?? 'md' })),
    })
  }

  const doc = getDoc(slug)
  if (!doc) {
    return NextResponse.json({ error: 'Doc not found' }, { status: 404 })
  }

  const isPdf = doc.type === 'pdf'

  try {
    if (isPdf) {
      const buffer = await readFile(doc.path)
      const base64 = buffer.toString('base64')
      return NextResponse.json({
        slug: doc.slug,
        label: doc.label,
        category: doc.category,
        type: 'pdf',
        content: base64,
      })
    }

    const content = await readFile(doc.path, 'utf-8')
    return NextResponse.json({
      slug: doc.slug,
      label: doc.label,
      category: doc.category,
      type: 'md',
      content,
    })
  } catch {
    return NextResponse.json({ error: 'File not readable' }, { status: 500 })
  }
}
