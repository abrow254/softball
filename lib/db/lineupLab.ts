import { createClient } from '@/lib/supabase/server'
import type { LineupLabPlayer } from '@/lib/types'

// Fetches season stats + form data for every player who appeared in the season.
// Three queries: season_stats (rate stats), players (gender), player_game_log (form).
export async function getLineupLabData(seasonId: string): Promise<LineupLabPlayer[]> {
  const supabase = createClient()

  const [statsResult, logsResult] = await Promise.all([
    supabase
      .from('season_stats')
      .select('player_id, name, is_regular, avg, obp, slg, ops')
      .eq('season_id', seasonId),
    supabase
      .from('player_game_log')
      .select('player_id, game_date, ops')
      .eq('season_id', seasonId)
      .order('game_date', { ascending: true }),
  ])

  if (statsResult.error) throw new Error(statsResult.error.message)
  if (logsResult.error) throw new Error(logsResult.error.message)

  const stats = statsResult.data ?? []
  if (stats.length === 0) return []

  const playerIds = stats.map((s) => s.player_id)
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, gender')
    .in('id', playerIds)
  if (playersErr) throw new Error(playersErr.message)

  const genderById = new Map<string, 'M' | 'F' | null>(
    (players ?? []).map((p) => [p.id, (p.gender as 'M' | 'F') ?? null]),
  )

  // Group per-game OPS by player (already sorted oldest-first by game_date).
  const logsByPlayer = new Map<string, number[]>()
  for (const log of logsResult.data ?? []) {
    const pid = log.player_id
    if (!logsByPlayer.has(pid)) logsByPlayer.set(pid, [])
    logsByPlayer.get(pid)!.push(Number(log.ops))
  }

  return stats.map((s) => {
    const allGames = logsByPlayer.get(s.player_id) ?? []
    const form = allGames.slice(-6)   // last 6, oldest-first
    const last3 = allGames.slice(-3)
    const recentForm =
      last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0

    return {
      player_id: s.player_id,
      name: s.name,
      gender: genderById.get(s.player_id) ?? null,
      is_regular: s.is_regular,
      avg: Number(s.avg),
      obp: Number(s.obp),
      slg: Number(s.slg),
      ops: Number(s.ops),
      form,
      recentForm,
    }
  })
}
