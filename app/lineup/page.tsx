import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listPlayers } from '@/lib/db'
import { getSchedule } from '@/lib/schedule'
import { getStandings } from '@/lib/standings'
import { LineupBuilder, type UpcomingGame } from '@/components/LineupBuilder'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Lineup Card — The Softball Team' }

export default async function LineupPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const today = new Date().toISOString().slice(0, 10)
  const [players, schedule, standings] = await Promise.all([
    listPlayers({ activeOnly: true }),
    getSchedule(),
    getStandings(),
  ])

  // Map each league team to its W-L-D so we can show the opponent's record.
  const recordByTeam = new Map<string, string>()
  if (standings) {
    for (const pool of standings.pools) {
      for (const r of pool.rows) recordByTeam.set(r.team, `${r.w}-${r.l}-${r.d}`)
    }
  }

  // Upcoming = not yet played and not in the past.
  const upcoming: UpcomingGame[] = (schedule ?? [])
    .filter((g) => !g.played && g.date >= today)
    .map((g) => ({ date: g.date, opponent: g.opponent, record: recordByTeam.get(g.opponent) ?? null }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Lineup card</h1>
        <p className="mt-1 text-sm text-field-muted">
          Build the batting order, then print the dugout lineup card and a blank scorecard to score by hand at the
          field. Nothing is saved — this is just for printing.
        </p>
      </div>
      <LineupBuilder players={players} upcoming={upcoming} />
    </div>
  )
}
