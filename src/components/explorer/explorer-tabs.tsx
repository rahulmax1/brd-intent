'use client'

import { useState } from 'react'
import { Network, BookOpen, Code2, Box, Workflow } from 'lucide-react'
import type { IntentModel } from '@/domain/intent-model/types'
import { ExplorerCanvas } from './explorer-canvas'
import { ModelReader } from './model-reader'
import { ModelSource } from './model-source'
import { Graph3D } from './graph-3d'
import { IntentDiagram } from './intent-diagram'
import type { ExplorerPositions } from '@/lib/explorer-positions-store'

const tabs = [
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'intent', label: 'Intent', icon: Workflow },
  { id: '3d', label: '3D', icon: Box },
  { id: 'model', label: 'Model', icon: BookOpen },
  { id: 'source', label: 'Source', icon: Code2 },
] as const

type TabId = (typeof tabs)[number]['id']

export function ExplorerTabs({ model, savedPositions, modelSource }: { model: IntentModel; savedPositions: ExplorerPositions; modelSource: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('graph')

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
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
              style={{
                color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-blue-subtle)' : 'transparent',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graph' && (
          <ExplorerCanvas model={model} savedPositions={savedPositions} />
        )}
        {activeTab === 'intent' && (
          <IntentDiagram model={model} />
        )}
        {activeTab === '3d' && (
          <Graph3D model={model} />
        )}
        {activeTab === 'model' && (
          <ModelReader model={model} />
        )}
        {activeTab === 'source' && (
          <ModelSource source={modelSource} />
        )}
      </div>
    </div>
  )
}
