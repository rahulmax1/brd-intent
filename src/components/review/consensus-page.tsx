'use client'

import { useState } from 'react'
import type { SectionReview, SectionType } from '@/domain/intent-model/types'
import { ConsensusDashboard } from './consensus-dashboard'
import { SectionPageClient } from './section-page-client'

type ModelItem = { id: string; [key: string]: unknown }

type SectionData = {
  type: SectionType
  items: Array<{
    item: ModelItem
    type: SectionType
    review: SectionReview
  }>
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'actor', label: 'Actors' },
  { id: 'entity', label: 'Entities' },
  { id: 'journey', label: 'Journeys' },
  { id: 'business_rule', label: 'Rules' },
  { id: 'constraint', label: 'Constraints' },
  { id: 'open_question', label: 'Open Qs' },
] as const

type TabId = (typeof tabs)[number]['id']

type ConsensusPageProps = {
  project: string
  version: string
  status: string
  overviewSections: SectionReview[]
  sectionData: SectionData[]
}

export function ConsensusPage({ project, version, status, overviewSections, sectionData }: ConsensusPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const activeSection = activeTab !== 'overview'
    ? sectionData.find(s => s.type === activeTab)
    : null

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--acfs-navy)' }}>
          {project}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          v{version} — {status}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          const section = tab.id !== 'overview' ? sectionData.find(s => s.type === tab.id) : null
          const count = section?.items.length

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
              {tab.label}
              {count !== undefined && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(0,129,242,0.15)' : 'var(--bg-gray-subtle)',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <ConsensusDashboard sections={overviewSections} onNavigate={(type) => setActiveTab(type)} />
      )}
      {activeSection && (
        <SectionPageClient items={activeSection.items} />
      )}
    </div>
  )
}
