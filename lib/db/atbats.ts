import { createClient } from '@/lib/supabase/server'
import type { AtBat, AtBatCode } from '@/lib/types'

export async function getAtBats(gameId: string): Promise<AtBat[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('at_bats')
    .select('*')
    .eq('game_id', gameId)
    .order('inning', { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface AtBatRow {
  player_id: string
  inning: number | null
  code: AtBatCode
}

// Replace the at-bat detail for a game (delete + insert). Optional — only the
// photo-intake path writes here.
export async function replaceAtBats(gameId: string, rows: AtBatRow[]): Promise<void> {
  const supabase = createClient()
  const { error: delError } = await supabase.from('at_bats').delete().eq('game_id', gameId)
  if (delError) throw new Error(delError.message)
  if (rows.length === 0) return
  const { error } = await supabase
    .from('at_bats')
    .insert(rows.map((r) => ({ game_id: gameId, ...r })))
  if (error) throw new Error(error.message)
}
