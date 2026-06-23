import { getCareerStats } from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { CAREER_COLS } from '@/lib/statColumns'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'All-Time Stats — The Softball Team' }

export default async function AllTimePage() {
  const rows = await getCareerStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">All-time stats</h1>
        <p className="mt-1 text-sm text-field-muted">
          Career totals across every season. Tap a name for a player&rsquo;s full history.
        </p>
      </div>

      <StatTable
        rows={rows}
        cols={CAREER_COLS}
        defaultSortKey="ops"
        split
        linkBase="/players"
        highlightLeaders
        rateMinAb={15}
        emptyMessage="No stats recorded yet."
      />

      <p className="text-xs text-field-muted">
        Tap a column header to sort. <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the
        all-time leader in a category (rate stats require 15+ AB). House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
