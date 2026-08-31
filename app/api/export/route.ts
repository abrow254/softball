import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getFullExport } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Full-depth JSON export of all season data, for download / analysis.
// Any signed-in user may export; RLS gates the underlying reads.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const bundle = await getFullExport()
  const date = new Date().toISOString().slice(0, 10)
  return NextResponse.json(bundle, {
    headers: {
      'Content-Disposition': `attachment; filename="softball-data-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
