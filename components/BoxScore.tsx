import type { BoxScoreRow } from '@/lib/types'

export function BoxScore({ rows, opponent }: { rows: BoxScoreRow[]; opponent: string | null }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line bg-field-paper px-4 py-8 text-center text-sm text-field-muted">
        No stats recorded yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-field-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-field-line bg-field-cream/50">
            <th className="px-3 py-2 text-left font-semibold text-field-ink">Order</th>
            <th className="px-3 py-2 text-left font-semibold text-field-ink">Player</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">AB</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">H</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">1B</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">2B</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">3B</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">HR</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">TB</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">BB</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">FC</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">K</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">RBI</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">R</th>
            <th className="px-3 py-2 text-center font-semibold text-field-muted">AVG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.player_id}
              className={`border-b border-field-line ${
                row.is_potg ? 'bg-field-grass/10' : idx % 2 === 0 ? 'bg-field-paper' : 'bg-field-cream/30'
              }`}
            >
              <td className="px-3 py-2 text-center font-semibold text-field-grass">
                {row.batting_order ?? '—'}
              </td>
              <td className="px-3 py-2 font-medium text-field-ink">
                <div className="flex items-center gap-1">
                  {row.name}
                  {row.is_potg && <span className="text-base">⭐</span>}
                </div>
              </td>
              <td className="px-3 py-2 text-center tabular text-field-ink">{row.ab}</td>
              <td className="px-3 py-2 text-center tabular font-semibold text-field-grass">{row.hits}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.singles}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.doubles}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.triples}</td>
              <td className="px-3 py-2 text-center tabular font-semibold text-field-clay">{row.hr}</td>
              <td className="px-3 py-2 text-center tabular font-medium text-field-ink">{row.tb}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.bb}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.fc}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.k}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.rbi}</td>
              <td className="px-3 py-2 text-center tabular text-field-muted">{row.runs}</td>
              <td className="px-3 py-2 text-center tabular font-medium text-field-ink">
                {row.avg.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
