import { createClient } from '@/lib/supabase/server'

// All-time head-to-head history, built from real (non-aggregate) game rows.
// Opponent names are normalized for grouping (drop a leading "the", collapse
// whitespace, case-insensitive) so the same club across seasons counts as one
// rivalry, while the most-seen raw spelling is kept for display.

export interface OpponentRecord {
  key: string // normalized grouping key (used in the URL)
  name: string // display name (most frequent raw spelling)
  gp: number
  w: number
  l: number
  d: number
  rf: number
  ra: number
  diff: number
  lastPlayed: string | null // ISO date of most recent meeting
  curStreak: { type: 'W' | 'L' | 'D'; n: number } | null // current run vs them
}

export interface OpponentGame {
  game_id: string
  season_label: string
  game_date: string | null
  our_runs: number | null
  opp_runs: number | null
  opponent_raw: string
  result: 'W' | 'L' | 'D'
  forfeit: boolean
}

export interface OpponentDetail {
  record: OpponentRecord
  games: OpponentGame[] // newest first
}

export const normOpponent = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()

type RawGame = {
  id: string
  season_id: string
  game_date: string | null
  opponent: string | null
  our_runs: number | null
  opp_runs: number | null
  is_forfeit: boolean
  forfeit_won: boolean | null
}

// Result of one game: forfeits carry a known W/L; scored games compare runs.
const resultOf = (g: RawGame): 'W' | 'L' | 'D' => {
  if (g.is_forfeit) return g.forfeit_won ? 'W' : 'L'
  const our = g.our_runs!
  const opp = g.opp_runs!
  return our > opp ? 'W' : our < opp ? 'L' : 'D'
}

async function loadGames(): Promise<{ games: RawGame[]; seasonLabel: Map<string, string> }> {
  const supabase = createClient()
  const [gamesRes, seasonsRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, season_id, game_date, opponent, our_runs, opp_runs, is_forfeit, forfeit_won')
      .eq('is_aggregate', false),
    supabase.from('seasons').select('id, label'),
  ])
  if (gamesRes.error) throw new Error(gamesRes.error.message)
  if (seasonsRes.error) throw new Error(seasonsRes.error.message)

  // Keep games with a known result: a recorded score, or a forfeit flag.
  const games = (gamesRes.data ?? []).filter(
    (g) => g.opponent && (g.is_forfeit || (g.our_runs != null && g.opp_runs != null)),
  ) as RawGame[]
  const seasonLabel = new Map((seasonsRes.data ?? []).map((s) => [s.id, s.label as string]))
  return { games, seasonLabel }
}

// Pick the most frequent raw spelling within a normalized group.
function displayName(rawCounts: Map<string, number>): string {
  let best = ''
  let bestN = -1
  for (const [raw, n] of rawCounts) {
    if (n > bestN) {
      best = raw
      bestN = n
    }
  }
  return best
}

// One row per opponent, all-time, sorted by games played (rivalries first).
export async function getOpponentRecords(): Promise<OpponentRecord[]> {
  const { games } = await loadGames()

  const groups = new Map<
    string,
    { raw: Map<string, number>; games: { date: string | null; res: 'W' | 'L' | 'D' }[]; rf: number; ra: number }
  >()
  for (const g of games) {
    const key = normOpponent(g.opponent)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { raw: new Map(), games: [], rf: 0, ra: 0 })
    const grp = groups.get(key)!
    grp.raw.set(g.opponent!, (grp.raw.get(g.opponent!) ?? 0) + 1)
    grp.games.push({ date: g.game_date, res: resultOf(g) })
    // Forfeits have no runs — they count in the W/L but not in RS/RA.
    if (!g.is_forfeit) {
      grp.rf += g.our_runs!
      grp.ra += g.opp_runs!
    }
  }

  const records: OpponentRecord[] = []
  for (const [key, grp] of groups) {
    const chrono = [...grp.games].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    let w = 0, l = 0, d = 0
    for (const g of chrono) {
      if (g.res === 'W') w++
      else if (g.res === 'L') l++
      else d++
    }
    // Current streak from the tail of the chronological list.
    let curStreak: OpponentRecord['curStreak'] = null
    if (chrono.length > 0) {
      const last = chrono[chrono.length - 1].res
      let n = 0
      for (let i = chrono.length - 1; i >= 0 && chrono[i].res === last; i--) n++
      curStreak = { type: last, n }
    }
    const lastPlayed = chrono.length > 0 ? chrono[chrono.length - 1].date : null
    records.push({
      key,
      name: displayName(grp.raw),
      gp: grp.games.length,
      w,
      l,
      d,
      rf: grp.rf,
      ra: grp.ra,
      diff: grp.rf - grp.ra,
      lastPlayed,
      curStreak,
    })
  }

  // Rivalries (most-played) first; tiebreak by name.
  records.sort((a, b) => b.gp - a.gp || a.name.localeCompare(b.name))
  return records
}

// Full head-to-head detail for one opponent (by normalized key), or null.
export async function getOpponentDetail(key: string): Promise<OpponentDetail | null> {
  const norm = normOpponent(key)
  const all = await getOpponentRecords()
  const record = all.find((r) => r.key === norm)
  if (!record) return null

  const { games, seasonLabel } = await loadGames()
  const detailGames: OpponentGame[] = games
    .filter((g) => normOpponent(g.opponent) === norm)
    .map((g) => ({
      game_id: g.id,
      season_label: seasonLabel.get(g.season_id) ?? '—',
      game_date: g.game_date,
      our_runs: g.is_forfeit ? null : g.our_runs,
      opp_runs: g.is_forfeit ? null : g.opp_runs,
      opponent_raw: g.opponent!,
      result: resultOf(g),
      forfeit: g.is_forfeit,
    }))
    .sort((a, b) => (b.game_date ?? '').localeCompare(a.game_date ?? ''))

  return { record, games: detailGames }
}
