import type { SeasonStatRow } from '@/lib/types'

// "Qualified" = ab >= max(10, 0.5 × season max AB). Scales with season length so
// early-season boards don't crown 2-AB players. Shared by awards and records.
export function qualifiedThreshold(rows: SeasonStatRow[]): number {
  const maxAb = Math.max(...rows.map((r) => r.ab), 0)
  return Math.max(10, Math.floor(0.5 * maxAb))
}

export function qualifiedRows(rows: SeasonStatRow[]): SeasonStatRow[] {
  const min = qualifiedThreshold(rows)
  return rows.filter((r) => r.ab >= min)
}
