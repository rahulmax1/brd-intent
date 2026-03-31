import { NextResponse } from 'next/server'
import { resetReviewState } from '@/lib/review-store'

export async function POST() {
  const state = await resetReviewState()
  return NextResponse.json({ success: true, sections: state.sections.length })
}
