import { createClient } from '@/lib/supabase/server'
import type { CareerStatRow, PlayerGameLogEntry, PlayerSeasonRow, Season } from '@/lib/types'

const TERM_ORDER: Record<string, number> = { Summer: 0, Fall: 1 }

// All-time leaderboard: one row per player, totals across every season.
export async function getCareerStats(): Promise<CareerStatRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('career_stats')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CareerStatRow[]
}

// One player's career line + their season-by-season breakdown (chronological).
export async function getPlayerCareer(playerId: string): Promise<{
  career: CareerStatRow | null
  seasons: PlayerSeasonRow[]
}> {
  const supabase = createClient()

  const [careerRes, seasonRes, seasonsRes] = await Promise.all([
    supabase.from('career_stats').select('*').eq('player_id', playerId).maybeSingle(),
    supabase.from('season_stats').select('*').eq('player_id', playerId),
    supabase.from('seasons').select('*'),
  ])

  if (careerRes.error) throw new Error(careerRes.error.message)
  if (seasonRes.error) throw new Error(seasonRes.error.message)
  if (seasonsRes.error) throw new Error(seasonsRes.error.message)

  const seasonsById = new Map<string, Season>(
    (seasonsRes.data ?? []).map((s) => [s.id, s as Season]),
  )

  const seasons: PlayerSeasonRow[] = (seasonRes.data ?? [])
    .map((row) => {
      const s = seasonsById.get(row.season_id)
      return {
        ...row,
        season_label: s?.label ?? '—',
        year: s?.year ?? 0,
        term: s?.term ?? 'Summer',
      } as PlayerSeasonRow
    })
    .sort((a, b) => a.year - b.year || (TERM_ORDER[a.term] - TERM_ORDER[b.term]))

  return { career: (careerRes.data as CareerStatRow) ?? null, seasons }
}

// Per-game log for one player in one season (excludes aggregate games).
// Returns newest game first.
export async function getPlayerGameLog(
  playerId: string,
  seasonId: string,
): Promise<PlayerGameLogEntry[]> {
  const supabase = createClient()

  // Fetch all stat rows for this player, then the real games for those IDs.
  const statsRes = await supabase
    .from('game_player_stats')
    .select('*')
    .eq('player_id', playerId)

  if (statsRes.error) throw new Error(statsRes.error.message)
  const statRows = statsRes.data ?? []
  if (statRows.length === 0) return []

  const gameIds = statRows.map((s) => s.game_id)
  const gamesRes = await supabase
    .from('games')
    .select('id, game_date, opponent, is_aggregate, potg_player_id')
    .in('id', gameIds)
    .eq('season_id', seasonId)
    .eq('is_aggregate', false)
    .order('game_date', { ascending: false, nullsFirst: false })

  if (gamesRes.error) throw new Error(gamesRes.error.message)

  const gameById = new Map(
    (gamesRes.data ?? []).map((g) => [
      g.id,
      {
        game_date: g.game_date as string,
        opponent: g.opponent as string | null,
        is_potg: g.potg_player_id === playerId,
      },
    ]),
  )

  const entries: PlayerGameLogEntry[] = []
  for (const s of statRows) {
    const g = gameById.get(s.game_id)
    if (!g) continue
    const h = s.singles + s.doubles + s.triples + s.hr
    const tb = s.singles + 2 * s.doubles + 3 * s.triples + 4 * s.hr
    const avg = s.ab > 0 ? h / s.ab : 0
    const slg = s.ab > 0 ? tb / s.ab : 0
    entries.push({
      player_id: playerId,
      game_id: s.game_id,
      game_date: g.game_date,
      season_id: seasonId,
      hits: h,
      ab: s.ab,
      avg,
      slg,
      ops: avg + slg,
      singles: s.singles,
      doubles: s.doubles,
      triples: s.triples,
      hr: s.hr,
      tb,
      fc: s.fc,
      bb: s.bb,
      hbp: s.hbp,
      roe: s.roe,
      rbi: s.rbi,
      runs: s.runs,
      k: s.k,
      opponent: g.opponent,
      is_potg: g.is_potg,
    })
  }

  // Sort newest first (matching the games query order).
  entries.sort((a, b) => b.game_date.localeCompare(a.game_date))
  return entries
}
