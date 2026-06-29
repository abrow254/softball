import Link from 'next/link'
import { getSchedule, SCHEDULE_SOURCE_URL, type ScheduleGame } from '@/lib/schedule'
import { getStandings, STANDINGS_SOURCE } from '@/lib/standings'
import { listGames, getBoxScore } from '@/lib/db'
import { formatPotGLine, selectPotG } from '@/lib/potg'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata = { title: 'Schedule — The Softball Team' }

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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className="tabular text-xl font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

export default async function SchedulePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [schedule, standings, currentSeason] = await Promise.all([
    getSchedule(),
    getStandings(),
    (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle()
      return data
    })(),
  ])

  // Load DB games and resolve Player of the Game per game. We index each game
  // by BOTH its date and its (normalized) opponent name, then match a schedule
  // row by date first and fall back to opponent — because some DB games have a
  // missing/mismatched date while others have a name that differs from the
  // scraped schedule. Using both keys covers every game.
  interface GameInfo {
    gameId: string
    potgName: string | null
    potgLine: string | null
  }
  const gamesByDate = new Map<string, GameInfo>()
  const gamesByOpponent = new Map<string, GameInfo>()
  const normOpp = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()

  if (currentSeason && schedule) {
    const games = await listGames(currentSeason.id)
    const supabase = createClient()
    const { data: players } = await supabase.from('players').select('id, name')
    const playerMap = new Map((players ?? []).map((p) => [p.id, p.name]))

    for (const g of games) {
      // Skip only the bulk-import aggregate row — it's not a real game. Games
      // with a null date are still indexed (by opponent) so they show up.
      if (g.is_aggregate) continue

      const boxScore = await getBoxScore(g.id)
      let potgName: string | null = null
      let potgLine: string | null = null

      if (boxScore && boxScore.length > 0) {
        // Prefer the stored winner, but fall back to computing it from the box
        // score so bulk-imported games (no stored potg_player_id) still resolve.
        let potgId = g.potg_player_id
        if (!potgId || !boxScore.some((p) => p.player_id === potgId)) {
          potgId = selectPotG(boxScore).winnerId
        }
        const line = potgId ? boxScore.find((p) => p.player_id === potgId) : undefined
        if (line) {
          potgName = playerMap.get(line.player_id) ?? line.name ?? null
          potgLine = formatPotGLine(line)
        }
      }

      const info: GameInfo = { gameId: g.id, potgName, potgLine }
      if (g.game_date) gamesByDate.set(g.game_date, info)
      if (g.opponent) gamesByOpponent.set(normOpp(g.opponent), info)
    }
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Schedule</h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          The schedule is unavailable right now. Check it directly at{' '}
          <a href={SCHEDULE_SOURCE_URL} target="_blank" rel="noreferrer" className="text-field-grass hover:underline">
            {STANDINGS_SOURCE}
          </a>
          .
        </p>
      </div>
    )
  }

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

  const played = schedule.filter((g) => g.played)
  const upcoming = schedule.filter((g) => !g.played && g.date >= today)

  // Derive our record from played games.
  let w = 0,
    l = 0,
    d = 0,
    rf = 0,
    ra = 0
  for (const g of played) {
    rf += g.ourScore ?? 0
    ra += g.oppScore ?? 0
    const res = resultOf(g)
    if (res === 'W') w++
    else if (res === 'L') l++
    else if (res === 'D') d++
  }
  const diff = rf - ra

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Schedule</h1>
        {standings && <p className="mt-1 text-sm text-field-muted">{standings.season}</p>}
      </div>

      {/* Record summary */}
      <section className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile label="Record" value={`${w}-${l}-${d}`} />
        <Tile label="Runs For" value={String(rf)} />
        <Tile label="Runs Against" value={String(ra)} />
        <Tile label="Run Diff" value={diff > 0 ? `+${diff}` : String(diff)} />
        {ourStanding?.rank != null && <Tile label={ourStanding.pool} value={ordinal(ourStanding.rank)} />}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Upcoming</h2>
          <ul className="divide-y divide-field-line overflow-hidden rounded-lg border border-field-line">
            {upcoming.map((g) => (
              <li key={`${g.date}-${g.opponent}`} className="flex items-center justify-between gap-3 bg-field-paper px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-field-ink">{g.opponent}</div>
                  <div className="text-xs text-field-muted">
                    {shortDate(g.date)}
                    {g.time ? ` · ${g.time}` : ''}
                  </div>
                </div>
                {recordByTeam.get(g.opponent) && (
                  <span className="shrink-0 tabular text-sm text-field-muted">{recordByTeam.get(g.opponent)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Results */}
      {played.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Results</h2>
          <ul className="divide-y divide-field-line overflow-hidden rounded-lg border border-field-line">
            {played.map((g) => {
              const res = resultOf(g)
              const info = gamesByDate.get(g.date) ?? gamesByOpponent.get(normOpp(g.opponent))
              const gameLink = info?.gameId ? `/games/${info.gameId}/card` : null

              const details = (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-field-ink">{g.opponent}</div>
                    <div className="text-xs text-field-muted">{shortDate(g.date)}</div>
                    {info?.potgName && (
                      <div className="mt-0.5 space-y-0.5">
                        <div className="text-xs text-field-grass font-semibold">⭐ {info.potgName}</div>
                        {info.potgLine && (
                          <div className="text-xs text-field-muted tabular">{info.potgLine}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-sm text-field-ink">
                      {g.ourScore}–{g.oppScore}
                    </span>
                    {res && <span className={`w-4 text-right font-semibold ${RESULT_CLASS[res]}`}>{res}</span>}
                  </div>
                </div>
              )

              return (
                <li key={`${g.date}-${g.opponent}`} className="bg-field-paper">
                  {gameLink ? (
                    <Link href={gameLink} className="block px-4 py-3 transition-colors hover:bg-field-cream/50">
                      {details}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{details}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <p className="text-xs text-field-muted">
        Schedule &amp; results from{' '}
        <a href={SCHEDULE_SOURCE_URL} target="_blank" rel="noreferrer" className="text-field-grass hover:underline">
          {STANDINGS_SOURCE}
        </a>
        , refreshed hourly.
      </p>
    </div>
  )
}
