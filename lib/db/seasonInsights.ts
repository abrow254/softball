import type { Game } from '@/lib/types'
import { listGames } from '@/lib/db/games'
import { getSeason } from '@/lib/db/seasons'
import { getLineupSpotMatrix } from '@/lib/db/battingOrder'
import { recordForSeason } from '@/lib/seasonRecords'

// Season-scoped team analytics composed from the games table + views. See the
// Insights page. Home/away is deliberately absent (not tracked).

// A scored, non-aggregate game (forfeits have null runs, handled separately).
function scoredGames(games: Game[]): Game[] {
  return games.filter((g) => !g.is_aggregate && g.our_runs != null && g.opp_runs != null)
}

export interface SeasonSummary {
  w: number
  l: number
  d: number
  gp: number
  winPct: number
  rsPerG: number
  raPerG: number
  runDiff: number
  finished?: string
}

// Live record for the current season, official registry record for past ones —
// the single source of the season summary (also consumed by /stats).
export async function getSeasonSummary(seasonId: string): Promise<SeasonSummary | null> {
  const [season, games] = await Promise.all([getSeason(seasonId), listGames(seasonId)])
  let w = 0, l = 0, d = 0, rf = 0, ra = 0, gp = 0
  for (const g of scoredGames(games)) {
    gp++
    rf += g.our_runs as number
    ra += g.opp_runs as number
    if ((g.our_runs as number) > (g.opp_runs as number)) w++
    else if ((g.our_runs as number) < (g.opp_runs as number)) l++
    else d++
  }

  const reg = season ? recordForSeason(season.year, season.term) : undefined
  if (reg && !season?.is_current) {
    return {
      w: reg.w, l: reg.l, d: reg.d, gp: reg.w + reg.l + reg.d,
      winPct: reg.winPct, rsPerG: reg.rsPerG, raPerG: reg.raPerG, runDiff: reg.runDiff,
      finished: reg.finished,
    }
  }
  if (gp > 0) {
    return {
      w, l, d, gp,
      winPct: w / gp, rsPerG: rf / gp, raPerG: ra / gp, runDiff: rf - ra,
      finished: season?.is_current ? 'In progress' : undefined,
    }
  }
  return null
}

export interface TrajectoryGame {
  date: string | null
  opponent: string | null
  our: number
  opp: number
  diff: number
  result: 'W' | 'L' | 'D'
  forfeit: boolean
  cumW: number
  cumL: number
  cumD: number
}

// Per-game series (chronological) with running record, for the trajectory chart.
export async function getSeasonTrajectory(seasonId: string): Promise<TrajectoryGame[]> {
  const games = await listGames(seasonId)
  const played = games
    .filter((g) => !g.is_aggregate && (g.is_forfeit || (g.our_runs != null && g.opp_runs != null)))
    .sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? ''))

  let cumW = 0, cumL = 0, cumD = 0
  const out: TrajectoryGame[] = []
  for (const g of played) {
    const forfeit = !!g.is_forfeit
    const our = forfeit ? 0 : (g.our_runs as number)
    const opp = forfeit ? 0 : (g.opp_runs as number)
    const result: 'W' | 'L' | 'D' = forfeit
      ? g.forfeit_won
        ? 'W'
        : 'L'
      : our > opp
        ? 'W'
        : our < opp
          ? 'L'
          : 'D'
    if (result === 'W') cumW++
    else if (result === 'L') cumL++
    else cumD++
    out.push({ date: g.game_date, opponent: g.opponent, our, opp, diff: our - opp, result, forfeit, cumW, cumL, cumD })
  }
  return out
}

export interface ScoringProfile {
  gp: number
  rsPerG: number
  raPerG: number
  oneRunW: number
  oneRunL: number
  blowoutW: number // wins by 10+
  biggestWin: { our: number; opp: number; opponent: string | null; date: string | null } | null
  worstLoss: { our: number; opp: number; opponent: string | null; date: string | null } | null
  streak: { type: 'W' | 'L' | 'D'; n: number } | null
}

// How the runs broke down: scoring/prevention rates, close vs blowout, extremes.
export async function getScoringProfile(seasonId: string): Promise<ScoringProfile | null> {
  const games = await listGames(seasonId)
  const scored = scoredGames(games).sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? ''))
  if (scored.length === 0) return null

  let rf = 0, ra = 0, oneRunW = 0, oneRunL = 0, blowoutW = 0
  let biggestWin: ScoringProfile['biggestWin'] = null
  let worstLoss: ScoringProfile['worstLoss'] = null
  for (const g of scored) {
    const our = g.our_runs as number
    const opp = g.opp_runs as number
    rf += our
    ra += opp
    const diff = our - opp
    if (diff === 1) oneRunW++
    else if (diff === -1) oneRunL++
    if (diff >= 10) blowoutW++
    if (diff > 0 && (!biggestWin || diff > biggestWin.our - biggestWin.opp)) {
      biggestWin = { our, opp, opponent: g.opponent, date: g.game_date }
    }
    if (diff < 0 && (!worstLoss || diff < worstLoss.our - worstLoss.opp)) {
      worstLoss = { our, opp, opponent: g.opponent, date: g.game_date }
    }
  }

  // Current streak from the tail of the chronological list.
  const resultOf = (g: Game) =>
    (g.our_runs as number) > (g.opp_runs as number) ? 'W' : (g.our_runs as number) < (g.opp_runs as number) ? 'L' : 'D'
  let streak: ScoringProfile['streak'] = null
  if (scored.length > 0) {
    const last = resultOf(scored[scored.length - 1])
    let n = 0
    for (let i = scored.length - 1; i >= 0 && resultOf(scored[i]) === last; i--) n++
    streak = { type: last as 'W' | 'L' | 'D', n }
  }

  return {
    gp: scored.length,
    rsPerG: rf / scored.length,
    raPerG: ra / scored.length,
    oneRunW,
    oneRunL,
    blowoutW,
    biggestWin,
    worstLoss,
    streak,
  }
}

export interface SpotTotals {
  batting_order: number
  sample: number // total player-games logged at this spot
  ab: number
  hits: number
  tb: number
  avg: number
  slg: number
  ops: number
  topName: string | null // best producer at this spot (max OPS, ab>0)
  topOps: number
}

// Per-batting-order-spot production for one season (aggregated across players).
export async function getLineupSpotTotals(seasonId: string): Promise<SpotTotals[]> {
  const rows = await getLineupSpotMatrix(seasonId)
  type Acc = SpotTotals & { players: { name: string; ops: number; ab: number }[] }
  const bySpot = new Map<number, Acc>()
  for (const r of rows) {
    if (!bySpot.has(r.batting_order)) {
      bySpot.set(r.batting_order, {
        batting_order: r.batting_order,
        sample: 0, ab: 0, hits: 0, tb: 0, avg: 0, slg: 0, ops: 0,
        topName: null, topOps: 0, players: [],
      })
    }
    const s = bySpot.get(r.batting_order)!
    s.sample += r.gp_count
    s.ab += r.ab
    s.hits += r.hits
    s.tb += r.tb
    s.players.push({ name: r.name, ops: r.ops, ab: r.ab })
  }
  const out: SpotTotals[] = []
  for (const s of bySpot.values()) {
    const avg = s.ab > 0 ? s.hits / s.ab : 0
    const slg = s.ab > 0 ? s.tb / s.ab : 0
    const top = s.players.filter((p) => p.ab > 0).sort((a, b) => b.ops - a.ops)[0]
    out.push({
      batting_order: s.batting_order,
      sample: s.sample,
      ab: s.ab,
      hits: s.hits,
      tb: s.tb,
      avg,
      slg,
      ops: avg + slg,
      topName: top?.name ?? null,
      topOps: top?.ops ?? 0,
    })
  }
  return out.sort((a, b) => a.batting_order - b.batting_order)
}
