import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { SectionPageClient } from '@/components/review/section-page-client'

export const dynamic = 'force-dynamic'

export default async function RulesPage() {
  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  const items = intentModel.businessRules.map(item => {
    const targetId = buildTargetId('business_rule', item.id)
    const review = getReviewForTarget(reviewState.sections, targetId)
    return { item, type: 'business_rule' as const, review }
  })

  return (
    <div className="pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Business Rules</h1>
        <p className="text-base text-muted-foreground">
          {items.length} items
        </p>
      </div>
      <SectionPageClient items={items} />
    </div>
  )
}
