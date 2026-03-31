import { notFound } from 'next/navigation'
import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { SectionPageClient } from '@/components/review/section-page-client'
import type { SectionType } from '@/domain/intent-model/types'
import { URL_PARAM_TO_SECTION_TYPE, SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export const dynamic = 'force-dynamic'

const sectionLabels: Record<SectionType, string> = {
  actor: 'Actors',
  entity: 'Entities',
  journey: 'Journeys',
  business_rule: 'Business Rules',
  constraint: 'Constraints',
  open_question: 'Open Questions',
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const sectionType = URL_PARAM_TO_SECTION_TYPE[section]
  if (!sectionType) notFound()

  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  const modelKey = SECTION_TYPE_TO_MODEL_KEY[sectionType] as keyof typeof intentModel
  const modelItems = intentModel[modelKey] as Array<{ id: string; [key: string]: unknown }>

  const items = modelItems.map(item => {
    const targetId = buildTargetId(sectionType, item.id)
    const review = getReviewForTarget(reviewState.sections, targetId)
    return { item, type: sectionType, review }
  })

  return (
    <div className="pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{sectionLabels[sectionType]}</h1>
        <p className="text-base text-muted-foreground">
          {items.length} items
        </p>
      </div>
      <SectionPageClient items={items} />
    </div>
  )
}
