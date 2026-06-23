import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listPlayers } from '@/lib/db'
import { LineupBuilder } from '@/components/LineupBuilder'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Lineup Card — The Softball Team' }

export default async function LineupPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const players = await listPlayers({ activeOnly: true })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Lineup card</h1>
        <p className="mt-1 text-sm text-field-muted">
          Build the batting order, then print the dugout lineup card and a blank scorecard to score by hand at the
          field. Nothing is saved — this is just for printing.
        </p>
      </div>
      <LineupBuilder players={players} />
    </div>
  )
}
