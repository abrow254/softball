import Link from 'next/link'
import {
  listSeasons,
  getCurrentSeason,
  getSeasonSummary,
  getSeasonTrajectory,
  getScoringProfile,
  getLineupSpotTotals,
  getSeasonHighlights,
  getSeasonWar,
  getSeasonAwards,
  getLineupLabData,
} from '@/lib/db'
import { qualifiedThreshold } from '@/lib/db/eligibility'
import { SeasonSelector } from '@/components/SeasonSelector'
import { Tile } from '@/components/Tile'
import { GameTrajectoryChart } from '@/components/GameTrajectoryChart'
import { Sparkline } from '@/components/Sparkline'
import { ShareBars, type ShareRow } from '@/components/ShareBars'
import { fmt3 } from '@/lib/formulas'
import type { SeasonStatRow } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Season Insights — The Softball Team' }

const AWARD_EMOJI: Record<string, string> = {
  mvp: '🏆', batting_champ: '🥇', slugger: '💪', on_base: '🎯', xbh: '🔥',
  ringer_mvp: '⭐', most_improved: '📈', potg_award: '🐦', war_mvp: '🃏',
}
const KEY_AWARDS = ['mvp', 'war_mvp', 'batting_champ', 'slugger', 'on_base', 'potg_award']

function Section({ title, cta, href, children }: { title: string; cta?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-field-line pt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-field-ink">{title}</h2>
        {href && cta && (
          <Link href={href} className="text-xs font-medium text-field-grass hover:underline">{cta} →</Link>
        )}
      </div>
      {children}
    </section>
  )
}

function LeaderList({ rows, fmt }: { rows: SeasonStatRow[]; fmt: (r: SeasonStatRow) => string }) {
  if (rows.length === 0) return <p className="text-sm text-field-muted">—</p>
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.player_id} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-right font-semibold text-field-grass">{i + 1}</span>
          <Link href={`/players/${r.player_id}`} className="min-w-0 flex-1 truncate text-field-ink hover:underline">
            {r.name}
          </Link>
          <span className="tabular font-semibold text-field-ink">{fmt(r)}</span>
        </li>
      ))}
    </ol>
  )
}

const shortDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'

export default async function InsightsPage({ searchParams }: { searchParams: { season?: string } }) {
  const seasons = await listSeasons()
  if (seasons.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season insights</h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No seasons yet.
        </p>
      </div>
    )
  }

  const fallback = (await getCurrentSeason())?.id ?? seasons[0].id
  const selectedId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season) ? searchParams.season : fallback
  const selected = seasons.find((s) => s.id === selectedId) ?? null

  const [summary, trajectory, scoring, spots, highlights, warRows, awardsRes, labData] = await Promise.all([
    getSeasonSummary(selectedId),
    getSeasonTrajectory(selectedId),
    getScoringProfile(selectedId),
    getLineupSpotTotals(selectedId),
    getSeasonHighlights(selectedId),
    getSeasonWar(selectedId),
    getSeasonAwards(selectedId),
    getLineupLabData(selectedId),
  ])

  // Value leaders (qualified).
  const minAb = qualifiedThreshold(warRows)
  const qualified = warRows.filter((r) => r.ab >= minAb)
  const warLeaders = [...qualified].sort((a, b) => (b.war ?? 0) - (a.war ?? 0)).slice(0, 5)
  const opsLeaders = [...qualified].sort((a, b) => b.ops - a.ops).slice(0, 5)

  // Contribution share (top 8 by each metric).
  const runShare: ShareRow[] = [...warRows]
    .filter((r) => r.runs > 0).sort((a, b) => b.runs - a.runs).slice(0, 8)
    .map((r) => ({ player_id: r.player_id, name: r.name, value: r.runs, display: String(r.runs) }))
  const tbShare: ShareRow[] = [...warRows]
    .filter((r) => r.tb > 0).sort((a, b) => b.tb - a.tb).slice(0, 8)
    .map((r) => ({ player_id: r.player_id, name: r.name, value: r.tb, display: String(r.tb) }))

  // Hot / cold form: last-3 balanced vs season baseline balanced (0.5·OBP+0.5·SLG).
  const formRows = labData
    .filter((p) => p.ab >= 10 && p.form.length >= 2 && p.recentForm > 0)
    .map((p) => ({ ...p, baseline: 0.5 * p.obp + 0.5 * p.slg }))
    .map((p) => ({ ...p, delta: p.recentForm - p.baseline }))
  const heating = formRows.filter((p) => p.delta > 0.04).sort((a, b) => b.delta - a.delta).slice(0, 5)
  const cooling = formRows.filter((p) => p.delta < -0.04).sort((a, b) => a.delta - b.delta).slice(0, 5)

  const keyAwards = awardsRes.awards
    .filter((a) => KEY_AWARDS.includes(a.id) && a.winners.length > 0)
    .sort((a, b) => KEY_AWARDS.indexOf(a.id) - KEY_AWARDS.indexOf(b.id))

  const fmtPct = (n: number) => n.toFixed(3).replace(/^0/, '')
  const hasGames = (scoring?.gp ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season insights</h1>
          {selected && <p className="mt-0.5 text-sm text-field-muted">{selected.label}</p>}
        </div>
        <SeasonSelector seasons={seasons} selectedId={selectedId} basePath="/insights" />
      </div>

      {/* Scoring profile */}
      {summary ? (
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Tile label="Record" value={`${summary.w}-${summary.l}${summary.d > 0 ? `-${summary.d}` : ''}`} />
            <Tile label="Win %" value={fmtPct(summary.winPct)} />
            <Tile label="Run Diff" value={summary.runDiff > 0 ? `+${summary.runDiff}` : String(summary.runDiff)} />
            <Tile label="RS/game" value={summary.rsPerG.toFixed(1)} />
            <Tile label="RA/game" value={summary.raPerG.toFixed(1)} />
            <Tile label="Finish" value={summary.finished ?? '—'} />
          </div>
          {scoring && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-field-line bg-field-paper p-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-field-muted">
                  <span>One-run games: <strong className="text-field-ink">{scoring.oneRunW}-{scoring.oneRunL}</strong></span>
                  <span>Blowout wins (10+): <strong className="text-field-ink">{scoring.blowoutW}</strong></span>
                  {scoring.streak && scoring.streak.n >= 2 && (
                    <span>Current streak: <strong className={scoring.streak.type === 'W' ? 'text-field-grass' : 'text-field-clay'}>{scoring.streak.type}{scoring.streak.n}</strong></span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-field-line bg-field-paper p-3 text-sm">
                {scoring.biggestWin && (
                  <div className="text-field-muted">Biggest win: <strong className="text-field-ink tabular">{scoring.biggestWin.our}–{scoring.biggestWin.opp}</strong> vs {scoring.biggestWin.opponent ?? '—'}</div>
                )}
                {scoring.worstLoss && (
                  <div className="mt-0.5 text-field-muted">Worst loss: <strong className="text-field-ink tabular">{scoring.worstLoss.our}–{scoring.worstLoss.opp}</strong> vs {scoring.worstLoss.opponent ?? '—'}</div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No games recorded for this season yet.
        </p>
      )}

      {/* Season trajectory */}
      {trajectory.length >= 2 && (
        <Section title="Season trajectory">
          <div className="rounded-lg border border-field-line bg-field-paper p-3">
            <GameTrajectoryChart games={trajectory} />
            <p className="mt-1 text-center text-[11px] text-field-muted">
              Run differential by game (oldest → newest) · running record {trajectory[trajectory.length - 1].cumW}-{trajectory[trajectory.length - 1].cumL}
              {trajectory[trajectory.length - 1].cumD > 0 ? `-${trajectory[trajectory.length - 1].cumD}` : ''}
            </p>
          </div>
        </Section>
      )}

      {/* Value leaders */}
      {(warLeaders.length > 0 || opsLeaders.length > 0) && (
        <Section title="Value leaders" cta="Full stats" href={`/stats?season=${selectedId}`}>
          <div className="grid gap-4 rounded-lg border border-field-line bg-field-paper p-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">bWAR</h3>
              <LeaderList rows={warLeaders} fmt={(r) => (r.war ?? 0).toFixed(1)} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">OPS</h3>
              <LeaderList rows={opsLeaders} fmt={(r) => fmt3(r.ops)} />
            </div>
          </div>
          <p className="text-[11px] text-field-muted">bWAR is offense-only. Qualified = {qualified.length} hitters with enough AB.</p>
        </Section>
      )}

      {/* Contribution share */}
      {(runShare.length > 0 || tbShare.length > 0) && (
        <Section title="Who drives the offense">
          <div className="grid gap-4 rounded-lg border border-field-line bg-field-paper p-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">Share of runs</h3>
              <ShareBars rows={runShare} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">Share of total bases</h3>
              <ShareBars rows={tbShare} tone="#c2843f" />
            </div>
          </div>
        </Section>
      )}

      {/* Hot / cold form */}
      {(heating.length > 0 || cooling.length > 0) && (
        <Section title="Form — last 3 vs season">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-field-line bg-field-paper p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-grass">🔥 Heating up</h3>
              {heating.length === 0 ? <p className="text-sm text-field-muted">—</p> : (
                <ul className="space-y-1.5">
                  {heating.map((p) => (
                    <li key={p.player_id} className="flex items-center gap-2 text-sm">
                      <Link href={`/players/${p.player_id}`} className="min-w-0 flex-1 truncate text-field-ink hover:underline">{p.name}</Link>
                      <Sparkline values={p.form} />
                      <span className="tabular w-12 text-right font-semibold text-field-grass">+{fmt3(p.delta)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-field-line bg-field-paper p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-clay">🧊 Cooling off</h3>
              {cooling.length === 0 ? <p className="text-sm text-field-muted">—</p> : (
                <ul className="space-y-1.5">
                  {cooling.map((p) => (
                    <li key={p.player_id} className="flex items-center gap-2 text-sm">
                      <Link href={`/players/${p.player_id}`} className="min-w-0 flex-1 truncate text-field-ink hover:underline">{p.name}</Link>
                      <Sparkline values={p.form} color="#b04a3a" />
                      <span className="tabular w-12 text-right font-semibold text-field-clay">{fmt3(p.delta)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="text-[11px] text-field-muted">Form = 0.5·OBP + 0.5·SLG; last-3-game average vs the season baseline (min 10 AB).</p>
        </Section>
      )}

      {/* Lineup-spot production */}
      {spots.length > 0 && (
        <Section title="Production by lineup spot">
          <div className="overflow-x-auto rounded-lg border border-field-line">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-field-cream/70 text-field-muted">
                  <th className="px-3 py-2 text-left font-medium">Spot</th>
                  <th className="px-2 py-2 text-right font-medium">AB</th>
                  <th className="px-2 py-2 text-right font-medium">AVG</th>
                  <th className="px-2 py-2 text-right font-medium">OPS</th>
                  <th className="px-3 py-2 text-left font-medium">Top producer</th>
                </tr>
              </thead>
              <tbody>
                {spots.map((s) => (
                  <tr key={s.batting_order} className="border-t border-field-line even:bg-field-cream/30">
                    <td className="px-3 py-1.5 font-medium text-field-ink">#{s.batting_order}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{s.ab}</td>
                    <td className="px-2 py-1.5 text-right tabular text-field-ink">{fmt3(s.avg)}</td>
                    <td className="px-2 py-1.5 text-right tabular font-medium text-field-ink">{fmt3(s.ops)}</td>
                    <td className="px-3 py-1.5 text-field-muted">{s.topName ?? '—'}{s.topName ? ` (${fmt3(s.topOps)})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-field-muted">From games with a saved lineup; small samples vary.</p>
        </Section>
      )}

      {/* Season highlights */}
      {(highlights.singleGame.length > 0 || highlights.teamWinStreak || highlights.onBaseStreak || highlights.multiHitStreak) && (
        <Section title="Season highlights" cta="All-time records" href="/players">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.singleGame.map((r) => (
              <div key={r.label} className="rounded-lg border border-field-line bg-field-paper px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-field-muted">{r.label}</div>
                <div className="tabular text-lg font-semibold text-field-ink">{r.display}</div>
                <div className="truncate text-xs text-field-muted">
                  {r.holders.map((h) => h.name).join(', ')}
                  {r.holders[0]?.date ? ` · ${shortDate(r.holders[0].date)}` : ''}
                </div>
              </div>
            ))}
            {highlights.teamWinStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-field-muted">Longest win streak</div>
                <div className="tabular text-lg font-semibold text-field-ink">{highlights.teamWinStreak} games</div>
              </div>
            )}
            {highlights.onBaseStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-field-muted">On-base streak</div>
                <div className="tabular text-lg font-semibold text-field-ink">{highlights.onBaseStreak.length} games</div>
                <div className="truncate text-xs text-field-muted">{highlights.onBaseStreak.name}</div>
              </div>
            )}
            {highlights.multiHitStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-field-muted">Multi-hit games streak</div>
                <div className="tabular text-lg font-semibold text-field-ink">{highlights.multiHitStreak.length} games</div>
                <div className="truncate text-xs text-field-muted">{highlights.multiHitStreak.name}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Awards so far */}
      {keyAwards.length > 0 && (
        <Section title="Awards so far" cta="All awards" href={`/awards?season=${selectedId}`}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {keyAwards.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-field-line bg-field-paper px-3 py-2">
                <span className="text-lg" aria-hidden>{AWARD_EMOJI[a.id] ?? '🏅'}</span>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-field-muted">{a.label}</div>
                  <div className="truncate text-sm font-semibold text-field-ink">
                    {a.winners.map((w) => w.name).join(', ')}{' '}
                    <span className="font-normal text-field-muted">{a.winners[0]?.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!hasGames && summary && (
        <p className="text-xs text-field-muted">
          This season&rsquo;s player-level insights fill in as games are entered.
        </p>
      )}
    </div>
  )
}
