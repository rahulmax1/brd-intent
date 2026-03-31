'use client'

import { SectionCard } from './section-renderer'
import type { SectionReview, SectionType } from '@/domain/intent-model/types'

type ModelItem = { id: string; [key: string]: unknown }

type SectionPageClientProps = {
  items: Array<{
    item: ModelItem
    type: SectionType
    review: SectionReview
  }>
}

export function SectionPageClient({ items }: SectionPageClientProps) {
  return (
    <div className="space-y-4">
      {items.map(({ item, type, review }) => (
        <SectionCard
          key={review.targetId}
          item={item as any}
          type={type}
          review={review}
        />
      ))}
    </div>
  )
}
