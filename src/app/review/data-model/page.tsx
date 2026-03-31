import { Suspense } from 'react'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getCurrentModel } from '@/lib/model-store'
import { buildDataModelGraph } from '@/components/data-model/data-model-graph'
import { buildDatabaseSchemaGraph } from '@/components/data-model/database-schema-graph'
import { parseDbml } from '@/components/data-model/parse-dbml'
import { DataModelPageClient } from './page-client'

export default async function DataModelPage() {
  // Load intent model
  const intentModel = await getCurrentModel()
  const intentGraph = buildDataModelGraph(intentModel)

  // Load production database schema (merged Intent Model v0.8.0 + VBS_DBML operational enhancements)
  const dbmlPath = join(process.cwd(), 'src/data/acfs-production-schema.dbml')
  const dbmlContent = await readFile(dbmlPath, 'utf-8')
  const dbmlSchema = parseDbml(dbmlContent)
  const schemaGraph = buildDatabaseSchemaGraph(dbmlSchema)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DataModelPageClient
        intentGraph={intentGraph}
        schemaGraph={schemaGraph}
        enums={dbmlSchema.enums}
        dbmlContent={dbmlContent}
      />
    </Suspense>
  )
}
