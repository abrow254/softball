export interface LineupCardRow {
  batting_order: number
  name: string
  starting_pos: string
}

// The dugout batting card: big, readable, just order / name / position. This is
// the sheet that hangs in the dugout — distinct from the blank scorecard that
// gets handwritten during the game (PrintableCard).
export function BattingLineupCard({
  opponent,
  gameDate,
  rows,
}: {
  opponent: string | null
  gameDate: string | null
  rows: LineupCardRow[]
}) {
  return (
    <div className="print-card text-field-ink">
      <div className="mb-4 flex items-end justify-between border-b-2 border-field-ink pb-2">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">The Softball Team</h1>
          <p className="text-sm text-field-muted">Batting Lineup</p>
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
        </div>
      </div>

      <ol className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.batting_order}
            className="flex items-baseline gap-3 border-b border-field-line py-2 text-lg"
          >
            <span className="w-7 text-right font-bold tabular text-field-grass">{r.batting_order}</span>
            <span className="flex-1 font-semibold">{r.name}</span>
            <span className="w-16 text-right text-base font-medium text-field-muted">{r.starting_pos}</span>
          </li>
        ))}
      </ol>

      {rows.length === 0 && (
        <p className="py-8 text-center text-field-muted">Add players to build the lineup.</p>
      )}
    </div>
  )
}
