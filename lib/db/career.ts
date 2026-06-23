import { createClient } from '@/lib/supabase/server'
import type { CareerStatRow, PlayerSeasonRow, Season } from '@/lib/types'

const TERM_ORDER: Record<string, number> = { Summer: 0, Fall: 1 }

// All-time leaderboard: one row per player, totals across every season.
export async function getCareerStats(): Promise<CareerStatRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('career_stats')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CareerStatRow[]
}

// One player's career line + their season-by-season breakdown (chronological).
export async function getPlayerCareer(playerId: string): Promise<{
  career: CareerStatRow | null
  seasons: PlayerSeasonRow[]
}> {
  const supabase = createClient()

  const [careerRes, seasonRes, seasonsRes] = await Promise.all([
    supabase.from('career_stats').select('*').eq('player_id', playerId).maybeSingle(),
    supabase.from('season_stats').select('*').eq('player_id', playerId),
    supabase.from('seasons').select('*'),
  ])

  if (careerRes.error) throw new Error(careerRes.error.message)
  if (seasonRes.error) throw new Error(seasonRes.error.message)
  if (seasonsRes.error) throw new Error(seasonsRes.error.message)

  const seasonsById = new Map<string, Season>(
    (seasonsRes.data ?? []).map((s) => [s.id, s as Season]),
  )

  const seasons: PlayerSeasonRow[] = (seasonRes.data ?? [])
    .map((row) => {
      const s = seasonsById.get(row.season_id)
      return {
        ...row,
        season_label: s?.label ?? '—',
        year: s?.year ?? 0,
        term: s?.term ?? 'Summer',
      } as PlayerSeasonRow
    })
    .sort((a, b) => a.year - b.year || (TERM_ORDER[a.term] - TERM_ORDER[b.term]))

  return { career: (careerRes.data as CareerStatRow) ?? null, seasons }
}
