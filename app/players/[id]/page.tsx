import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlayerCareer } from '@/lib/db'
import { StatTable } from '@/components/StatTable'
import { PLAYER_SEASON_COLS } from '@/lib/statColumns'
import { fmt3, fmtPct } from '@/lib/formulas'
import type { CareerStatRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Tile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center" title={title}>
      <div className="tabular text-xl font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

function tiles(c: CareerStatRow) {
  return [
    { label: 'AVG', value: fmt3(c.avg), title: 'hits / ab' },
    { label: 'OPS', value: fmt3(c.ops), title: 'House rule: AVG + SLG' },
    { label: 'SLG', value: fmt3(c.slg), title: 'tb / ab' },
    { label: 'OBP', value: fmt3(c.obp), title: 'House rule: (hits + fc) / ab' },
    { label: 'Hits', value: String(c.hits) },
    { label: 'HR', value: String(c.hr) },
    { label: 'TB', value: String(c.tb), title: 'Total bases' },
    { label: 'XBH%', value: fmtPct(c.xbh_pct), title: '(2B + 3B + HR) / hits' },
  ]
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { career } = await getPlayerCareer(params.id)
  return { title: career ? `${career.name} — Career` : 'Player' }
}

export default async function PlayerCareerPage({ params }: { params: { id: string } }) {
  const { career, seasons } = await getPlayerCareer(params.id)
  if (!career) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/players" className="text-sm text-field-grass hover:underline">
          ← All-time stats
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-field-ink">{career.name}</h1>
          <span className="rounded-full bg-field-grass/10 px-2 py-0.5 text-xs font-medium text-field-grass">
            {career.is_regular ? 'Regular' : 'Ringer'}
          </span>
          <span className="text-sm text-field-muted">
            {career.seasons_played} {career.seasons_played === 1 ? 'season' : 'seasons'} · {career.ab} career AB
          </span>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">Career</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {tiles(career).map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Season by season</h2>
        <StatTable
          rows={seasons}
          cols={PLAYER_SEASON_COLS}
          defaultSortKey="year"
          defaultDir="asc"
          rowKey={(r) => r.season_id}
          emptyMessage="No seasons recorded."
        />
      </section>

      <p className="text-xs text-field-muted">
        House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
