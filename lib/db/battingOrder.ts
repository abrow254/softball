import { createClient } from '@/lib/supabase/server'
import type { BattingOrderRow } from '@/lib/types'

// One player's stats split by batting-order spot (all seasons, or one season).
export async function getBattingOrderStats(
  playerId: string,
  seasonId?: string,
): Promise<BattingOrderRow[]> {
  const supabase = createClient()
  let query = supabase
    .from('batting_order_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('batting_order', { ascending: true })
  if (seasonId) query = query.eq('season_id', seasonId)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  // A player may have batted in the same spot across multiple seasons; when no
  // season is scoped, collapse to one row per spot.
  if (seasonId) return (data ?? []) as BattingOrderRow[]
  return collapseBySpot((data ?? []) as BattingOrderRow[])
}

// Every player × spot for one season (lineup analytics matrix).
export async function getLineupSpotMatrix(seasonId: string): Promise<BattingOrderRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('batting_order_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('batting_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as BattingOrderRow[]
}

function collapseBySpot(rows: BattingOrderRow[]): BattingOrderRow[] {
  const bySpot = new Map<number, BattingOrderRow>()
  for (const r of rows) {
    const cur = bySpot.get(r.batting_order)
    if (!cur) {
      bySpot.set(r.batting_order, { ...r })
      continue
    }
    // Sum counting fields, then recompute rates.
    const sumKeys: (keyof BattingOrderRow)[] = [
      'gp_count', 'singles', 'doubles', 'triples', 'hr', 'ab', 'fc', 'bb', 'hbp', 'roe', 'rbi', 'runs', 'k',
    ]
    for (const k of sumKeys) (cur[k] as number) += r[k] as number
  }
  for (const r of bySpot.values()) {
    r.hits = r.singles + r.doubles + r.triples + r.hr
    r.tb = r.singles + 2 * r.doubles + 3 * r.triples + 4 * r.hr
    r.avg = r.ab > 0 ? r.hits / r.ab : 0
    r.obp = r.ab > 0 ? (r.hits + r.fc) / r.ab : 0
    r.slg = r.ab > 0 ? r.tb / r.ab : 0
    r.ops = r.avg + r.slg
  }
  return [...bySpot.values()].sort((a, b) => a.batting_order - b.batting_order)
}
