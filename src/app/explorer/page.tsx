import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getCurrentModel } from '@/lib/model-store'
import { getExplorerPositions } from '@/lib/explorer-positions-store'
import { NavSidebar } from '@/components/review/nav-links'
import { ExplorerTabs } from '@/components/explorer/explorer-tabs'

export const dynamic = 'force-dynamic'

const MODEL_SOURCE_PATH = resolve(process.cwd(), 'src/domain/intent-model/model.ts')

async function readModelSource(): Promise<string> {
  try {
    return await readFile(MODEL_SOURCE_PATH, 'utf-8')
  } catch {
    return '// Source file not available in this environment'
  }
}

export default async function ExplorerPage() {
  const [model, savedPositions, modelSource] = await Promise.all([
    getCurrentModel(),
    getExplorerPositions(),
    readModelSource(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <NavSidebar />
      <div className="flex-1 overflow-hidden">
        <ExplorerTabs model={model} savedPositions={savedPositions} modelSource={modelSource} />
      </div>
    </div>
  )
}
