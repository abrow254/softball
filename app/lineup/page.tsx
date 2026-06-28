import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listPlayers, listGames, getLineup, listSeasons, getCurrentSeason, getLineupLabData } from '@/lib/db'
import { LineupBuilderSaved } from '@/components/LineupBuilderSaved'
import { SeasonSelector } from '@/components/SeasonSelector'

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

  const [players, allGames] = await Promise.all([
    getLineupLabData(selectedSeasonId),
    listGames(selectedSeasonId),
  ])

  // Load all lineups for all games in this season
  const allLineups = (
    await Promise.all(allGames.map((g) => getLineup(g.id)))
  ).flat()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Lineup card</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} />
      </div>

      <p className="text-xs text-field-muted">
        Select an upcoming game, build the batting order with positions, and save. Previous week&apos;s lineup
        loads automatically.
      </p>

      <LineupBuilderSaved
        players={players}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        allGames={allGames}
        allLineups={allLineups}
      />
    </div>
  )
}
