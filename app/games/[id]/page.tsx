import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame, getBoxScore } from '@/lib/db'
import { gameResult } from '@/lib/types'
import { fmt3 } from '@/lib/formulas'
import type { BoxScoreRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const game = await getGame(params.id)
  if (!game) return { title: 'Game' }
  const label = [game.game_date, game.opponent ? `vs ${game.opponent}` : null].filter(Boolean).join(' · ')
  return { title: `${label} — Box Score` }
}

function StatCell({ value, className = '' }: { value: string | number; className?: string }) {
  return <td className={`whitespace-nowrap px-2 py-1.5 text-right tabular text-sm text-field-ink ${className}`}>{value}</td>
}

function PotGRow({ row }: { row: BoxScoreRow }) {
  const rowBg = row.is_potg ? 'bg-field-gold/20' : 'even:bg-field-cream/30'
  return (
    <tr className={`border-t border-field-line ${rowBg}`}>
      <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-1.5 text-sm font-medium text-field-ink">
        <Link href={`/players/${row.player_id}`} className="hover:underline">
          {row.name}
        </Link>
        {row.is_potg && <span className="ml-1.5 text-xs" title="Player of the Game">🐦</span>}
      </td>
      <StatCell value={row.ab} />
      <StatCell value={row.hits} />
      <StatCell value={row.singles} />
      <StatCell value={row.doubles} />
      <StatCell value={row.triples} />
      <StatCell value={row.hr} />
      <StatCell value={row.tb} />
      <StatCell value={row.bb} />
      <StatCell value={row.fc} />
      <StatCell value={row.rbi} />
      <StatCell value={row.k} />
      <StatCell value={fmt3(row.ops)} />
    </tr>
  )
}

function TotalsRow({ rows }: { rows: BoxScoreRow[] }) {
  const tot = rows.reduce(
    (acc, r) => ({
      ab: acc.ab + r.ab,
      hits: acc.hits + r.hits,
      singles: acc.singles + r.singles,
      doubles: acc.doubles + r.doubles,
      triples: acc.triples + r.triples,
      hr: acc.hr + r.hr,
      tb: acc.tb + r.tb,
      bb: acc.bb + r.bb,
      fc: acc.fc + r.fc,
      rbi: acc.rbi + r.rbi,
      k: acc.k + r.k,
    }),
    { ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, hr: 0, tb: 0, bb: 0, fc: 0, rbi: 0, k: 0 },
  )
  const teamOps = tot.ab > 0 ? tot.hits / tot.ab + tot.tb / tot.ab : 0
  return (
    <tr className="border-t-2 border-field-line-strong bg-field-cream/50 font-semibold">
      <td className="sticky left-0 z-10 bg-field-cream/90 px-3 py-1.5 text-sm text-field-muted">Team</td>
      <StatCell value={tot.ab} />
      <StatCell value={tot.hits} />
      <StatCell value={tot.singles} />
      <StatCell value={tot.doubles} />
      <StatCell value={tot.triples} />
      <StatCell value={tot.hr} />
      <StatCell value={tot.tb} />
      <StatCell value={tot.bb} />
      <StatCell value={tot.fc} />
      <StatCell value={tot.rbi} />
      <StatCell value={tot.k} />
      <StatCell value={fmt3(teamOps)} />
    </tr>
  )
}

export default async function BoxScorePage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id)
  if (!game) notFound()

  const r = gameResult(game.our_runs, game.opp_runs)

  if (game.is_aggregate) {
    return (
      <div className="space-y-4">
        <Link href="/games" className="text-sm text-field-grass hover:underline">
          ← Games
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">
          {game.opponent ? `vs ${game.opponent}` : 'Game'}
          {game.game_date && <span className="ml-2 text-base font-normal text-field-muted">{game.game_date}</span>}
        </h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          Box score not available — this season was imported as season totals, not game-by-game.
        </p>
      </div>
    )
  }

  const rows = await getBoxScore(params.id)
  if (!rows) notFound()

  return (
    <div className="space-y-5">
      <Link href="/games" className="text-sm text-field-grass hover:underline">
        ← Games
      </Link>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">
          {game.opponent ? `vs ${game.opponent}` : 'Box Score'}
        </h1>
        {game.game_date && <span className="text-base text-field-muted">{game.game_date}</span>}
        {game.our_runs != null && game.opp_runs != null && (
          <span className="text-lg font-semibold text-field-ink">
            {game.our_runs}–{game.opp_runs}
            {r && (
              <span
                className={`ml-2 text-base font-normal ${r === 'W' ? 'text-field-grass' : r === 'L' ? 'text-field-clay' : 'text-field-muted'}`}
              >
                {r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
              </span>
            )}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No stats recorded for this game yet.{' '}
          <Link href={`/games/${params.id}/edit`} className="text-field-grass hover:underline">
            Add them
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-field-line">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-field-cream/70 text-field-muted">
                  <th className="sticky left-0 z-10 bg-field-cream/95 px-3 py-2 text-left text-sm font-medium">
                    Player
                  </th>
                  {['AB', 'H', '1B', '2B', '3B', 'HR', 'TB', 'BB', 'FC', 'RBI', 'K', 'OPS'].map((h) => (
                    <th key={h} className="px-2 py-2 text-right text-sm font-medium" title={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PotGRow key={row.player_id} row={row} />
                ))}
                <TotalsRow rows={rows} />
              </tbody>
            </table>
          </div>

          <p className="text-xs text-field-muted">
            House rules: OPS is AVG + SLG.{' '}
            <span className="rounded bg-field-gold/30 px-1 font-medium">🐦 PotG</span> marks the Player of the Game.
          </p>
        </>
      )}

      <div className="flex gap-4 text-sm">
        <Link href={`/games/${params.id}/edit`} className="text-field-grass hover:underline">
          Edit stats
        </Link>
        <Link href={`/games/${params.id}/card`} className="text-field-grass hover:underline">
          Printable card
        </Link>
      </div>
    </div>
  )
}
