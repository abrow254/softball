import { FIELDING_POSITIONS, isFieldingPosition } from '@/lib/positions'
import { FieldDiagram } from '@/components/FieldDiagram'

export interface AlignmentEntry {
  name: string
  pos: string // assigned starting_pos ('' if none)
  eligible: string[] // positions the player can field ([] = unknown)
}

// Defensive alignment view: the field diagram + warnings for unfilled spots,
// duplicate assignments, and players placed at a position they can't field.
export function AlignmentBuilder({ entries }: { entries: AlignmentEntry[] }) {
  const assignments: Record<string, string[]> = {}
  for (const e of entries) {
    if (!isFieldingPosition(e.pos)) continue
    ;(assignments[e.pos] ??= []).push(e.name)
  }

  const filled = new Set(Object.keys(assignments))
  const unfilled = FIELDING_POSITIONS.filter((p) => !filled.has(p))
  const duplicates = Object.entries(assignments)
    .filter(([, names]) => names.length > 1)
    .map(([pos]) => pos)
  const ineligible = entries.filter(
    (e) => isFieldingPosition(e.pos) && e.eligible.length > 0 && !e.eligible.includes(e.pos),
  )

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-field-line bg-field-paper p-3">
        <FieldDiagram assignments={assignments} />
      </div>

      <div className="space-y-1 text-xs">
        {unfilled.length > 0 && (
          <p className="text-field-muted">
            <span className="font-semibold text-field-ink">Open:</span> {unfilled.join(', ')}
          </p>
        )}
        {duplicates.length > 0 && (
          <p className="text-field-clay">⚠️ Two players at: {duplicates.join(', ')}</p>
        )}
        {ineligible.map((e) => (
          <p key={`${e.name}-${e.pos}`} className="text-field-clay">
            ⚠️ {e.name} isn&rsquo;t listed at {e.pos} (can play: {e.eligible.join(', ') || '—'})
          </p>
        ))}
        {unfilled.length === 0 && duplicates.length === 0 && ineligible.length === 0 && (
          <p className="text-field-grass">✓ Every position covered, no conflicts.</p>
        )}
      </div>
    </div>
  )
}
