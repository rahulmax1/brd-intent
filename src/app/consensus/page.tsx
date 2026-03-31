import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { getAllModelItems, buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { ConsensusPage } from '@/components/review/consensus-page'
import type { SectionType } from '@/domain/intent-model/types'
import { SECTION_TYPE_TO_MODEL_KEY } from '@/domain/intent-model/types'

export const dynamic = 'force-dynamic'

const sectionOrder: SectionType[] = [
  'actor', 'entity', 'journey', 'business_rule', 'constraint', 'open_question',
]

export default async function ReviewDashboard() {
  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  // Build overview stats
  const allItems = getAllModelItems(intentModel)
  const overviewSections = allItems.map(({ item, type }) => {
    const targetId = buildTargetId(type, item.id)
    return getReviewForTarget(reviewState.sections, targetId)
  })

  // Build per-section items
  const sectionData = sectionOrder.map(type => {
    const modelKey = SECTION_TYPE_TO_MODEL_KEY[type] as keyof typeof intentModel
    const modelItems = intentModel[modelKey] as Array<{ id: string; [key: string]: unknown }>

    const items = modelItems.map(item => {
      const targetId = buildTargetId(type, item.id)
      const review = getReviewForTarget(reviewState.sections, targetId)
      return { item, type, review }
    })

    return { type, items }
  })

  return (
    <ConsensusPage
      project={intentModel.meta.project}
      version={intentModel.meta.version}
      status={intentModel.meta.status}
      overviewSections={overviewSections}
      sectionData={sectionData}
    />
  )
}
