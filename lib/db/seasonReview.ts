import { createClient } from '@/lib/supabase/server'
import type { SeasonStatRow } from '@/lib/types'
import { qualifiedRows } from '@/lib/db/eligibility'
import { recordForSeason } from '@/lib/seasonRecords'

// A shareable season-in-review for one player: their line, best game, PotG haul,
// where they ranked on the team, and a few auto-generated highlight callouts.

export interface SeasonReviewLine {
  ab: number
  hits: number
  singles: number
  doubles: number
  triples: number
  hr: number
  tb: number
  rbi: number
  runs: number
  fc: number
  avg: number
  obp: number
  slg: number
  ops: number
}

export interface SeasonReviewBestGame {
  game_id: string
  date: string | null
  opponent: string | null
  hits: number
  tb: number
  hr: number
  rbi: number
  runs: number
  ab: number
}

export interface SeasonReview {
  playerName: string
  seasonLabel: string
  year: number
  term: string
  isRegular: boolean
  line: SeasonReviewLine
  gp: number
  potgCount: number
  bestGame: SeasonReviewBestGame | null
  highlights: string[]
  teamRecord: { w: number; l: number; d: number; finished: string } | null
}

// Seasons this player has a stat line for, newest first (for card links).
export async function getPlayerSeasons(
  playerId: string,
): Promise<{ id: string; label: string; year: number; term: string }[]> {
  const supabase = createClient()
  const [ssRes, seasonsRes] = await Promise.all([
    supabase.from('season_stats').select('season_id').eq('player_id', playerId),
    supabase.from('seasons').select('id, label, year, term'),
  ])
  if (ssRes.error) throw new Error(ssRes.error.message)
  if (seasonsRes.error) throw new Error(seasonsRes.error.message)
  const byId = new Map((seasonsRes.data ?? []).map((s) => [s.id, s]))
  const termRank = (t: string) => (t === 'Fall' ? 1 : 0)
  return (ssRes.data ?? [])
    .map((r) => byId.get(r.season_id))
    .filter((s): s is { id: string; label: string; year: number; term: string } => !!s)
    .sort((a, b) => b.year - a.year || termRank(b.term) - termRank(a.term))
}

// Rank (1-based) of value among values, best = highest; null if no data.
function rankOf(value: number, values: number[]): number | null {
  if (values.length === 0) return null
  return values.filter((v) => v > value).length + 1
}

export async function getPlayerSeasonReview(
  playerId: string,
  seasonId: string,
): Promise<SeasonReview | null> {
  const supabase = createClient()

  const [seasonRes, ssRes, logRes] = await Promise.all([
    supabase.from('seasons').select('id, label, year, term').eq('id', seasonId).maybeSingle(),
    supabase.from('season_stats').select('*').eq('season_id', seasonId),
    supabase
      .from('player_game_log')
      .select('game_id, game_date, opponent, ab, hits, tb, hr, rbi, runs, is_potg')
      .eq('player_id', playerId)
      .eq('season_id', seasonId),
  ])
  if (seasonRes.error) throw new Error(seasonRes.error.message)
  if (ssRes.error) throw new Error(ssRes.error.message)
  if (logRes.error) throw new Error(logRes.error.message)

  const season = seasonRes.data
  if (!season) return null
  const rows = (ssRes.data ?? []) as SeasonStatRow[]
  const me = rows.find((r) => r.player_id === playerId)
  if (!me) return null

  const line: SeasonReviewLine = {
    ab: me.ab,
    hits: me.hits,
    singles: me.singles,
    doubles: me.doubles,
    triples: me.triples,
    hr: me.hr,
    tb: me.tb,
    rbi: me.rbi,
    runs: me.runs,
    fc: me.fc,
    avg: me.avg,
    obp: me.obp,
    slg: me.slg,
    ops: me.ops,
  }

  // Per-game log: games played, PotG haul, best game (by TB, then hits, then RBI).
  const log = logRes.data ?? []
  const gp = log.length
  const potgCount = log.filter((g) => g.is_potg).length
  let bestGame: SeasonReviewBestGame | null = null
  for (const g of log) {
    if (
      !bestGame ||
      g.tb > bestGame.tb ||
      (g.tb === bestGame.tb && g.hits > bestGame.hits) ||
      (g.tb === bestGame.tb && g.hits === bestGame.hits && g.rbi > bestGame.rbi)
    ) {
      bestGame = {
        game_id: g.game_id,
        date: g.game_date,
        opponent: g.opponent,
        hits: g.hits,
        tb: g.tb,
        hr: g.hr,
        rbi: g.rbi,
        runs: g.runs,
        ab: g.ab,
      }
    }
  }
  if (bestGame && bestGame.tb === 0 && bestGame.hits === 0) bestGame = null

  // Team ranks. Rate stats over the qualified pool; counting stats over everyone.
  const qualified = qualifiedRows(rows)
  const meQualified = qualified.some((r) => r.player_id === playerId)
  const highlights: string[] = []

  const opsRank = meQualified ? rankOf(me.ops, qualified.map((r) => r.ops)) : null
  const avgRank = meQualified ? rankOf(me.avg, qualified.map((r) => r.avg)) : null
  const hrRank = me.hr > 0 ? rankOf(me.hr, rows.map((r) => r.hr)) : null
  const rbiRank = me.rbi > 0 ? rankOf(me.rbi, rows.map((r) => r.rbi)) : null
  const hitsRank = me.hits > 0 ? rankOf(me.hits, rows.map((r) => r.hits)) : null

  const led = (rank: number | null, label: string) => rank === 1 && highlights.push(`Led the team in ${label}`)
  led(opsRank, 'OPS')
  led(avgRank, 'average')
  led(hrRank, `home runs (${me.hr})`)
  led(rbiRank, `RBI (${me.rbi})`)
  led(hitsRank, `hits (${me.hits})`)
  if (potgCount > 0) highlights.push(`${potgCount}× Player of the Game`)
  if (me.hr >= 5) highlights.push(`${me.hr} home runs`)

  const rec = recordForSeason(season.year, season.term)

  return {
    playerName: me.name,
    seasonLabel: season.label,
    year: season.year,
    term: season.term,
    isRegular: me.is_regular,
    line,
    gp,
    potgCount,
    bestGame,
    highlights: highlights.slice(0, 5),
    teamRecord: rec ? { w: rec.w, l: rec.l, d: rec.d, finished: rec.finished } : null,
  }
}
