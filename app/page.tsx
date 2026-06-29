import Link from 'next/link'
import { getSchedule, type ScheduleGame } from '@/lib/schedule'
import { getStandings, type Standings } from '@/lib/standings'
import { getCurrentSeason, getSeasonStats, listGames, getBoxScore } from '@/lib/db'
import { selectPotG, formatPotGLine } from '@/lib/potg'
import { TeamPhotoHero } from '@/components/TeamPhotoHero'
import { allPhotoSrcs } from '@/lib/teamPhotos'
import type { SeasonStatRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'The Softball Team' }

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function resultOf(g: ScheduleGame): 'W' | 'L' | 'D' | null {
  if (!g.played || g.ourScore == null || g.oppScore == null) return null
  if (g.ourScore > g.oppScore) return 'W'
  if (g.ourScore < g.oppScore) return 'L'
  return 'D'
}

const RESULT_CLASS: Record<'W' | 'L' | 'D', string> = {
  W: 'text-field-grass',
  L: 'text-field-clay',
  D: 'text-field-muted',
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const normOpp = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()

type Strength = 'strong' | 'average' | 'weak'

interface OppAnalysis {
  diff: number
  rpgFor: number
  rpgAgainst: number
  batting: Strength
  defence: Strength
  read: string
}

// Sizes up the next opponent from the league standings: are they good at
// batting (runs scored vs league avg), defence (runs allowed vs league avg),
// or both — plus a one-line read framed from our perspective.
function analyzeOpponent(standings: Standings, teamName: string): OppAnalysis | null {
  const rows = standings.pools.flatMap((p) => p.rows).map((r) => ({ ...r, gp: r.w + r.l + r.d }))
  const opp = rows.find((r) => normOpp(r.team) === normOpp(teamName))
  if (!opp || opp.gp === 0) return null

  const played = rows.filter((r) => r.gp > 0)
  const avgFor = played.reduce((s, r) => s + r.pf / r.gp, 0) / played.length
  const avgAgainst = played.reduce((s, r) => s + r.pa / r.gp, 0) / played.length

  const rpgFor = opp.pf / opp.gp
  const rpgAgainst = opp.pa / opp.gp
  const HI = 1.08
  const LO = 0.92

  const batting: Strength = rpgFor > avgFor * HI ? 'strong' : rpgFor < avgFor * LO ? 'weak' : 'average'
  // Defence: fewer runs allowed is better.
  const defence: Strength =
    rpgAgainst < avgAgainst * LO ? 'strong' : rpgAgainst > avgAgainst * HI ? 'weak' : 'average'

  let read: string
  if (batting === 'strong' && defence === 'strong') read = 'Complete team — bring your best.'
  else if (batting === 'strong' && defence === 'weak') read = 'Big bats but leaky — win the shootout.'
  else if (batting === 'weak' && defence === 'strong') read = 'Stingy defence, light bats — small ball wins.'
  else if (batting === 'weak' && defence === 'weak') read = 'Beatable on both sides — take care of business.'
  else if (batting === 'strong') read = 'Watch the bats — they can put up runs.'
  else if (defence === 'strong') read = 'Tough defence — scratch runs across.'
  else if (batting === 'weak') read = 'Light-hitting — keep them quiet.'
  else if (defence === 'weak') read = 'Leaky defence — pour it on.'
  else read = 'Middle of the pack — even matchup.'

  return { diff: opp.diff, rpgFor, rpgAgainst, batting, defence, read }
}

const STRENGTH_LABEL: Record<Strength, string> = { strong: 'Strong', average: 'Average', weak: 'Weak' }
// Framed from our view: their strength = caution (clay), their weakness = our opening (grass).
const STRENGTH_CLASS: Record<Strength, string> = {
  strong: 'bg-field-clay/10 text-field-clay',
  average: 'bg-field-cream text-field-muted',
  weak: 'bg-field-grass/10 text-field-grass',
}

function StrengthTag({ kind, level }: { kind: string; level: Strength }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STRENGTH_CLASS[level]}`}>
      {kind}: {STRENGTH_LABEL[level]}
    </span>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className="tabular text-xl font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

function SectionHeading({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">{children}</h2>
      {href && cta && (
        <Link href={href} className="text-xs font-medium text-field-grass hover:underline">
          {cta} →
        </Link>
      )}
    </div>
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

const QUICK_LINKS = [
  { href: '/schedule', label: 'Schedule', emoji: '📅' },
  { href: '/standings', label: 'Standings', emoji: '🏟️' },
  { href: '/stats', label: 'Stats', emoji: '📊' },
  { href: '/awards', label: 'Awards', emoji: '🏆' },
  { href: '/players', label: 'All-Time', emoji: '📜' },
]

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [schedule, standings, season] = await Promise.all([getSchedule(), getStandings(), getCurrentSeason()])

  // ---- Record, run diff, pool rank (from played games + standings) ----
  const played = (schedule ?? []).filter((g) => g.played).sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = (schedule ?? [])
    .filter((g) => !g.played && g.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  let w = 0, l = 0, d = 0, rf = 0, ra = 0
  for (const g of played) {
    rf += g.ourScore ?? 0
    ra += g.oppScore ?? 0
    const res = resultOf(g)
    if (res === 'W') w++
    else if (res === 'L') l++
    else if (res === 'D') d++
  }
  const diff = rf - ra

  const recordByTeam = new Map<string, string>()
  let ourStanding: { pool: string; rank: number | null } | null = null
  if (standings) {
    for (const pool of standings.pools) {
      for (const r of pool.rows) {
        recordByTeam.set(r.team, `${r.w}-${r.l}-${r.d}`)
        if (r.isUs) ourStanding = { pool: pool.name, rank: r.rank }
      }
    }
  }

  const nextGame = upcoming[0] ?? null
  const lastGame = played[played.length - 1] ?? null
  const oppAnalysis = standings && nextGame ? analyzeOpponent(standings, nextGame.opponent) : null

  // ---- Last result: link + Player of the Game (computed live if needed) ----
  let lastGameId: string | null = null
  let lastPotg: { name: string; line: string } | null = null
  if (season && lastGame) {
    const games = await listGames(season.id)
    const dbGame =
      games.find((g) => !g.is_aggregate && g.game_date === lastGame.date) ??
      games.find((g) => !g.is_aggregate && normOpp(g.opponent) === normOpp(lastGame.opponent))
    if (dbGame) {
      lastGameId = dbGame.id
      const box = await getBoxScore(dbGame.id)
      if (box && box.length > 0) {
        let pid = dbGame.potg_player_id
        if (!pid || !box.some((p) => p.player_id === pid)) pid = selectPotG(box).winnerId
        const row = pid ? box.find((p) => p.player_id === pid) : undefined
        if (row) lastPotg = { name: row.name, line: formatPotGLine(row) }
      }
    }
  }

  // ---- Season leaders ----
  let leaders: { avg: SeasonStatRow[]; ops: SeasonStatRow[]; hr: SeasonStatRow[] } | null = null
  if (season) {
    const stats = await getSeasonStats(season.id)
    const qualified = stats.filter((s) => s.is_regular && s.ab > 0)
    const top = (rows: SeasonStatRow[], key: (r: SeasonStatRow) => number) =>
      [...rows].sort((a, b) => key(b) - key(a)).slice(0, 3)
    leaders = {
      avg: top(qualified, (r) => r.avg),
      ops: top(qualified, (r) => r.ops),
      hr: top(stats.filter((s) => s.hr > 0), (r) => r.hr),
    }
  }

  const lastRes = lastGame ? resultOf(lastGame) : null
  const fmt3 = (n: number) => n.toFixed(3).replace(/^0/, '')

  return (
    <div className="space-y-6">
      <TeamPhotoHero photos={allPhotoSrcs()} subtitle={standings?.season ?? season?.label ?? null} />

      {/* Record summary */}
      {played.length > 0 && (
        <section className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Tile label="Record" value={`${w}-${l}-${d}`} />
          <Tile label="Run Diff" value={diff > 0 ? `+${diff}` : String(diff)} />
          <Tile label="Runs For" value={String(rf)} />
          {ourStanding?.rank != null ? (
            <Tile label={ourStanding.pool} value={ordinal(ourStanding.rank)} />
          ) : (
            <Tile label="Runs Against" value={String(ra)} />
          )}
        </section>
      )}

      {/* Next game + Last result */}
      <section className="grid gap-4 sm:grid-cols-2">
        {/* Next game */}
        <div className="space-y-2">
          <SectionHeading href="/schedule" cta="Schedule">
            Next game
          </SectionHeading>
          {nextGame ? (
            <Link
              href="/schedule"
              className="block rounded-lg border border-field-line bg-field-paper p-4 transition-colors hover:bg-field-cream/50"
            >
              <div className="text-lg font-semibold text-field-ink">{nextGame.opponent}</div>
              <div className="mt-0.5 text-sm text-field-muted">
                {shortDate(nextGame.date)}
                {nextGame.time ? ` · ${nextGame.time}` : ''}
              </div>

              {/* Scouting line */}
              {(recordByTeam.get(nextGame.opponent) || oppAnalysis) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {recordByTeam.get(nextGame.opponent) && (
                    <span className="rounded bg-field-cream px-2 py-0.5 text-xs font-medium text-field-muted">
                      {recordByTeam.get(nextGame.opponent)}
                    </span>
                  )}
                  {oppAnalysis && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        oppAnalysis.diff > 0
                          ? 'bg-field-clay/10 text-field-clay'
                          : oppAnalysis.diff < 0
                            ? 'bg-field-grass/10 text-field-grass'
                            : 'bg-field-cream text-field-muted'
                      }`}
                    >
                      {oppAnalysis.diff > 0 ? '+' : ''}
                      {oppAnalysis.diff} run diff
                    </span>
                  )}
                </div>
              )}

              {oppAnalysis && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    <StrengthTag kind="Bats" level={oppAnalysis.batting} />
                    <StrengthTag kind="Defence" level={oppAnalysis.defence} />
                  </div>
                  <p className="text-xs text-field-muted">
                    {oppAnalysis.read}{' '}
                    <span className="text-field-muted/70">
                      ({oppAnalysis.rpgFor.toFixed(1)} RS · {oppAnalysis.rpgAgainst.toFixed(1)} RA / game)
                    </span>
                  </p>
                </div>
              )}
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-field-line bg-field-paper p-4 text-sm text-field-muted">
              No upcoming games scheduled.
            </div>
          )}
        </div>

        {/* Last result */}
        <div className="space-y-2">
          <SectionHeading>Last result</SectionHeading>
          {lastGame ? (
            (() => {
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-field-ink">{lastGame.opponent}</div>
                      <div className="mt-0.5 text-sm text-field-muted">{shortDate(lastGame.date)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular text-lg font-semibold text-field-ink">
                        {lastGame.ourScore}–{lastGame.oppScore}
                      </span>
                      {lastRes && <span className={`font-bold ${RESULT_CLASS[lastRes]}`}>{lastRes}</span>}
                    </div>
                  </div>
                  {lastPotg && (
                    <div className="mt-2 border-t border-field-line pt-2">
                      <div className="text-xs font-semibold text-field-grass">⭐ {lastPotg.name}</div>
                      {lastPotg.line && <div className="text-xs text-field-muted tabular">{lastPotg.line}</div>}
                    </div>
                  )}
                </>
              )
              return lastGameId ? (
                <Link
                  href={`/games/${lastGameId}/card`}
                  className="block rounded-lg border border-field-line bg-field-paper p-4 transition-colors hover:bg-field-cream/50"
                >
                  {inner}
                </Link>
              ) : (
                <div className="rounded-lg border border-field-line bg-field-paper p-4">{inner}</div>
              )
            })()
          ) : (
            <div className="rounded-lg border border-dashed border-field-line bg-field-paper p-4 text-sm text-field-muted">
              No games played yet.
            </div>
          )}
        </div>
      </section>

      {/* Season leaders */}
      {leaders && (leaders.avg.length > 0 || leaders.hr.length > 0) && (
        <section className="space-y-2">
          <SectionHeading href="/stats" cta="Full stats">
            Season leaders
          </SectionHeading>
          <div className="grid gap-4 rounded-lg border border-field-line bg-field-paper p-4 sm:grid-cols-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">Average</h3>
              <LeaderList rows={leaders.avg} fmt={(r) => fmt3(r.avg)} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">OPS</h3>
              <LeaderList rows={leaders.ops} fmt={(r) => fmt3(r.ops)} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">Home Runs</h3>
              <LeaderList rows={leaders.hr} fmt={(r) => String(r.hr)} />
            </div>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex items-center gap-2 rounded-lg border border-field-line bg-field-paper px-3 py-3 font-medium text-field-ink transition-colors hover:border-field-grass hover:bg-field-grass/5"
          >
            <span aria-hidden>{q.emoji}</span>
            {q.label}
          </Link>
        ))}
      </section>
    </div>
  )
}
