'use server'

import { requireAdmin } from '@/lib/auth'
import { replaceLineup, setAvailability } from '@/lib/db'
import type { AvailabilityStatus } from '@/lib/types'

export async function saveLineupAction(
  gameId: string,
  rows: Array<{ player_id: string; batting_order: number | null; starting_pos: string | null }>,
) {
  await requireAdmin()
  await replaceLineup(gameId, rows)
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
