'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Database, Table, Code, Copy, Check } from 'lucide-react'
import { DataModelCanvas } from '@/components/data-model/data-model-canvas'
import { DatabaseSchemaCanvas } from '@/components/data-model/database-schema-canvas'
import { DbmlHighlighter } from '@/components/data-model/dbml-highlighter'
import type { DataModelGraphData } from '@/components/data-model/data-model-graph'
import type { DatabaseSchemaGraphData } from '@/components/data-model/database-schema-graph'
import type { DbmlEnum } from '@/components/data-model/parse-dbml'

type ViewType = 'intent' | 'schema' | 'raw'

type DataModelPageClientProps = {
  intentGraph: DataModelGraphData
  schemaGraph: DatabaseSchemaGraphData
  enums: DbmlEnum[]
  dbmlContent: string
}

export function DataModelPageClient({ intentGraph, schemaGraph, enums, dbmlContent }: DataModelPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view') as ViewType | null

  const [activeView, setActiveView] = useState<ViewType>(viewParam || 'intent')
  const [copied, setCopied] = useState(false)

  // Sync state with URL
  useEffect(() => {
    const view = searchParams.get('view') as ViewType | null
    if (view && ['intent', 'schema', 'raw'].includes(view)) {
      setActiveView(view)
    }
  }, [searchParams])

  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    router.push(`?view=${view}`, { scroll: false })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dbmlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-3 shrink-0"
        style={{
          height: 44,
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-page)',
        }}
      >
        {/* Intent Model tab */}
        <button
          type="button"
          onClick={() => handleViewChange('intent')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            color: activeView === 'intent' ? '#0081F2' : 'var(--text-muted)',
            background: activeView === 'intent' ? 'rgba(0, 129, 242, 0.08)' : 'transparent',
          }}
        >
          <Database size={14} />
          Intent Model
          <span className="text-[11px] ml-1" style={{ opacity: 0.7 }}>
            ({intentGraph.stats.domainCount} entities)
          </span>
        </button>

        {/* Database Schema tab */}
        <button
          type="button"
          onClick={() => handleViewChange('schema')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            color: activeView === 'schema' ? '#0081F2' : 'var(--text-muted)',
            background: activeView === 'schema' ? 'rgba(0, 129, 242, 0.08)' : 'transparent',
          }}
        >
          <Table size={14} />
          Database Schema
          <span className="text-[11px] ml-1" style={{ opacity: 0.7 }}>
            ({schemaGraph.stats.tableCount} tables)
          </span>
        </button>

        {/* Raw DBML tab */}
        <button
          type="button"
          onClick={() => handleViewChange('raw')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            color: activeView === 'raw' ? '#0081F2' : 'var(--text-muted)',
            background: activeView === 'raw' ? 'rgba(0, 129, 242, 0.08)' : 'transparent',
          }}
        >
          <Code size={14} />
          Raw DBML
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'intent' && (
          <DataModelCanvas
            initialNodes={intentGraph.nodes}
            initialEdges={intentGraph.edges}
            stats={intentGraph.stats}
          />
        )}
        {activeView === 'schema' && (
          <DatabaseSchemaCanvas
            initialNodes={schemaGraph.nodes}
            initialEdges={schemaGraph.edges}
            enums={enums}
            stats={schemaGraph.stats}
          />
        )}
        {activeView === 'raw' && (
          <div className="h-full flex flex-col" style={{ background: 'var(--bg-page)' }}>
            {/* Toolbar */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                borderBottom: '1px solid var(--border-default)',
                background: 'var(--bg-white)',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                acfs-production-schema.dbml
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: copied ? '#10B981' : '#0081F2',
                  background: copied ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 129, 242, 0.08)',
                  border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 129, 242, 0.2)'}`,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy DBML'}
              </button>
            </div>

            {/* Code content */}
            <div className="flex-1 overflow-auto p-4">
              <DbmlHighlighter content={dbmlContent} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
