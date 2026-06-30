import { getCareerStats, getRecords } from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { RecordsPanel } from '@/components/RecordsPanel'
import { CAREER_COLS } from '@/lib/statColumns'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'All-Time Stats — The Softball Team' }

export default async function AllTimePage() {
  const [rows, records] = await Promise.all([getCareerStats(), getRecords()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">All-time stats</h1>
        <p className="mt-1 text-sm text-field-muted">
          Career totals across every season. Players are grouped by tenure (career AB vs. the all-time leader):
          Core, Regulars, then Ringers. Tap a name for a player&rsquo;s full history.
        </p>
      </div>

      <StatTable
        rows={rows}
        cols={CAREER_COLS}
        defaultSortKey="avg"
        sections={[
          { label: 'Core', field: 'tier', equals: 'core' },
          { label: 'Regulars', field: 'tier', equals: 'regular' },
          { label: 'Ringers', field: 'tier', equals: 'ringer' },
        ]}
        linkBase="/players"
        highlightLeaders
        qualifyMinAb={30}
        emptyMessage="No stats recorded yet."
      />

      <p className="text-xs text-field-muted">
        Tap a column header to sort. <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the
        all-time leader. For rate stats (AVG, OBP, SLG, OPS, ISO, XBH%), players under 30 career AB are dimmed and sorted
        to the bottom so small samples don&rsquo;t top the board. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>

      <section className="space-y-4 border-t border-field-line pt-6">
        <h2 className="text-xl font-semibold tracking-tight text-field-ink">Records</h2>
        <RecordsPanel records={records} />
      </section>
    </div>
  )
}
