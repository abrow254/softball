import { CODE_MEANINGS, AT_BAT_CODES } from '@/lib/codes'

export interface PrintableCardRow {
  batting_order: number | null
  name: string
  starting_pos: string | null
}

const INNINGS = [1, 2, 3, 4, 5, 6, 7]
const MIN_ROWS = 14 // fill out to a full lineup so the blank card is reusable

export function PrintableCard({
  opponent,
  gameDate,
  rows,
}: {
  opponent: string | null
  gameDate: string | null
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
      <div className="mb-3 flex items-end justify-between border-b-2 border-field-ink pb-2">
        <div>
          <h1 className="text-xl font-bold">The Softball Team — Score Sheet</h1>
          <p className="text-sm text-field-muted">Forest City SSC · Thursday league</p>
        </div>
        <div className="text-right text-sm">
          <div>
            <span className="text-field-muted">vs </span>
            <span className="font-semibold">{opponent || '________________'}</span>
          </div>
          <div>
            <span className="text-field-muted">Date </span>
            <span className="font-semibold">{gameDate || '____________'}</span>
          </div>
          <div className="mt-1">
            <span className="text-field-muted">Final </span>
            <span className="font-semibold">Us ____ &nbsp; Them ____</span>
          </div>
        </div>
      </div>

      {/* Lineup × innings grid (cells left blank to score by hand) */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-8 border border-field-ink px-1 py-1 text-center">#</th>
            <th className="border border-field-ink px-2 py-1 text-left">Player</th>
            <th className="w-12 border border-field-ink px-1 py-1 text-center">Pos</th>
            {INNINGS.map((i) => (
              <th key={i} className="w-[10%] border border-field-ink px-1 py-1 text-center">
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {padded.map((r, idx) => (
            <tr key={idx}>
              <td className="border border-field-ink px-1 py-2 text-center">{r.batting_order ?? idx + 1}</td>
              <td className="border border-field-ink px-2 py-2 font-medium">{r.name}</td>
              <td className="border border-field-ink px-1 py-2 text-center">{r.starting_pos}</td>
              {INNINGS.map((i) => (
                <td key={i} className="h-9 border border-field-ink px-1 py-2" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Code legend so whoever scores knows the vocabulary */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-field-muted">
        {AT_BAT_CODES.map((code) => (
          <span key={code}>
            <span className="font-semibold text-field-ink">{code}</span> {CODE_MEANINGS[code]}
          </span>
        ))}
      </div>
    </div>
  )
}
