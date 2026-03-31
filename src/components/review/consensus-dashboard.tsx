'use client'

import type { SectionReview, SectionType } from '@/domain/intent-model/types'

type DashboardProps = {
  sections: SectionReview[]
  onNavigate?: (type: SectionType) => void
}

const sectionTypeLabels: Record<SectionType, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Business Rules',
  constraint: 'Constraints',
  open_question: 'Open Questions',
}

const sectionTypeOrder: SectionType[] = [
  'actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question',
]

export function ConsensusDashboard({ sections, onNavigate }: DashboardProps) {
  return (
    <div className="space-y-2">
      {sectionTypeOrder.map(type => {
        const typeSections = sections.filter(s => s.targetType === type)
        if (typeSections.length === 0) return null

        const approved = typeSections.filter(s => s.status === 'approved').length
        const disputed = typeSections.filter(s => s.status === 'disputed').length
        const totalComments = typeSections.reduce((sum, s) => sum + (s.comments?.length ?? 0), 0)

        return (
          <button
            key={type}
            type="button"
            onClick={() => onNavigate?.(type)}
            className="w-full text-left"
          >
            <div
              className="rounded-xl px-5 py-4 transition-all duration-200 hover:shadow-md mb-1"
              style={{
                background: 'var(--bg-white)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--acfs-navy)' }}>
                    {sectionTypeLabels[type]}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    {typeSections.length} items
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  {approved > 0 && <span style={{ color: 'var(--accent-green)' }}>{approved} approved</span>}
                  {disputed > 0 && <span style={{ color: '#E11D48' }}>{disputed} disputed</span>}
                  {totalComments > 0 && <span style={{ color: 'var(--text-muted)' }}>{totalComments} comments</span>}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
