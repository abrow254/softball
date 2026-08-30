import { createClient } from '@/lib/supabase/server'
import type { Season } from '@/lib/types'

export async function listSeasons(): Promise<Season[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false })
    .order('term', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('seasons').select('*').eq('is_current', true).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export async function getSeason(id: string): Promise<Season | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

// Set which season is "current" (the live one). Clears the flag on every season,
// then sets it on `seasonId`; pass null to leave no current season (i.e. mark
// the season just ended as complete). Admin-gated at the action; RLS is the
// backstop. Two writes, not a transaction — the clear always runs first so the
// flag is never on two seasons at once.
export async function setCurrentSeason(seasonId: string | null): Promise<void> {
  const supabase = createClient()
  const { error: clearErr } = await supabase
    .from('seasons')
    .update({ is_current: false })
    .eq('is_current', true)
  if (clearErr) throw new Error(clearErr.message)
  if (seasonId) {
    const { error } = await supabase.from('seasons').update({ is_current: true }).eq('id', seasonId)
    if (error) throw new Error(error.message)
  }
}
