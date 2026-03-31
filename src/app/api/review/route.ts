import { NextRequest, NextResponse } from 'next/server'
import { getReviewState, setReviewState } from '@/lib/review-store'
import { ReviewActionSchema } from '@/lib/review-schemas'
import { getAllModelItems, buildTargetId } from '@/lib/review-utils'
import { getCurrentModel } from '@/lib/model-store'

export async function GET() {
  const reviewState = await getReviewState()
  return NextResponse.json(reviewState)
}

export async function POST(request: NextRequest) {
  const intentModel = await getCurrentModel()
  const body = await request.json()
  const parsed = ReviewActionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { targetId, action, comment } = parsed.data
  const reviewState = await getReviewState()

  let section = reviewState.sections.find(s => s.targetId === targetId)

  if (!section) {
    const modelItems = getAllModelItems(intentModel)
    const [type, id] = targetId.split(':')
    const modelItem = modelItems.find(mi => mi.type === type && mi.item.id === id)

    if (!modelItem) {
      return NextResponse.json({ error: 'Model item not found' }, { status: 404 })
    }

    section = {
      targetId,
      targetType: modelItem.type,
      status: 'pending',
      comments: [],
    }
    reviewState.sections.push(section)
  }

  if (comment?.trim()) {
    section.comments.push({
      text: comment.trim(),
      timestamp: new Date().toISOString(),
    })
  }

  if (action === 'approve') {
    section.status = 'approved'
  } else if (action === 'dispute') {
    section.status = 'disputed'
  }

  await setReviewState(reviewState)
  return NextResponse.json({ success: true, section })
}
