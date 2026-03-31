import { NextResponse } from 'next/server'
import { getVersions } from '@/lib/model-store'

export async function GET() {
  const versions = await getVersions()
  return NextResponse.json({ versions })
}
