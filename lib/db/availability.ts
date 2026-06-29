import { createClient } from '@/lib/supabase/server'
import type { Availability, AvailabilityStatus } from '@/lib/types'

// Availability rows for one game date.
export async function getAvailability(seasonId: string, gameDate: string): Promise<Availability[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('season_id', seasonId)
    .eq('game_date', gameDate)
  if (error) throw new Error(error.message)
  return (data ?? []) as Availability[]
}

// Upsert one player's status for a game date.
export async function setAvailability(
  seasonId: string,
  gameDate: string,
  playerId: string,
  status: AvailabilityStatus,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('availability')
    .upsert(
      { season_id: seasonId, game_date: gameDate, player_id: playerId, status, updated_at: new Date().toISOString() },
      { onConflict: 'season_id,game_date,player_id' },
    )
  if (error) throw new Error(error.message)
}
