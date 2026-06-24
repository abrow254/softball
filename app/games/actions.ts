'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { commitGame, createPlayer, getGame } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { playedThisGame, type SaveGameInput } from '@/lib/entry'
import type { Player } from '@/lib/types'

// Writes a full game: game row + lineup (all rows) + per-player stats (rows
// that aren't sitting) + optional at-bat detail. Admin-gated; RLS is the
// backstop at the database.
export async function saveGame(input: SaveGameInput): Promise<{ gameId: string }> {
  await requireAdmin()

  const lineup = input.rows.map((r) => ({
    player_id: r.player_id,
    batting_order: r.batting_order,
    starting_pos: r.starting_pos || null,
  }))

  const stats = input.rows
    .filter(playedThisGame)
    .map((r) => ({ player_id: r.player_id, ...r.stats }))

  const result = await commitGame({
    game: input.game,
    lineup,
    stats,
    atBats: input.atBats,
  })

  revalidatePath('/stats')
  revalidatePath('/games')
  revalidatePath(`/games/${result.gameId}`)
  revalidatePath(`/games/${result.gameId}/edit`)
  revalidatePath(`/games/${result.gameId}/card`)
  revalidatePath('/leaderboards')
  revalidatePath('/awards')
  return result
}

export async function createPlayerAction(input: { name: string; is_regular: boolean }): Promise<Player> {
  await requireAdmin()
  const player = await createPlayer(input)
  revalidatePath('/games')
  return player
}

export async function deleteGameAction(gameId: string): Promise<void> {
  await requireAdmin()
  const game = await getGame(gameId)
  if (!game) return
  const supabase = createClient()
  // ON DELETE CASCADE clears lineups, game_player_stats, and at_bats.
  const { error } = await supabase.from('games').delete().eq('id', gameId)
  if (error) throw new Error(error.message)
  revalidatePath('/stats')
  revalidatePath('/games')
}
