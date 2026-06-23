import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason, listPlayers } from '@/lib/db'
import { GameEditor } from '@/components/GameEditor'

export const dynamic = 'force-dynamic'

export default async function NewGamePage() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const [seasons, players, currentSeason] = await Promise.all([
    listSeasons(),
    listPlayers({ activeOnly: true }),
    getCurrentSeason(),
  ])

  if (seasons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        Add a season before recording a game.
      </p>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-field-ink">New game</h1>
      <GameEditor
        mode="new"
        seasons={seasons}
        players={players}
        initialGame={{
          season_id: currentSeason?.id ?? seasons[0].id,
          game_date: today,
          opponent: '',
          our_runs: null,
          opp_runs: null,
        }}
        initialRows={[]}
      />
    </div>
  )
}
