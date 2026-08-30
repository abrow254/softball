'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { setCurrentSeason } from '@/lib/db'

// Set the current (live) season, or pass null to mark the current season
// complete (no live season until the next one starts).
export async function setCurrentSeasonAction(seasonId: string | null): Promise<void> {
  await requireAdmin()
  await setCurrentSeason(seasonId)
  revalidatePath('/admin/seasons')
  revalidatePath('/stats')
  revalidatePath('/')
  revalidatePath('/lineup')
}
