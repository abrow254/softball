import { listPlayers, getPlayerCareer } from '@/lib/db'
import { ComparePickers } from '@/components/ComparePickers'
import { OpsChart, type OpsSeries } from '@/components/OpsChart'
import { fmt3, fmtPct } from '@/lib/formulas'
import type { CareerStatRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Compare — The Softball Team' }

const COLOR_A = '#2F6B4A' // grass
const COLOR_B = '#C2410C' // clay

// Rows for the career comparison table: label, accessor, formatter, higher-is-better.
const ROWS: { label: string; get: (c: CareerStatRow) => number; fmt: (n: number) => string }[] = [
  { label: 'Games', get: (c) => c.gp, fmt: String },
  { label: 'AB', get: (c) => c.ab, fmt: String },
  { label: 'AVG', get: (c) => c.avg, fmt: fmt3 },
  { label: 'OBP', get: (c) => c.obp, fmt: fmt3 },
  { label: 'SLG', get: (c) => c.slg, fmt: fmt3 },
  { label: 'OPS', get: (c) => c.ops, fmt: fmt3 },
  { label: 'Hits', get: (c) => c.hits, fmt: String },
  { label: 'HR', get: (c) => c.hr, fmt: String },
  { label: 'TB', get: (c) => c.tb, fmt: String },
  { label: 'RBI', get: (c) => c.rbi, fmt: String },
  { label: 'Runs', get: (c) => c.runs, fmt: String },
  { label: 'XBH%', get: (c) => c.xbh_pct, fmt: fmtPct },
]

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string }
}) {
  const a = searchParams.a ?? ''
  const b = searchParams.b ?? ''

  const [players, ca, cb] = await Promise.all([
    listPlayers(),
    a ? getPlayerCareer(a) : Promise.resolve(null),
    b ? getPlayerCareer(b) : Promise.resolve(null),
  ])

  const careerA = ca?.career ?? null
  const careerB = cb?.career ?? null
  const bothReady = careerA && careerB

  const series: OpsSeries[] = []
  if (careerA && ca) series.push({ label: careerA.name, color: COLOR_A, seasons: ca.seasons })
  if (careerB && cb) series.push({ label: careerB.name, color: COLOR_B, seasons: cb.seasons })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Compare players</h1>
        <p className="mt-1 text-sm text-field-muted">Pick two players to put their careers side by side.</p>
      </div>

      <ComparePickers players={players} a={a} b={b} />

      {!bothReady ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          Choose two players above to compare.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-field-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-field-line bg-field-cream/50">
                  <th className="px-3 py-2 text-left font-semibold text-field-muted" />
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: COLOR_A }}>
                    {careerA.name}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: COLOR_B }}>
                    {careerB.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const va = row.get(careerA)
                  const vb = row.get(careerB)
                  const aWins = va > vb
                  const bWins = vb > va
                  return (
                    <tr key={row.label} className="border-b border-field-line">
                      <td className="px-3 py-1.5 text-field-muted">{row.label}</td>
                      <td
                        className={`px-3 py-1.5 text-right tabular ${aWins ? 'font-bold text-field-ink' : 'text-field-muted'}`}
                      >
                        {row.fmt(va)}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular ${bWins ? 'font-bold text-field-ink' : 'text-field-muted'}`}
                      >
                        {row.fmt(vb)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {series.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">OPS by season</h2>
              <OpsChart series={series} />
            </section>
          )}

          <p className="text-xs text-field-muted">
            Bold marks the higher value. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
          </p>
        </>
      )}
    </div>
  )
}
