import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listPlayers } from '@/lib/db'
import { RosterEditor } from '@/components/RosterEditor'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Roster — The Softball Team' }

export default async function RosterPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const players = await listPlayers()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Roster</h1>
        <p className="mt-1 text-sm text-field-muted">
          Set each player&rsquo;s gender (for the MMF lineup rule), active status, and the positions they can field.
          Tap positions in order of preference (first = primary) &mdash; Auto-optimize uses this depth chart to fill the
          field.
        </p>
      </div>
      <RosterEditor players={players} />
    </div>
  )
}
