import { CODE_MEANINGS, AT_BAT_CODES } from '@/lib/codes'

export interface PrintableCardRow {
  batting_order: number | null
  name: string
  starting_pos: string | null
}

const INNINGS = [1, 2, 3, 4, 5, 6, 7]
const MIN_ROWS = 13 // fill out to a full lineup so the blank card is reusable

// The handwritten scorecard taken to the field. Mirrors the team's original:
// a top block to track runs / outs / score by inning, the hitter × innings
// grid, and the code legend. Cells are blank to fill in by hand.
//
// Tuned to fit a single letter-portrait page: compact rows, small type, and a
// capped row count keep the whole sheet on one sheet of paper.
export function PrintableCard({
  opponent,
  date,
  rows,
}: {
  opponent: string | null
  date?: string | null
  rows: PrintableCardRow[]
}) {
  // Pad with blank rows so the printed card has room for write-ins / subs.
  const padded: PrintableCardRow[] = [...rows]
  let order = rows.length
  while (padded.length < MIN_ROWS) {
    order += 1
    padded.push({ batting_order: order, name: '', starting_pos: '' })
  }

  const prettyDate = date
    ? new Date(`${date}T00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="print-card text-field-ink">
      {/* Header */}
      <div className="mb-2 border-b-2 border-field-ink pb-1 text-center">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide">
          The Softball Team vs. {opponent || '__________'}
        </h1>
        {prettyDate && <p className="text-sm font-medium text-field-muted">{prettyDate}</p>}
      </div>

      {/* Runs / outs by inning — our line and the opponent's, each with outs */}
      <table className="mb-3 w-full table-fixed border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="w-28 border border-field-ink px-2 py-0.5 text-left" />
            {INNINGS.map((i) => (
              <th key={i} className="border border-field-ink px-1 py-0.5">
                {i}
              </th>
            ))}
            <th className="w-16 border border-field-ink px-1 py-0.5">FINAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-field-ink px-2 py-0.5 text-left font-semibold">The Softball Team</td>
            {INNINGS.map((i) => (
              <td key={i} className="h-7 border border-field-ink" />
            ))}
            <td className="border border-field-ink" />
          </tr>
          <tr>
            <td className="border border-field-ink px-2 py-0.5 text-left text-[11px] text-field-muted">Outs</td>
            {INNINGS.map((i) => (
              <td key={i} className="h-6 border border-field-ink" />
            ))}
            <td className="border border-field-ink" />
          </tr>
          <tr>
            <td className="border border-field-ink px-2 py-0.5 text-left font-semibold">
              {opponent || 'Opponent'}
            </td>
            {INNINGS.map((i) => (
              <td key={i} className="h-7 border border-field-ink" />
            ))}
            <td className="border border-field-ink" />
          </tr>
          <tr>
            <td className="border border-field-ink px-2 py-0.5 text-left text-[11px] text-field-muted">Outs</td>
            {INNINGS.map((i) => (
              <td key={i} className="h-6 border border-field-ink" />
            ))}
            <td className="border border-field-ink" />
          </tr>
        </tbody>
      </table>

      {/* Hitter × innings grid (cells left blank to score by hand) */}
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-field-ink px-2 py-0.5 text-left">Hitter</th>
            {INNINGS.map((i) => (
              <th key={i} className="w-[10%] border border-field-ink px-1 py-0.5 text-center">
                {i}
              </th>
            ))}
            <th className="w-20 border border-field-ink px-1 py-0.5 text-center">POS</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((r, idx) => (
            <tr key={idx}>
              <td className="h-8 border border-field-ink px-2 py-1 font-medium">{r.name}</td>
              {INNINGS.map((i) => (
                <td key={i} className="border border-field-ink px-1" />
              ))}
              <td className="border border-field-ink px-1 text-center">{r.starting_pos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Code legend so whoever scores knows the vocabulary */}
      <table className="mt-3 w-full border-collapse text-center text-[10px]">
        <thead>
          <tr>
            <th colSpan={AT_BAT_CODES.length} className="border border-field-ink py-0.5">
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
