import { getCurrentModel } from '@/lib/model-store'
import { getIAPositions } from '@/lib/ia-positions-store'
import { IACanvas } from '@/components/ia/ia-canvas'
import { buildIAGraph } from '@/components/ia/ia-graph'

export default async function IAPage() {
  const model = await getCurrentModel()
  const positions = await getIAPositions()
  const { nodes, edges, drift, stats } = buildIAGraph(model, positions)

  return (
    <div className="h-full w-full overflow-hidden">
      <IACanvas
        initialNodes={nodes}
        initialEdges={edges}
        drift={drift}
        stats={stats}
      />
    </div>
  )
}
