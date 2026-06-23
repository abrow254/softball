import { createClient } from '@/lib/supabase/server'
import type { GamePlayerStats } from '@/lib/types'

export async function getGameStats(gameId: string): Promise<GamePlayerStats[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('game_player_stats').select('*').eq('game_id', gameId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface StatRowInput {
  player_id: string
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
}

// Replace all per-player counting lines for a game. Upserts on (game_id,
// player_id), then removes any rows for players no longer in the payload.
export async function replaceGameStats(gameId: string, rows: StatRowInput[]): Promise<void> {
  const supabase = createClient()
  const keepIds = rows.map((r) => r.player_id)

  if (rows.length > 0) {
    const { error } = await supabase
      .from('game_player_stats')
      .upsert(
        rows.map((r) => ({ game_id: gameId, ...r })),
        { onConflict: 'game_id,player_id' },
      )
    if (error) throw new Error(error.message)
  }

  // Drop stat rows for players removed from this game.
  let del = supabase.from('game_player_stats').delete().eq('game_id', gameId)
  if (keepIds.length > 0) del = del.not('player_id', 'in', `(${keepIds.join(',')})`)
  const { error: delError } = await del
  if (delError) throw new Error(delError.message)
}
