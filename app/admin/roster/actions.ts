'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createPlayer, updatePlayer, setSeasonRosterMember } from '@/lib/db'
import type { Gender, Player } from '@/lib/types'

export async function setSeasonRosterAction(
  seasonId: string,
  playerId: string,
  onRoster: boolean,
): Promise<void> {
  await requireAdmin()
  await setSeasonRosterMember(seasonId, playerId, onRoster)
  revalidatePath('/admin/roster')
  revalidatePath('/lineup')
}

export async function updatePlayerAction(
  id: string,
  patch: {
    name?: string
    is_regular?: boolean
    active?: boolean
    gender?: Gender | null
    positions?: string[]
  },
): Promise<Player> {
  await requireAdmin()
  const player = await updatePlayer(id, patch)
  revalidatePath('/admin/roster')
  revalidatePath('/stats')
  revalidatePath('/lineup')
  return player
}

export async function createPlayerAction(input: {
  name: string
  is_regular?: boolean
  active?: boolean
  gender?: Gender | null
  positions?: string[]
}): Promise<Player> {
  await requireAdmin()
  const player = await createPlayer(input)
  revalidatePath('/admin/roster')
  return player
}
