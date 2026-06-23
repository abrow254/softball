import { CODE_MEANINGS, AT_BAT_CODES } from '@/lib/codes'

export interface PrintableCardRow {
  batting_order: number | null
  name: string
  starting_pos: string | null
}

const INNINGS = [1, 2, 3, 4, 5, 6, 7]
const MIN_ROWS = 14 // fill out to a full lineup so the blank card is reusable

// The handwritten scorecard taken to the field. Mirrors the team's original:
// a top block to track runs / outs / score by inning, the hitter × innings
// grid, and the code legend. Cells are blank to fill in by hand.
export function PrintableCard({
  title,
  opponent,
  rows,
}: {
  title: string
  opponent: string | null
  rows: PrintableCardRow[]
}) {
  // Pad with blank rows so the printed card has room for write-ins / subs.
  const padded: PrintableCardRow[] = [...rows]
  let order = rows.length
  while (padded.length < MIN_ROWS) {
    order += 1
    padded.push({ batting_order: order, name: '', starting_pos: '' })
  }

  return (
    <div className="print-card text-field-ink">
      {/* Header */}
      <h1 className="mb-3 border-b-2 border-field-ink pb-2 text-center font-display text-2xl font-bold uppercase tracking-wide">
        {title}
      </h1>

      {/* Runs / outs / score by inning */}
      <table className="mb-4 w-full border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="w-40 border border-field-ink px-2 py-1 text-left" />
            {INNINGS.map((i) => (
              <th key={i} className="border border-field-ink px-1 py-1">
                {i}
              </th>
            ))}
            <th className="w-20 border border-field-ink px-1 py-1">FINAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-field-ink px-2 py-1 text-left font-semibold">The Softball Team</td>
            {INNINGS.map((i) => (
              <td key={i} className="h-8 border border-field-ink" />
            ))}
            <td rowSpan={3} className="border border-field-ink" />
          </tr>
          <tr>
            <td className="border border-field-ink px-2 py-1 text-left font-semibold">OUTS</td>
            {INNINGS.map((i) => (
              <td key={i} className="h-8 border border-field-ink" />
            ))}
          </tr>
          <tr>
            <td className="border border-field-ink px-2 py-1 text-left font-semibold">
              {opponent || 'Opponent'}
            </td>
            {INNINGS.map((i) => (
              <td key={i} className="h-8 border border-field-ink" />
            ))}
          </tr>
        </tbody>
      </table>

      {/* Hitter × innings grid (cells left blank to score by hand) */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-field-ink px-2 py-1 text-left">Hitter</th>
            {INNINGS.map((i) => (
              <th key={i} className="w-[10%] border border-field-ink px-1 py-1 text-center">
                {i}
              </th>
            ))}
            <th className="w-24 border border-field-ink px-1 py-1 text-center">Starting POS</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((r, idx) => (
            <tr key={idx}>
              <td className="border border-field-ink px-2 py-2 font-medium">{r.name}</td>
              {INNINGS.map((i) => (
                <td key={i} className="h-9 border border-field-ink px-1 py-2" />
              ))}
              <td className="border border-field-ink px-1 py-2 text-center">{r.starting_pos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Code legend so whoever scores knows the vocabulary */}
      <table className="mt-4 w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th colSpan={AT_BAT_CODES.length} className="border border-field-ink py-1">
              Legend
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {AT_BAT_CODES.map((code) => (
              <td key={code} className="border border-field-ink px-1 py-0.5 font-semibold">
                {code}
              </td>
            ))}
          </tr>
          <tr>
            {AT_BAT_CODES.map((code) => (
              <td key={code} className="border border-field-ink px-1 py-0.5 text-field-muted">
                {CODE_MEANINGS[code]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
