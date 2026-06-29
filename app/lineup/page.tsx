import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason, getLineupLabData } from '@/lib/db'
import { getSchedule } from '@/lib/schedule'
import { getStandings } from '@/lib/standings'
import { analyzeOpponent, type OppAnalysis } from '@/lib/opponentScouting'
import { LineupLabComplete, type UpcomingMatch } from '@/components/LineupLabComplete'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Lineup Card — The Softball Team' }

export default async function LineupPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const seasons = await listSeasons()
  if (seasons.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Lineup card</h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No seasons yet.
        </p>
      </div>
    )
  }

  const fallback = (await getCurrentSeason())?.id ?? seasons[0].id
  const selectedSeasonId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season) ? searchParams.season : fallback

  const [players, schedule, standings] = await Promise.all([
    getLineupLabData(selectedSeasonId),
    getSchedule(),
    getStandings(),
  ])

  // Upcoming games come from the scraped schedule (the DB only has games once
  // they've been played and entered). Each carries opponent scouting derived
  // from the standings.
  const today = new Date().toISOString().slice(0, 10)
  const recordByTeam = new Map<string, string>()
  if (standings) {
    for (const pool of standings.pools) {
      for (const r of pool.rows) recordByTeam.set(r.team, `${r.w}-${r.l}-${r.d}`)
    }
  }

  const upcomingMatches: UpcomingMatch[] = (schedule ?? [])
    .filter((g) => !g.played && g.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g) => ({
      date: g.date,
      opponent: g.opponent,
      time: g.time,
      record: recordByTeam.get(g.opponent) ?? null,
      analysis: standings ? (analyzeOpponent(standings, g.opponent) as OppAnalysis | null) : null,
    }))

  return (
    <LineupLabComplete
      key={selectedSeasonId}
      players={players}
      seasons={seasons}
      selectedSeasonId={selectedSeasonId}
      upcomingMatches={upcomingMatches}
    />
  )
}
