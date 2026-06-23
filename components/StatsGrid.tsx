'use client'

import type { SeasonStatRow } from '@/lib/types'
import { StatTable } from '@/components/StatTable'
import { SEASON_COLS } from '@/lib/statColumns'

// Season stats grid: Regulars/Ringers split, sortable, names link to careers.
export function StatsGrid({ rows }: { rows: SeasonStatRow[] }) {
  return (
    <StatTable
      rows={rows}
      cols={SEASON_COLS}
      defaultSortKey="ops"
      split
      linkBase="/players"
      highlightLeaders
      rateMinAb={10}
      emptyMessage="No games recorded for this season yet."
    />
  )
}
