export interface LineupCardRow {
  batting_order: number
  name: string
  starting_pos: string
}

// The dugout batting card: big, centered, dead-simple so it reads from across
// the dugout. Name centered on the page; starting position hangs at the right
// margin under a "Starting POS" label. No batting-order numbers — the stacking
// order IS the order. Mirrors the team's original sheet.
export function BattingLineupCard({
  title,
  rows,
}: {
  title: string
  rows: LineupCardRow[]
}) {
  return (
    <div className="print-card text-field-ink">
      <div className="relative mb-6 border-b-2 border-field-ink pb-2">
        <h1 className="text-center font-display text-2xl font-bold uppercase tracking-wide">{title}</h1>
        <span className="absolute bottom-2 right-0 text-xs font-semibold uppercase tracking-wide text-field-muted">
          Starting POS
        </span>
      </div>

      <ol className="space-y-3">
        {rows.map((r) => (
          <li key={r.batting_order} className="relative text-center">
            <span className="text-4xl font-bold">{r.name}</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-semibold text-field-muted">
              {r.starting_pos || '—'}
            </span>
          </li>
        ))}
      </ol>

      {rows.length === 0 && (
        <p className="py-8 text-center text-field-muted">Add players to build the lineup.</p>
      )}
    </div>
  )
}
