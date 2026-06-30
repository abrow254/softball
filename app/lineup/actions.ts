'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { replaceLineup, setAvailability, getOrCreateGame } from '@/lib/db'
import type { AvailabilityStatus } from '@/lib/types'

export async function saveLineupAction(
  gameId: string,
  rows: Array<{ player_id: string; batting_order: number | null; starting_pos: string | null }>,
) {
  await requireAdmin()
  await replaceLineup(gameId, rows)
}

// Save a lineup for an upcoming scheduled game. The game has no DB row yet, so
// find-or-create it by season + date, then persist the batting order + positions.
// Returns the game id so the UI can deep-link to it.
export async function saveLineupForMatchAction(
  seasonId: string,
  gameDate: string,
  opponent: string | null,
  rows: Array<{ player_id: string; batting_order: number | null; starting_pos: string | null }>,
): Promise<{ gameId: string }> {
  await requireAdmin()
  const game = await getOrCreateGame(seasonId, gameDate, opponent)
  await replaceLineup(game.id, rows)
  revalidatePath('/games')
  revalidatePath(`/games/${game.id}/card`)
  revalidatePath('/lineup')
  return { gameId: game.id }
}

export async function setAvailabilityAction(
  seasonId: string,
  gameDate: string,
  playerId: string,
  status: AvailabilityStatus,
) {
  await requireAdmin()
  await setAvailability(seasonId, gameDate, playerId, status)
}
