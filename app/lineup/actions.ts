'use server'

import { getCurrentUser } from '@/lib/auth'
import { replaceLineup } from '@/lib/db'

export async function saveLineupAction(
  gameId: string,
  rows: Array<{ player_id: string; batting_order: number | null; starting_pos: string | null }>,
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  await replaceLineup(gameId, rows)
}
