import { createClient } from '@/lib/supabase/server'
import type { SeasonStatRow, CareerStatRow } from '@/lib/types'
import { computeWar, type RunEnv } from '@/lib/war'
import { getSeasonStats } from '@/lib/db/stats'
import { getCareerStats } from '@/lib/db/career'
import { recordForSeason, ALL_TIME } from '@/lib/seasonRecords'

// Batting WAR (bWAR) — offense-only WAR over the season_stats / career_stats
// views. See lib/war.ts for the metric; this module wires it to the data,
// resolving the run environment each scope is calibrated against.

// Run environment for a season: prefer live non-aggregate game rows, else the
// official records registry (older imported seasons have no per-game rows).
export async function getSeasonRunEnv(seasonId: string): Promise<RunEnv> {
  const supabase = createClient()
  const [gamesRes, seasonRes] = await Promise.all([
    supabase
      .from('games')
      .select('our_runs, opp_runs')
      .eq('season_id', seasonId)
      .eq('is_aggregate', false),
    supabase.from('seasons').select('year, term').eq('id', seasonId).maybeSingle(),
  ])
  if (gamesRes.error) throw new Error(gamesRes.error.message)
  if (seasonRes.error) throw new Error(seasonRes.error.message)

  const games = (gamesRes.data ?? []).filter((g) => g.our_runs != null && g.opp_runs != null)
  if (games.length > 0) {
    let rf = 0
    let ra = 0
    for (const g of games) {
      rf += Number(g.our_runs)
      ra += Number(g.opp_runs)
    }
    return { rsPerG: rf / games.length, raPerG: ra / games.length }
  }

  const s = seasonRes.data
  const reg = s ? recordForSeason(s.year as number, s.term as string) : undefined
  if (reg) return { rsPerG: reg.rsPerG, raPerG: reg.raPerG }
  return { rsPerG: ALL_TIME.rsPerG, raPerG: ALL_TIME.raPerG }
}

// season_stats rows augmented with bWAR (and rc/rar), for one season.
export async function getSeasonWar(seasonId: string): Promise<SeasonStatRow[]> {
  const [rows, env] = await Promise.all([getSeasonStats(seasonId), getSeasonRunEnv(seasonId)])
  const war = computeWar(rows, env)
  return rows.map((r) => ({ ...r, war: war.get(r.player_id)?.war }))
}

// career_stats rows augmented with bWAR, calibrated to the all-time run env.
export async function getCareerWar(): Promise<CareerStatRow[]> {
  const rows = await getCareerStats()
  const war = computeWar(rows, { rsPerG: ALL_TIME.rsPerG, raPerG: ALL_TIME.raPerG })
  return rows.map((r) => ({ ...r, war: war.get(r.player_id)?.war }))
}

// One player's bWAR per season (each computed against that season's own pool),
// for the profile's season-by-season column.
export async function getPlayerSeasonWar(playerId: string): Promise<Map<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('season_stats')
    .select('season_id')
    .eq('player_id', playerId)
  if (error) throw new Error(error.message)

  const seasonIds = [...new Set((data ?? []).map((r) => r.season_id as string))]
  const perSeason = await Promise.all(
    seasonIds.map(async (sid) => {
      const rows = await getSeasonWar(sid)
      const me = rows.find((r) => r.player_id === playerId)
      return [sid, me?.war ?? undefined] as const
    }),
  )
  const out = new Map<string, number>()
  for (const [sid, war] of perSeason) if (war != null) out.set(sid, war)
  return out
}
