import { createClient } from '@/lib/supabase/server'
import type { Player, Gender } from '@/lib/types'

export async function listPlayers(opts?: { activeOnly?: boolean }): Promise<Player[]> {
  const supabase = createClient()
  let query = supabase.from('players').select('*').order('name', { ascending: true })
  if (opts?.activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createPlayer(input: {
  name: string
  is_regular?: boolean
  active?: boolean
  gender?: Gender | null
  positions?: string[]
}): Promise<Player> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .insert({
      name: input.name,
      is_regular: input.is_regular ?? true,
      active: input.active ?? true,
      gender: input.gender ?? null,
      positions: input.positions ?? [],
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updatePlayer(
  id: string,
  patch: {
    name?: string
    is_regular?: boolean
    active?: boolean
    gender?: Gender | null
    positions?: string[]
  },
): Promise<Player> {
  const supabase = createClient()
  const { data, error } = await supabase.from('players').update(patch).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

// How often a player has appeared at each fielding position, from saved lineups
// (real games only). Used for position history on the profile + alignment hints.
export async function getPositionHistory(playerId: string): Promise<{ pos: string; count: number }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lineups')
    .select('starting_pos')
    .eq('player_id', playerId)
    .not('starting_pos', 'is', null)
  if (error) throw new Error(error.message)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const pos = (row.starting_pos as string | null)?.trim()
    if (!pos || pos === 'BE' || pos === 'Sit') continue
    counts.set(pos, (counts.get(pos) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([pos, count]) => ({ pos, count }))
    .sort((a, b) => b.count - a.count)
}

// Position history for every player at once (real games only), keyed by player_id
// and frequency-sorted. Powers "Fill from history" on the Roster page — one query
// instead of one per player.
export async function getAllPositionHistory(): Promise<Record<string, { pos: string; count: number }[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lineups')
    .select('player_id, starting_pos')
    .not('starting_pos', 'is', null)
  if (error) throw new Error(error.message)

  const byPlayer = new Map<string, Map<string, number>>()
  for (const row of data ?? []) {
    const pos = (row.starting_pos as string | null)?.trim()
    if (!pos || pos === 'BE' || pos === 'Sit') continue
    const pid = row.player_id as string
    if (!byPlayer.has(pid)) byPlayer.set(pid, new Map())
    const counts = byPlayer.get(pid)!
    counts.set(pos, (counts.get(pos) ?? 0) + 1)
  }

  const out: Record<string, { pos: string; count: number }[]> = {}
  for (const [pid, counts] of byPlayer) {
    out[pid] = [...counts.entries()]
      .map(([pos, count]) => ({ pos, count }))
      .sort((a, b) => b.count - a.count)
  }
  return out
}
