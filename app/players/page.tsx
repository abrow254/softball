import { getCareerStats, getRecords } from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { RecordsPanel } from '@/components/RecordsPanel'
import { TeamTrendChart } from '@/components/TeamTrendChart'
import { CAREER_COLS } from '@/lib/statColumns'
import { SEASON_RECORDS, ALL_TIME } from '@/lib/seasonRecords'

function AllTimeTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className={`tabular text-xl font-semibold ${tone ?? 'text-field-ink'}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'All-Time Stats — The Softball Team' }

export default async function AllTimePage() {
  const [rows, records] = await Promise.all([getCareerStats(), getRecords()])

  const ironMan = [...rows]
    .filter((r) => r.gp > 0)
    .sort((a, b) => b.gp - a.gp || b.seasons_played - a.seasons_played || a.name.localeCompare(b.name))
    .slice(0, 12)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">All-time stats</h1>
        <p className="mt-1 text-sm text-field-muted">
          Career totals across every season. Players are grouped by tenure (career AB vs. the all-time leader):
          Core, Regulars, then Ringers. Tap a name for a player&rsquo;s full history.
        </p>
      </div>

      <StatTable
        rows={rows}
        cols={CAREER_COLS}
        defaultSortKey="avg"
        sections={[
          { label: 'Core', field: 'tier', equals: 'core' },
          { label: 'Regulars', field: 'tier', equals: 'regular' },
          { label: 'Ringers', field: 'tier', equals: 'ringer' },
        ]}
        linkBase="/players"
        highlightLeaders
        qualifyMinAb={30}
        emptyMessage="No stats recorded yet."
      />

      <p className="text-xs text-field-muted">
        Tap a column header to sort. <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the
        all-time leader. For rate stats (AVG, OBP, SLG, OPS, ISO, XBH%), players under 30 career AB are dimmed and sorted
        to the bottom so small samples don&rsquo;t top the board. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>

      <section className="space-y-4 border-t border-field-line pt-6">
        <h2 className="text-xl font-semibold tracking-tight text-field-ink">Team through the years</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <AllTimeTile label="All-time" value={`${ALL_TIME.w}-${ALL_TIME.l}${ALL_TIME.d > 0 ? `-${ALL_TIME.d}` : ''}`} />
          <AllTimeTile label="Win %" value={ALL_TIME.winPct.toFixed(3).replace(/^0/, '')} />
          <AllTimeTile
            label="Run Diff"
            value={ALL_TIME.runDiff > 0 ? `+${ALL_TIME.runDiff}` : String(ALL_TIME.runDiff)}
            tone="text-field-grass"
          />
          <AllTimeTile label="RS/game" value={ALL_TIME.rsPerG.toFixed(1)} />
          <AllTimeTile label="RA/game" value={ALL_TIME.raPerG.toFixed(1)} />
          <AllTimeTile label="Seasons" value={String(SEASON_RECORDS.length)} />
        </div>
        <div className="rounded-lg border border-field-line bg-field-paper p-3">
          <TeamTrendChart records={SEASON_RECORDS} />
          <p className="mt-1 text-center text-[11px] text-field-muted">Run differential by season</p>
        </div>
      </section>

      {ironMan.length > 0 && (
        <section className="space-y-3 border-t border-field-line pt-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-field-ink">Iron Man</h2>
            <p className="mt-1 text-sm text-field-muted">Most games played (tracked games only), all-time.</p>
          </div>
          <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {ironMan.map((r, i) => (
              <li
                key={r.player_id}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm odd:bg-field-paper"
              >
                <span className="w-5 text-right font-semibold text-field-grass">{i + 1}</span>
                <a href={`/players/${r.player_id}`} className="min-w-0 flex-1 truncate text-field-ink hover:underline">
                  {r.name}
                </a>
                <span className="text-[11px] text-field-muted">{r.seasons_played} seasons</span>
                <span className="tabular w-8 text-right font-semibold text-field-ink">{r.gp}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-4 border-t border-field-line pt-6">
        <h2 className="text-xl font-semibold tracking-tight text-field-ink">Records</h2>
        <RecordsPanel records={records} />
      </section>
    </div>
  )
}
