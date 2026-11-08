import { getCareerWar, getRecords } from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { RecordsPanel } from '@/components/RecordsPanel'
import { TeamTrendChart } from '@/components/TeamTrendChart'
import { CAREER_COLS } from '@/lib/statColumns'
import { SEASON_RECORDS, ALL_TIME, CHAMPIONSHIPS } from '@/lib/seasonRecords'

function AllTimeTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-field-line bg-field-paper px-3 py-4 text-left shadow-sm">
      <div className={`tabular font-display text-2xl font-bold ${tone ?? 'text-field-ink'}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-field-muted">{label}</div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'All-Time Stats — The Softball Team' }

export default async function AllTimePage() {
  const [rows, records] = await Promise.all([getCareerWar(), getRecords()])

  const ironMan = [...rows]
    .filter((r) => r.gp > 0)
    .sort((a, b) => b.gp - a.gp || b.seasons_played - a.seasons_played || a.name.localeCompare(b.name))
    .slice(0, 12)

  // bWAR leaders (offense only). Qualified 30+ career AB, matching the table.
  const warLeaders = [...rows]
    .filter((r) => r.ab >= 30 && r.war != null)
    .sort((a, b) => (b.war ?? 0) - (a.war ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 12)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-field-grass">Team history</p><h1 className="font-display text-4xl font-bold uppercase tracking-tight text-field-ink">All-time stats</h1>
          <p className="mt-1 text-sm text-field-muted">
            Career totals across every season. Players are grouped by tenure (career AB vs. the all-time leader):
            Core, Regulars, then Ringers. Tap a name for a player&rsquo;s full history.
          </p>
        </div>
        <a
          href="/api/export"
          download
          className="shrink-0 rounded-md border border-field-line-strong px-3 py-1.5 text-sm font-medium text-field-ink hover:bg-field-cream"
          title="Download every season's data as one JSON file"
        >
          ⬇ Download all data
        </a>
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
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-field-ink">Team through the years</h2>

        {CHAMPIONSHIPS.length > 0 && (
          <div className="rounded-lg border border-field-gold/50 bg-field-gold/15 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>🏆</span>
              <span className="font-semibold text-field-ink">
                {CHAMPIONSHIPS.length}× League Champions
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHAMPIONSHIPS.map((c) => (
                <span
                  key={`${c.year}-${c.term}`}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-field-ink ring-1 ring-field-gold/40"
                >
                  🏆 {c.year} {c.term}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <AllTimeTile label="All-time" value={`${ALL_TIME.w}-${ALL_TIME.l}${ALL_TIME.d > 0 ? `-${ALL_TIME.d}` : ''}`} />
          <AllTimeTile label="Titles" value={String(CHAMPIONSHIPS.length)} tone="text-field-gold" />
          <AllTimeTile
            label="Run Diff"
            value={ALL_TIME.runDiff > 0 ? `+${ALL_TIME.runDiff}` : String(ALL_TIME.runDiff)}
            tone="text-field-grass"
          />
          <AllTimeTile label="Win %" value={ALL_TIME.winPct.toFixed(3).replace(/^0/, '')} />
          <AllTimeTile label="RS/game" value={ALL_TIME.rsPerG.toFixed(1)} />
          <AllTimeTile label="Seasons" value={String(SEASON_RECORDS.length)} />
        </div>
        <div className="rounded-2xl border border-field-line bg-field-paper p-4 shadow-sm">
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

      {warLeaders.length > 0 && (
        <section className="space-y-3 border-t border-field-line pt-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-field-ink">bWAR leaders</h2>
            <p className="mt-1 text-sm text-field-muted">
              Batting WAR — <strong>offense only</strong> (we don&rsquo;t track fielding). Runs a hitter added above a
              replacement-level bat, scaled to our run environment. Accumulates with playing time.
            </p>
          </div>
          <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {warLeaders.map((r, i) => (
              <li
                key={r.player_id}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm odd:bg-field-paper"
              >
                <span className="w-5 text-right font-semibold text-field-grass">{i + 1}</span>
                <a href={`/players/${r.player_id}`} className="min-w-0 flex-1 truncate text-field-ink hover:underline">
                  {r.name}
                </a>
                <span className="tabular w-10 text-right font-semibold text-field-ink">{(r.war ?? 0).toFixed(1)}</span>
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
