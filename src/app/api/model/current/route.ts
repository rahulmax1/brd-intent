import { NextResponse } from 'next/server'
import { getCurrentModel, getLatestVersionId } from '@/lib/model-store'

export async function GET() {
  try {
    const model = await getCurrentModel()
    const latestVersionId = await getLatestVersionId()

    return NextResponse.json(
      { model, latestVersionId },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'fetch_failed', message },
      { status: 500 }
    )
  }
}
