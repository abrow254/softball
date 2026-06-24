import { getStandings, STANDINGS_SOURCE, STANDINGS_SOURCE_URL, type StandingsPool } from '@/lib/standings'

// Cache the scrape for an hour (matches the fetch revalidate in lib/standings).
export const revalidate = 3600

export const metadata = { title: 'Standings — The Softball Team' }

function PoolTable({ pool }: { pool: StandingsPool }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">{pool.name}</h2>
      <div className="relative">
      <div className="overflow-x-auto rounded-lg border border-field-line">
        <table className="tabular min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-field-cream/70 text-field-muted">
              <th className="px-2.5 py-2 text-right font-medium">#</th>
              <th className="sticky left-0 z-10 bg-field-cream/95 px-2.5 py-2 text-left font-medium">Team</th>
              <th className="px-2 py-2 text-right font-medium" title="Wins">W</th>
              <th className="px-2 py-2 text-right font-medium" title="Losses">L</th>
              <th className="px-2 py-2 text-right font-medium" title="Draws">D</th>
              <th className="px-2 py-2 text-right font-medium" title="Runs scored">RF</th>
              <th className="px-2 py-2 text-right font-medium" title="Runs allowed">RA</th>
              <th className="px-2 py-2 text-right font-medium" title="Run differential">Diff</th>
              <th className="px-2.5 py-2 text-right font-medium" title="Ranking points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {pool.rows.map((r) => (
              <tr
                key={`${pool.name}-${r.team}`}
                className={[
                  'border-t border-field-line',
                  r.isUs ? 'bg-field-gold/25 font-semibold' : 'even:bg-field-cream/30',
                ].join(' ')}
              >
                <td className="px-2.5 py-1.5 text-right text-field-muted">{r.rank ?? '—'}</td>
                <td
                  className={[
                    'sticky left-0 z-10 whitespace-nowrap px-2.5 py-1.5 text-left text-field-ink',
                    r.isUs ? 'bg-[#FFF6BF]' : 'bg-field-paper',
                  ].join(' ')}
                >
                  {r.team}
                  {r.isUs && <span className="ml-1.5 text-xs font-medium text-field-grass">You</span>}
                </td>
                <td className="px-2 py-1.5 text-right text-field-ink">{r.w}</td>
                <td className="px-2 py-1.5 text-right text-field-ink">{r.l}</td>
                <td className="px-2 py-1.5 text-right text-field-ink">{r.d}</td>
                <td className="px-2 py-1.5 text-right text-field-ink">{r.pf}</td>
                <td className="px-2 py-1.5 text-right text-field-ink">{r.pa}</td>
                <td
                  className={[
                    'px-2 py-1.5 text-right',
                    r.diff > 0 ? 'text-field-grass' : r.diff < 0 ? 'text-field-clay' : 'text-field-muted',
                  ].join(' ')}
                >
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                <td className="px-2.5 py-1.5 text-right font-medium text-field-ink">{r.rankPts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-field-paper to-transparent"
        aria-hidden
      />
      </div>
    </section>
  )
}

export default async function StandingsPage() {
  const standings = await getStandings()

  if (!standings) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Standings</h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          League standings are unavailable right now. Check them directly at{' '}
          <a href={STANDINGS_SOURCE_URL} target="_blank" rel="noreferrer" className="text-field-grass hover:underline">
            {STANDINGS_SOURCE}
          </a>
          .
        </p>
      </div>
    )
  }

  // Show our pool first; the rest follow in order.
  const pools = [...standings.pools].sort((a, b) => {
    if (a.name === standings.ourPool) return -1
    if (b.name === standings.ourPool) return 1
    return 0
  })

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Standings</h1>
        <p className="mt-1 text-sm text-field-muted">{standings.season}</p>
      </div>

      <div className="space-y-8">
        {pools.map((pool) => (
          <PoolTable key={pool.name} pool={pool} />
        ))}
      </div>

      <p className="text-xs text-field-muted">
        Standings pulled from{' '}
        <a href={STANDINGS_SOURCE_URL} target="_blank" rel="noreferrer" className="text-field-grass hover:underline">
          {STANDINGS_SOURCE}
        </a>
        , refreshed hourly. RF/RA are runs for/against; Pts are league ranking points.
      </p>
    </div>
  )
}
