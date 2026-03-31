import { NextResponse } from 'next/server'
import { getVersion } from '@/lib/model-store'
import { computeModelDiff } from '@/lib/model-diff'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromId = searchParams.get('from')
  const toId = searchParams.get('to')

  if (!fromId || !toId) {
    return NextResponse.json(
      { error: 'Both "from" and "to" version IDs are required' },
      { status: 400 },
    )
  }

  const [fromVersion, toVersion] = await Promise.all([
    getVersion(fromId),
    getVersion(toId),
  ])

  if (!fromVersion) {
    return NextResponse.json({ error: `Version "${fromId}" not found` }, { status: 404 })
  }
  if (!toVersion) {
    return NextResponse.json({ error: `Version "${toId}" not found` }, { status: 404 })
  }

  const diff = computeModelDiff(fromVersion.model, toVersion.model)

  return NextResponse.json({
    from: { id: fromVersion.id, version: fromVersion.model.meta.version, author: fromVersion.author, timestamp: fromVersion.timestamp },
    to: { id: toVersion.id, version: toVersion.model.meta.version, author: toVersion.author, timestamp: toVersion.timestamp },
    diff,
    models: { previous: fromVersion.model, current: toVersion.model },
  })
}
