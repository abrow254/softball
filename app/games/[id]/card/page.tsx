import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getGame, getLineup, listPlayers } from '@/lib/db'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'
import { PrintButton } from '@/components/PrintButton'

export const dynamic = 'force-dynamic'

export default async function GameCardPage({ params }: { params: { id: string } }) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')

  const game = await getGame(params.id)
  if (!game) notFound()

  const [lineup, players] = await Promise.all([getLineup(game.id), listPlayers()])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const rows: PrintableCardRow[] = lineup.map((l) => ({
    batting_order: l.batting_order,
    name: nameById.get(l.player_id) ?? '',
    starting_pos: l.starting_pos,
  }))

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Printable card</h1>
        <div className="flex items-center gap-3">
          <PrintButton />
          {current.role === 'admin' && (
            <Link
              href={`/games/${game.id}/edit`}
              className="rounded-md border border-field-line-strong px-4 py-2 font-medium text-field-ink hover:bg-field-cream"
            >
              Edit game
            </Link>
          )}
        </div>
      </div>

      <p className="no-print text-sm text-field-muted">
        Print blank to score by hand, then photograph the filled card and upload it back on the game&apos;s edit page.
      </p>

      <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
        <PrintableCard opponent={game.opponent} gameDate={game.game_date} rows={rows} />
      </div>
    </div>
  )
}
