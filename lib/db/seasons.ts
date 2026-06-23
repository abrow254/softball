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
