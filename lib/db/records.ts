import { createClient } from '@/lib/supabase/server'
import type { SeasonStatRow, Season } from '@/lib/types'
import { fmt3 } from '@/lib/formulas'
import { qualifiedRows } from '@/lib/db/eligibility'

export interface RecordHolder {
  player_id: string
  name: string
  date?: string
  opponent?: string | null
  season?: string
}

export interface StatRecord {
  label: string
  display: string // formatted value
  holders: RecordHolder[]
}

export interface StreakRecord {
  player_id: string
  name: string
  length: number
}

export interface PotgLeader {
  player_id: string
  name: string
  wins: number
}

export interface TeamRecord {
  label: string
  value: string
  detail?: string
}

export interface RecordsResult {
  singleGame: StatRecord[]
  season: StatRecord[]
  team: TeamRecord[]
  potgLeaders: PotgLeader[]
  onBaseStreak: StreakRecord | null
  multiHitStreak: StreakRecord | null
}

type GameLogRow = {
  player_id: string
  game_date: string
  opponent: string | null
  hits: number
  tb: number
  hr: number
  rbi: number
  runs: number
  fc: number
}

// Top value over a per-game metric, with all co-holders.
function singleGameRecord(
  rows: GameLogRow[],
  label: string,
  pick: (r: GameLogRow) => number,
  nameById: Map<string, string>,
  fmtVal: (v: number) => string = String,
): StatRecord | null {
  let best = 0
  for (const r of rows) best = Math.max(best, pick(r))
  if (best <= 0) return null
  const holders = rows
    .filter((r) => pick(r) === best)
    .map((r) => ({
      player_id: r.player_id,
      name: nameById.get(r.player_id) ?? '—',
      date: r.game_date,
      opponent: r.opponent,
    }))
  return { label, display: fmtVal(best), holders }
}

// Top value over season rows (already filtered to the eligible pool).
function seasonRecord(
  rows: (SeasonStatRow & { _season?: string })[],
  label: string,
  key: keyof SeasonStatRow,
  fmtVal: (v: number) => string = String,
): StatRecord | null {
  if (rows.length === 0) return null
  let best = -Infinity
  for (const r of rows) best = Math.max(best, r[key] as number)
  if (!isFinite(best) || best <= 0) return null
  const holders = rows
    .filter((r) => (r[key] as number) === best)
    .map((r) => ({ player_id: r.player_id, name: r.name, season: r._season }))
  return { label, display: fmtVal(best), holders }
}

// Longest run of consecutive games (chronological, per player) satisfying pred.
function longestStreak(rows: GameLogRow[], pred: (r: GameLogRow) => boolean, nameById: Map<string, string>): StreakRecord | null {
  const byPlayer = new Map<string, GameLogRow[]>()
  for (const r of rows) {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, [])
    byPlayer.get(r.player_id)!.push(r)
  }
  let best: StreakRecord | null = null
  for (const [pid, games] of byPlayer) {
    games.sort((a, b) => a.game_date.localeCompare(b.game_date))
    let run = 0
    let max = 0
    for (const g of games) {
      run = pred(g) ? run + 1 : 0
      max = Math.max(max, run)
    }
    if (max > (best?.length ?? 0)) best = { player_id: pid, name: nameById.get(pid) ?? '—', length: max }
  }
  return best && best.length >= 2 ? best : null
}

export async function getRecords(): Promise<RecordsResult> {
  const supabase = createClient()

  const [pglRes, ssRes, seasonsRes, gamesRes, playersRes] = await Promise.all([
    supabase
      .from('player_game_log')
      .select('player_id, game_date, opponent, hits, tb, hr, rbi, runs, fc'),
    supabase.from('season_stats').select('*'),
    supabase.from('seasons').select('id, label'),
    supabase
      .from('games')
      .select('season_id, game_date, opponent, our_runs, opp_runs, potg_player_id, is_aggregate')
      .eq('is_aggregate', false),
    supabase.from('players').select('id, name'),
  ])

  for (const r of [pglRes, ssRes, seasonsRes, gamesRes, playersRes]) {
    if (r.error) throw new Error(r.error.message)
  }

  const pgl = (pglRes.data ?? []) as GameLogRow[]
  const ss = (ssRes.data ?? []) as SeasonStatRow[]
  const seasonLabel = new Map((seasonsRes.data ?? []).map((s) => [s.id, s.label as string]))
  const nameById = new Map((playersRes.data ?? []).map((p) => [p.id, p.name as string]))

  // ---- Single-game records ----
  const singleGame = [
    singleGameRecord(pgl, 'Most hits, game', (r) => r.hits, nameById),
    singleGameRecord(pgl, 'Most total bases, game', (r) => r.tb, nameById),
    singleGameRecord(pgl, 'Most home runs, game', (r) => r.hr, nameById),
    singleGameRecord(pgl, 'Most RBI, game', (r) => r.rbi, nameById),
    singleGameRecord(pgl, 'Most runs, game', (r) => r.runs, nameById),
  ].filter((r): r is StatRecord => r !== null)

  // ---- Season records ----
  // Rate stats from the per-season qualified pool; counting stats from all rows.
  const bySeason = new Map<string, SeasonStatRow[]>()
  for (const r of ss) {
    if (!bySeason.has(r.season_id)) bySeason.set(r.season_id, [])
    bySeason.get(r.season_id)!.push(r)
  }
  const qualifiedPool: (SeasonStatRow & { _season?: string })[] = []
  const allPool: (SeasonStatRow & { _season?: string })[] = []
  for (const [sid, rows] of bySeason) {
    const label = seasonLabel.get(sid)
    for (const r of qualifiedRows(rows)) qualifiedPool.push({ ...r, _season: label })
    for (const r of rows) allPool.push({ ...r, _season: label })
  }

  const season = [
    seasonRecord(qualifiedPool, 'Best OPS, season', 'ops', fmt3),
    seasonRecord(qualifiedPool, 'Best AVG, season', 'avg', fmt3),
    seasonRecord(qualifiedPool, 'Best SLG, season', 'slg', fmt3),
    seasonRecord(allPool, 'Most home runs, season', 'hr'),
    seasonRecord(allPool, 'Most hits, season', 'hits'),
    seasonRecord(allPool, 'Most total bases, season', 'tb'),
  ].filter((r): r is StatRecord => r !== null)

  // ---- Team records ----
  const games = (gamesRes.data ?? []).filter(
    (g) => g.our_runs != null && g.opp_runs != null,
  ) as { season_id: string; game_date: string; opponent: string | null; our_runs: number; opp_runs: number; potg_player_id: string | null }[]

  const team: TeamRecord[] = []
  if (games.length > 0) {
    const byMargin = [...games].sort((a, b) => b.our_runs - b.opp_runs - (a.our_runs - a.opp_runs))[0]
    if (byMargin.our_runs > byMargin.opp_runs) {
      team.push({
        label: 'Biggest win',
        value: `${byMargin.our_runs}–${byMargin.opp_runs}`,
        detail: `vs ${byMargin.opponent ?? '—'} · ${byMargin.game_date}`,
      })
    }
    const byRuns = [...games].sort((a, b) => b.our_runs - a.our_runs)[0]
    team.push({
      label: 'Most runs, game',
      value: String(byRuns.our_runs),
      detail: `vs ${byRuns.opponent ?? '—'} · ${byRuns.game_date}`,
    })
    // Longest win streak (chronological across all seasons)
    const chrono = [...games].sort((a, b) => a.game_date.localeCompare(b.game_date))
    let run = 0
    let max = 0
    for (const g of chrono) {
      run = g.our_runs > g.opp_runs ? run + 1 : 0
      max = Math.max(max, run)
    }
    if (max >= 2) team.push({ label: 'Longest win streak', value: `${max} games` })
  }

  // ---- PotG leaderboard (all-time) ----
  const potgWins = new Map<string, number>()
  for (const g of games) {
    if (g.potg_player_id) potgWins.set(g.potg_player_id, (potgWins.get(g.potg_player_id) ?? 0) + 1)
  }
  const potgLeaders: PotgLeader[] = [...potgWins.entries()]
    .map(([pid, wins]) => ({ player_id: pid, name: nameById.get(pid) ?? '—', wins }))
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))

  // ---- Streaks ----
  const onBaseStreak = longestStreak(pgl, (r) => r.hits + r.fc > 0, nameById)
  const multiHitStreak = longestStreak(pgl, (r) => r.hits >= 2, nameById)

  return { singleGame, season, team, potgLeaders, onBaseStreak, multiHitStreak }
}
