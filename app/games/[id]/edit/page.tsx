import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getGame, listSeasons, listPlayers, getLineup, getGameStats } from '@/lib/db'
import { buildEditorRows } from '@/lib/entry'
import { GameEditor } from '@/components/GameEditor'

export const dynamic = 'force-dynamic'

export default async function EditGamePage({ params }: { params: { id: string } }) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const game = await getGame(params.id)
  if (!game) notFound()

  const [seasons, players, lineup, stats] = await Promise.all([
    listSeasons(),
    listPlayers(),
    getLineup(game.id),
    getGameStats(game.id),
  ])

  const initialRows = buildEditorRows(players, lineup, stats)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-field-ink">
        {game.opponent ? `vs ${game.opponent}` : 'Edit game'}
        {game.game_date ? <span className="ml-2 text-base font-normal text-field-muted">{game.game_date}</span> : null}
      </h1>
      <GameEditor
        mode="edit"
        seasons={seasons}
        players={players}
        initialGame={{
          id: game.id,
          season_id: game.season_id,
          game_date: game.game_date ?? '',
          opponent: game.opponent ?? '',
          our_runs: game.our_runs,
          opp_runs: game.opp_runs,
        }}
        initialRows={initialRows}
      />
    </div>
  )
}
