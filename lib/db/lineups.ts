import { createClient } from '@/lib/supabase/server'
import type { Lineup } from '@/lib/types'

export async function getLineup(gameId: string): Promise<Lineup[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('game_id', gameId)
    .order('batting_order', { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface LineupRow {
  player_id: string
  batting_order: number | null
  starting_pos: string | null
}

// Replace the whole lineup for a game (delete + insert).
export async function replaceLineup(gameId: string, rows: LineupRow[]): Promise<void> {
  const supabase = createClient()
  const { error: delError } = await supabase.from('lineups').delete().eq('game_id', gameId)
  if (delError) throw new Error(delError.message)
  if (rows.length === 0) return
  const { error } = await supabase
    .from('lineups')
    .insert(rows.map((r) => ({ game_id: gameId, ...r })))
  if (error) throw new Error(error.message)
}
