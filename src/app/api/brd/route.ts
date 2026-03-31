import { NextResponse } from 'next/server'
import { getCurrentModel } from '@/lib/model-store'
import { projectRequirements } from '@/domain/project-requirements/requirements'
import { generateBRD } from '@/lib/brd-generator'

export async function GET(request: Request) {
  try {
    const model = await getCurrentModel()
    const markdown = generateBRD(model, projectRequirements)

    const { searchParams } = new URL(request.url)
    if (searchParams.get('format') === 'json') {
      return NextResponse.json({
        markdown,
        meta: {
          version: model.meta.version,
          project: model.meta.project,
          generatedAt: new Date().toISOString(),
        },
      })
    }

    return new NextResponse(markdown, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'brd_generation_failed', message }, { status: 500 })
  }
}
