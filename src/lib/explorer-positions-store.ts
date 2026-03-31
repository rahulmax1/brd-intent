import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { kv } from '@vercel/kv'

export type ExplorerPositions = Record<string, { x: number; y: number }>

const isVercel = !!process.env.KV_REST_API_URL
const KV_KEY = 'explorer-positions'
const FILE_PATH = resolve(process.cwd(), 'src/components/explorer/explorer-positions.json')

export async function getExplorerPositions(): Promise<ExplorerPositions> {
  if (isVercel) {
    const kvData = await kv.get<ExplorerPositions>(KV_KEY)
    if (kvData) return kvData
  }

  try {
    const raw = await readFile(FILE_PATH, 'utf-8')
    return JSON.parse(raw) as ExplorerPositions
  } catch {
    return {}
  }
}

export async function saveExplorerPosition(nodeId: string, x: number, y: number) {
  const positions = await getExplorerPositions()

  positions[nodeId] = { x: Math.round(x), y: Math.round(y) }

  if (isVercel) {
    await kv.set(KV_KEY, positions)
  } else {
    await writeFile(FILE_PATH, JSON.stringify(positions, null, 2) + '\n', 'utf-8')
  }
}
