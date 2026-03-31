import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { kv } from '@vercel/kv'
import type { IAPositions } from '@/components/ia/ia-types'

const isVercel = !!process.env.KV_REST_API_URL
const KV_DRAG_KEY = 'ia-drag-overrides'
const FILE_PATH = resolve(process.cwd(), 'src/components/ia/ia-positions.json')

type DragOverrides = Record<string, { x: number; y: number }>

export async function getIAPositions(): Promise<IAPositions> {
  // Always read the JSON file as source of truth for screens/edges/lanes
  let base: IAPositions
  try {
    const raw = await readFile(FILE_PATH, 'utf-8')
    base = JSON.parse(raw) as IAPositions
  } catch {
    // Vercel: file may not exist, seed from KV as fallback
    if (isVercel) {
      const kvData = await kv.get<IAPositions>(KV_DRAG_KEY)
      if (kvData) return kvData
    }
    return { _screens: {}, _edges: {}, _lanes: {} } as unknown as IAPositions
  }

  // Merge drag position overrides from KV (Vercel only)
  if (isVercel) {
    const overrides = await kv.get<DragOverrides>(KV_DRAG_KEY)
    if (overrides) {
      for (const [nodeId, pos] of Object.entries(overrides)) {
        if (base._screens?.[nodeId]) {
          base[nodeId] = pos
        }
      }
    }
  }

  return base
}

export async function saveNodePosition(nodeId: string, x: number, y: number) {
  const positions = await getIAPositions()

  if (!positions._screens?.[nodeId]) {
    throw new Error(`Screen "${nodeId}" not found`)
  }

  positions[nodeId] = { x: Math.round(x), y: Math.round(y) }

  if (isVercel) {
    // Only save drag overrides to KV, not the full config
    const overrides = (await kv.get<DragOverrides>(KV_DRAG_KEY)) ?? {}
    overrides[nodeId] = { x: Math.round(x), y: Math.round(y) }
    await kv.set(KV_DRAG_KEY, overrides)
  } else {
    await writeFile(FILE_PATH, JSON.stringify(positions, null, 2) + '\n', 'utf-8')
  }
}
