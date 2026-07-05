import { FIELDING_POSITIONS, POSITION_PRIORITY, isFieldingPosition, type FieldingPosition } from '@/lib/positions'
import { FieldDiagram } from '@/components/FieldDiagram'

export interface AlignmentEntry {
  name: string
  pos: string // assigned starting_pos ('' if none)
  eligible: string[] // positions the player can field ([] = unknown)
}

const prio = (p: string) => POSITION_PRIORITY.indexOf(p as FieldingPosition)

// Defensive alignment view: the field diagram + warnings for duplicate/ineligible
// assignments, plus an honest short-handed note when fewer than 9 take the field.
export function AlignmentBuilder({ entries }: { entries: AlignmentEntry[] }) {
  const assignments: Record<string, string[]> = {}
  for (const e of entries) {
    if (!isFieldingPosition(e.pos)) continue
    ;(assignments[e.pos] ??= []).push(e.name)
  }

  const filled = new Set(Object.keys(assignments))
  // Unfilled positions, lowest-priority first.
  const unfilled = [...FIELDING_POSITIONS].filter((p) => !filled.has(p)).sort((a, b) => prio(b) - prio(a))
  const duplicates = Object.entries(assignments)
    .filter(([, names]) => names.length > 1)
    .map(([pos]) => pos)
  const ineligible = entries.filter(
    (e) => isFieldingPosition(e.pos) && e.eligible.length > 0 && !e.eligible.includes(e.pos),
  )

  // Players not currently fielding (blank / DH / bench) — spare bodies.
  const spares = entries.filter((e) => !isFieldingPosition(e.pos)).length
  const shortHanded = unfilled.length > 0 && spares === 0

  // A "clean" short-handed drop = every unfilled spot is lower-priority than
  // every filled spot (we simply ran out of bodies at the bottom of the list).
  const worstFilledIdx = filled.size ? Math.max(...[...filled].map(prio)) : -1
  const cleanDrop = unfilled.every((p) => prio(p) > worstFilledIdx)

  // Positions no available player is *eligible* for (unless someone's positions
  // are unset — they can cover anything). These are why a higher-priority spot
  // like SS can end up open: it's an eligibility gap, not a priority choice.
  const anyFlexible = entries.some((e) => e.eligible.length === 0)
  const eligibleUnion = new Set(entries.flatMap((e) => e.eligible))
  const uncoverable = anyFlexible ? [] : unfilled.filter((p) => !eligibleUnion.has(p))

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-field-line bg-field-paper p-3">
        <FieldDiagram assignments={assignments} />
      </div>

      <div className="space-y-1 text-xs">
        {shortHanded && cleanDrop && (
          <p className="text-field-muted">
            <span className="font-semibold text-field-ink">Short-handed ({filled.size}):</span> leaving{' '}
            {unfilled.join(', ')} unmanned — the lowest-priority spots, so the outfield stays covered.
          </p>
        )}
        {shortHanded && !cleanDrop && (
          <p className="text-field-clay">
            ⚠️ <span className="font-semibold">{unfilled.join(', ')} uncovered.</span>{' '}
            {uncoverable.length > 0
              ? `No available player is set to play ${uncoverable.join(', ')} — add it to someone's positions on the Roster so the optimizer can cover it.`
              : 'Eligibility left these open even though higher-priority spots are unfilled — widen a player’s positions on the Roster.'}
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
