import { createClient } from '@/lib/supabase/server'
import type { SeasonStatRow } from '@/lib/types'

// Reads the season_stats view (house formulas applied in SQL).
export async function getSeasonStats(seasonId: string): Promise<SeasonStatRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('season_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SeasonStatRow[]
}
