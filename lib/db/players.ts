import { createClient } from '@/lib/supabase/server'
import type { Player } from '@/lib/types'

export async function listPlayers(opts?: { activeOnly?: boolean }): Promise<Player[]> {
  const supabase = createClient()
  let query = supabase.from('players').select('*').order('name', { ascending: true })
  if (opts?.activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createPlayer(input: { name: string; is_regular?: boolean }): Promise<Player> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .insert({ name: input.name, is_regular: input.is_regular ?? true })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}
