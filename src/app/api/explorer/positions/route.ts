import { NextResponse } from 'next/server'
import { saveExplorerPosition } from '@/lib/explorer-positions-store'

export async function POST(req: Request) {
  try {
    const { nodeId, x, y } = await req.json()

    if (!nodeId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await saveExplorerPosition(nodeId, x, y)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save'
    console.error('[Explorer] Failed to save position:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
