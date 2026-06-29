import { createClient } from '@/lib/supabase/server'

// Player IDs on a season's roster.
export async function getSeasonRoster(seasonId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('season_roster')
    .select('player_id')
    .eq('season_id', seasonId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.player_id as string)
}

// Add or remove a player from a season's roster.
export async function setSeasonRosterMember(
  seasonId: string,
  playerId: string,
  onRoster: boolean,
): Promise<void> {
  const supabase = createClient()
  if (onRoster) {
    const { error } = await supabase
      .from('season_roster')
      .upsert({ season_id: seasonId, player_id: playerId }, { onConflict: 'season_id,player_id' })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('season_roster')
      .delete()
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
    if (error) throw new Error(error.message)
  }
}
