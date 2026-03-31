import { getReviewState } from '@/lib/review-store'
import { getCurrentModel } from '@/lib/model-store'
import { buildTargetId, getReviewForTarget } from '@/lib/review-utils'
import { SectionPageClient } from '@/components/review/section-page-client'

export const dynamic = 'force-dynamic'

export default async function ActorsPage() {
  const intentModel = await getCurrentModel()
  const reviewState = await getReviewState()

  const items = intentModel.actors.map(item => {
    const targetId = buildTargetId('actor', item.id)
    const review = getReviewForTarget(reviewState.sections, targetId)
    return { item, type: 'actor' as const, review }
  })

  return (
    <div className="pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Actors</h1>
        <p className="text-base text-muted-foreground">
          {items.length} items
        </p>
      </div>
      <SectionPageClient items={items} />
    </div>
  )
}
