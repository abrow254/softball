import { createClient } from '@/lib/supabase/server'
import type { Game } from '@/lib/types'

export async function listGames(seasonId: string): Promise<Game[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .order('game_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('games').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export interface GameInput {
  id?: string
  season_id: string
  game_date: string | null
  opponent: string | null
  our_runs: number | null
  opp_runs: number | null
}

// Insert or update a game and return the row.
export async function upsertGame(input: GameInput): Promise<Game> {
  const supabase = createClient()
  if (input.id) {
    const { data, error } = await supabase
      .from('games')
      .update({
        season_id: input.season_id,
        game_date: input.game_date,
        opponent: input.opponent,
        our_runs: input.our_runs,
        opp_runs: input.opp_runs,
      })
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .from('games')
    .insert({
      season_id: input.season_id,
      game_date: input.game_date,
      opponent: input.opponent,
      our_runs: input.our_runs,
      opp_runs: input.opp_runs,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}
