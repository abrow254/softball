'use server'

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { inferGenderBatch } from '@/lib/genderInference'

export async function backfillGenders(method: 'heuristic' | 'claude' = 'heuristic') {
  await requireAdmin()

  const supabase = createClient()

  // Fetch all players without gender set.
  const { data: players, error: fetchErr } = await supabase
    .from('players')
    .select('id, name')
    .is('gender', null)

  if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`)
  if (!players || players.length === 0) return { updated: 0, skipped: 0, results: [] }

  // Infer genders.
  const guesses = await inferGenderBatch(
    players as Array<{ id: string; name: string }>,
    method,
  )

  // Separate confident vs uncertain.
  const confident = guesses.filter((g) => g.confident && g.inferred)
  const uncertain = guesses.filter((g) => !g.confident || !g.inferred)

  // Apply confident guesses only.
  for (const guess of confident) {
    const { error: updateErr } = await supabase
      .from('players')
      .update({ gender: guess.inferred })
      .eq('id', guess.player_id)

    if (updateErr) {
      console.error(`Update failed for ${guess.name}:`, updateErr)
    }
  }

  return {
    updated: confident.length,
    skipped: uncertain.length,
    results: guesses,
  }
}
