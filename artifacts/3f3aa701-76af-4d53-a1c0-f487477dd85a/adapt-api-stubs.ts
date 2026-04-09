// API Route Stubs
// Generated from Intent Model
// Copy these to your src/app/api directory

// src/app/api/user-account/route.ts
export async function GET() {
  // List all User Account records
  return NextResponse.json({ data: [] })
}

export async function POST(request: NextRequest) {
  // Create new User Account
  const body = await request.json()
  return NextResponse.json({ data: body })
}

// src/app/api/document/route.ts
export async function GET() {
  // List all Document records
  return NextResponse.json({ data: [] })
}

export async function POST(request: NextRequest) {
  // Create new Document
  const body = await request.json()
  return NextResponse.json({ data: body })
}

