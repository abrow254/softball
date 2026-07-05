import { FIELDING_POSITIONS, POSITION_PRIORITY, isFieldingPosition } from '@/lib/positions'
import { FieldDiagram } from '@/components/FieldDiagram'

export interface AlignmentEntry {
  name: string
  pos: string // assigned starting_pos ('' if none)
  eligible: string[] // positions the player can field ([] = unknown)
}

// Defensive alignment view: the field diagram + warnings for duplicate/ineligible
// assignments, plus a short-handed note when fewer than 9 take the field.
export function AlignmentBuilder({ entries }: { entries: AlignmentEntry[] }) {
  const assignments: Record<string, string[]> = {}
  for (const e of entries) {
    if (!isFieldingPosition(e.pos)) continue
    ;(assignments[e.pos] ??= []).push(e.name)
  }

  const filled = new Set(Object.keys(assignments))
  // Unfilled positions, lowest-priority first (the ones we deliberately drop).
  const unfilled = [...FIELDING_POSITIONS]
    .filter((p) => !filled.has(p))
    .sort((a, b) => POSITION_PRIORITY.indexOf(b) - POSITION_PRIORITY.indexOf(a))
  const duplicates = Object.entries(assignments)
    .filter(([, names]) => names.length > 1)
    .map(([pos]) => pos)
  const ineligible = entries.filter(
    (e) => isFieldingPosition(e.pos) && e.eligible.length > 0 && !e.eligible.includes(e.pos),
  )
  // Players not currently fielding (blank / DH / bench) — spare bodies.
  const spares = entries.filter((e) => !isFieldingPosition(e.pos)).length
  // Short-handed = fewer fielders than positions AND no spares sitting.
  const shortHanded = unfilled.length > 0 && spares === 0

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-field-line bg-field-paper p-3">
        <FieldDiagram assignments={assignments} />
      </div>

      <div className="space-y-1 text-xs">
        {shortHanded && (
          <p className="text-field-muted">
            <span className="font-semibold text-field-ink">Short-handed ({filled.size}):</span> leaving{' '}
            {unfilled.join(', ')} unmanned — the lowest-priority spots, so the outfield stays covered.
          </p>
        )}
        {!shortHanded && unfilled.length > 0 && (
          <p className="text-field-clay">
            ⚠️ Open: {unfilled.join(', ')}
            {spares > 0 ? ` (${spares} player${spares === 1 ? '' : 's'} not fielding)` : ''}
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
