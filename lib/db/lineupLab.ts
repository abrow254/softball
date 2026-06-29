import { createClient } from '@/lib/supabase/server'
import type { LineupLabPlayer } from '@/lib/types'

// Players available to the lineup builder for a season.
//
// Pool: if a season roster is defined (season_roster), it IS the team for that
// year — roster members are the candidates, including ones with no stats yet
// (career stats fall back so the optimizer has a baseline). If no roster is
// defined, fall back to everyone who has stats this season (legacy behavior).
//
// Rate stats come from season_stats (then career_stats fallback); form is the
// last-6 per-game balanced value (0.5·OBP + 0.5·SLG, house OBP = (hits+fc)/ab).
export async function getLineupLabData(seasonId: string): Promise<LineupLabPlayer[]> {
  const supabase = createClient()

  const [rosterRes, statsRes, logsRes] = await Promise.all([
    supabase.from('season_roster').select('player_id').eq('season_id', seasonId),
    supabase.from('season_stats').select('player_id, name, is_regular, avg, obp, slg, ops').eq('season_id', seasonId),
    supabase
      .from('player_game_log')
      .select('player_id, game_date, hits, fc, ab, slg')
      .eq('season_id', seasonId)
      .order('game_date', { ascending: true }),
  ])
  if (rosterRes.error) throw new Error(rosterRes.error.message)
  if (statsRes.error) throw new Error(statsRes.error.message)
  if (logsRes.error) throw new Error(logsRes.error.message)

  const stats = statsRes.data ?? []
  const statsByPlayer = new Map(stats.map((s) => [s.player_id, s]))
  const rosterIds = (rosterRes.data ?? []).map((r) => r.player_id as string)

  // Candidate pool: the season roster if set, else stats players.
  const candidateIds = rosterIds.length > 0 ? rosterIds : stats.map((s) => s.player_id)
  if (candidateIds.length === 0) return []

  // Form (last-6 balanced) per player.
  const logsByPlayer = new Map<string, number[]>()
  for (const log of logsRes.data ?? []) {
    const ab = Number(log.ab)
    const obp = ab > 0 ? (Number(log.hits) + Number(log.fc)) / ab : 0
    const balanced = 0.5 * obp + 0.5 * Number(log.slg)
    if (!logsByPlayer.has(log.player_id)) logsByPlayer.set(log.player_id, [])
    logsByPlayer.get(log.player_id)!.push(balanced)
  }

  // Names / gender / positions for the candidates.
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, name, gender, positions')
    .in('id', candidateIds)
  if (playersErr) throw new Error(playersErr.message)
  const playerById = new Map((players ?? []).map((p) => [p.id, p]))

  // Career fallback for roster members without season stats yet.
  const needFallback = candidateIds.filter((id) => !statsByPlayer.has(id))
  const careerByPlayer = new Map<string, { avg: number; obp: number; slg: number; ops: number }>()
  if (needFallback.length > 0) {
    const { data: career, error: careerErr } = await supabase
      .from('career_stats')
      .select('player_id, avg, obp, slg, ops')
      .in('player_id', needFallback)
    if (careerErr) throw new Error(careerErr.message)
    for (const c of career ?? []) {
      careerByPlayer.set(c.player_id, {
        avg: Number(c.avg),
        obp: Number(c.obp),
        slg: Number(c.slg),
        ops: Number(c.ops),
      })
    }
  }

  return candidateIds.map((id) => {
    const s = statsByPlayer.get(id)
    const c = careerByPlayer.get(id)
    const p = playerById.get(id)
    const allGames = logsByPlayer.get(id) ?? []
    const form = allGames.slice(-6)
    const last3 = allGames.slice(-3)
    const recentForm = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0

    return {
      player_id: id,
      name: (s?.name as string) ?? (p?.name as string) ?? 'Unknown',
      gender: (p?.gender as 'M' | 'F' | null) ?? null,
      positions: (p?.positions as string[]) ?? [],
      is_regular: s?.is_regular ?? false,
      avg: Number(s?.avg ?? c?.avg ?? 0),
      obp: Number(s?.obp ?? c?.obp ?? 0),
      slg: Number(s?.slg ?? c?.slg ?? 0),
      ops: Number(s?.ops ?? c?.ops ?? 0),
      form,
      recentForm,
    }
  })
}
