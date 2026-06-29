import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getPlayerCareer,
  getPlayerGameLog,
  getCurrentSeason,
  getPlayerPotgCount,
  getPlayerBadges,
  getBattingOrderStats,
} from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { Tile } from '@/components/Tile'
import { OpsChart } from '@/components/OpsChart'
import { PLAYER_SEASON_COLS } from '@/lib/statColumns'
import { fmt3, fmtPct } from '@/lib/formulas'
import type { CareerStatRow, PlayerGameLogEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { career } = await getPlayerCareer(params.id)
  return { title: career ? `${career.name} — Career` : 'Player' }
}

// ---------- Tiles (career overview) ------------------------------------------

function tiles(c: CareerStatRow) {
  return [
    { label: 'AVG', value: fmt3(c.avg), title: 'hits / ab' },
    { label: 'SLG', value: fmt3(c.slg), title: 'tb / ab' },
    { label: 'OBP', value: fmt3(c.obp), title: 'House rule: (hits + fc) / ab' },
    { label: 'ISO', value: fmt3(c.iso), title: 'slg - avg' },
    { label: 'Hits', value: String(c.hits) },
    { label: 'HR', value: String(c.hr) },
    { label: 'TB', value: String(c.tb), title: 'Total bases' },
    { label: 'XBH%', value: fmtPct(c.xbh_pct), title: '(2B + 3B + HR) / hits' },
  ]
}


// ---------- Game log ---------------------------------------------------------

function GameLogTable({ entries }: { entries: PlayerGameLogEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-field-line">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-field-cream/70 text-field-muted">
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">vs</th>
            <th className="px-2 py-2 text-right font-medium">AB</th>
            <th className="px-2 py-2 text-right font-medium">H</th>
            <th className="px-2 py-2 text-right font-medium">2B</th>
            <th className="px-2 py-2 text-right font-medium">3B</th>
            <th className="px-2 py-2 text-right font-medium">HR</th>
            <th className="px-2 py-2 text-right font-medium">TB</th>
            <th className="px-2 py-2 text-right font-medium">BB</th>
            <th className="px-2 py-2 text-right font-medium">RBI</th>
            <th className="px-2 py-2 text-right font-medium">OPS</th>
            <th className="px-2 py-2 text-center font-medium" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.game_id}
              className={[
                'border-t border-field-line',
                e.is_potg ? 'bg-field-gold/15' : 'even:bg-field-cream/30',
              ].join(' ')}
            >
              <td className="whitespace-nowrap px-3 py-1.5 text-field-ink">{e.game_date ?? '—'}</td>
              <td className="px-3 py-1.5 text-field-muted">{e.opponent ?? '—'}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.ab}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.hits}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.doubles}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.triples}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.hr}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.tb}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.bb}</td>
              <td className="px-2 py-1.5 text-right tabular text-field-ink">{e.rbi}</td>
              <td className="px-2 py-1.5 text-right tabular font-medium text-field-ink">{fmt3(e.ops)}</td>
              <td className="px-2 py-1.5 text-center">
                {e.is_potg && <span title="Player of the Game">🐦</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Page -------------------------------------------------------------

export default async function PlayerCareerPage({ params }: { params: { id: string } }) {
  const currentSeason = await getCurrentSeason()

  const [{ career, seasons }, gameLog, potgCount, byOrder] = await Promise.all([
    getPlayerCareer(params.id),
    currentSeason ? getPlayerGameLog(params.id, currentSeason.id) : Promise.resolve([]),
    getPlayerPotgCount(params.id),
    getBattingOrderStats(params.id),
  ])
  if (!career) notFound()

  const badges = getPlayerBadges(career, potgCount)

  return (
    <div className="space-y-8">
      <div>
        <Link href="/players" className="text-sm text-field-grass hover:underline">
          ← All-time stats
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-field-ink">{career.name}</h1>
          <span className="rounded-full bg-field-grass/10 px-2 py-0.5 text-xs font-medium capitalize text-field-grass">
            {career.tier}
          </span>
          <span className="text-sm text-field-muted">
            {career.seasons_played} {career.seasons_played === 1 ? 'season' : 'seasons'} · {career.ab} career AB
          </span>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">Career</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {tiles(career).map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </div>
      </section>

      {badges.earned.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Career milestones</h2>
          <div className="flex flex-wrap gap-2">
            {badges.earned.map((b) => (
              <span
                key={b.label}
                className="rounded-full border border-field-gold/40 bg-field-gold/15 px-3 py-1 text-sm font-medium text-field-ink"
              >
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
          {badges.next.length > 0 && (
            <p className="text-xs text-field-muted">
              Next:{' '}
              {badges.next
                .slice(0, 3)
                .map((n) => `${n.label} (${n.target - n.current} to go)`)
                .join(' · ')}
            </p>
          )}
        </section>
      )}

      {seasons.length >= 2 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-field-muted">OPS by season</h2>
          <OpsChart series={[{ label: career.name, color: '#2F6B4A', seasons }]} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Season by season</h2>
        <StatTable
          rows={seasons}
          cols={PLAYER_SEASON_COLS}
          defaultSortKey="year"
          defaultDir="asc"
          rowKeyField="season_id"
          emptyMessage="No seasons recorded."
        />
      </section>

      {byOrder.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">By batting order</h2>
          <div className="overflow-x-auto rounded-lg border border-field-line">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-field-cream/70 text-field-muted">
                  <th className="px-3 py-2 text-left font-medium">Spot</th>
                  <th className="px-2 py-2 text-right font-medium">G</th>
                  <th className="px-2 py-2 text-right font-medium">AB</th>
                  <th className="px-2 py-2 text-right font-medium">H</th>
                  <th className="px-2 py-2 text-right font-medium">HR</th>
                  <th className="px-2 py-2 text-right font-medium">AVG</th>
                  <th className="px-2 py-2 text-right font-medium">OPS</th>
                </tr>
              </thead>
              <tbody>
                {byOrder.map((r) => (
                  <tr key={r.batting_order} className="border-t border-field-line even:bg-field-cream/30">
                    <td className="px-3 py-1.5 font-medium text-field-ink">#{r.batting_order}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-muted">{r.gp_count}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{r.ab}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{r.hits}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{r.hr}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{fmt3(r.avg)}</td>
                    <td className="px-2 py-1.5 text-right tabular font-medium text-field-ink">{fmt3(r.ops)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-field-muted">From games entered with a saved lineup; small samples vary.</p>
        </section>
      )}

      {currentSeason && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
            Game log — {currentSeason.label}
          </h2>
          {gameLog.length === 0 ? (
            <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-6 text-center text-sm text-field-muted">
              No per-game data for this season yet.
            </p>
          ) : (
            <GameLogTable entries={gameLog} />
          )}
        </section>
      )}

      <p className="text-xs text-field-muted">
        House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
