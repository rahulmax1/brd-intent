import { NextResponse } from 'next/server'
import { saveNodePosition } from '@/lib/ia-positions-store'

export async function POST(req: Request) {
  try {
    const { nodeId, x, y } = await req.json()

    if (!nodeId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await saveNodePosition(nodeId, x, y)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save'
    console.error('[IA] Failed to save position:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
