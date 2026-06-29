import type { OppAnalysis, Strength } from '@/lib/opponentScouting'

const STRENGTH_LABEL: Record<Strength, string> = { strong: 'Strong', average: 'Average', weak: 'Weak' }
// Framed from our view: their strength = caution (clay), their weakness = our opening (grass).
const STRENGTH_CLASS: Record<Strength, string> = {
  strong: 'bg-field-clay/10 text-field-clay',
  average: 'bg-field-cream text-field-muted',
  weak: 'bg-field-grass/10 text-field-grass',
}

function StrengthTag({ kind, level }: { kind: string; level: Strength }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STRENGTH_CLASS[level]}`}>
      {kind}: {STRENGTH_LABEL[level]}
    </span>
  )
}

// Opponent scouting block: record + run diff badges, batting/defence ratings,
// and a one-line read. Presentational (no hooks) so it works in server and
// client trees alike.
export function OpponentScouting({ analysis, record }: { analysis: OppAnalysis; record?: string | null }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {record && (
          <span className="rounded bg-field-cream px-2 py-0.5 text-xs font-medium text-field-muted">{record}</span>
        )}
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            analysis.diff > 0
              ? 'bg-field-clay/10 text-field-clay'
              : analysis.diff < 0
                ? 'bg-field-grass/10 text-field-grass'
                : 'bg-field-cream text-field-muted'
          }`}
        >
          {analysis.diff > 0 ? '+' : ''}
          {analysis.diff} run diff
        </span>
        <StrengthTag kind="Bats" level={analysis.batting} />
        <StrengthTag kind="Defence" level={analysis.defence} />
      </div>
      <p className="text-xs text-field-muted">
        {analysis.read}{' '}
        <span className="text-field-muted/70">
          ({analysis.rpgFor.toFixed(1)} RS · {analysis.rpgAgainst.toFixed(1)} RA / game)
        </span>
      </p>
    </div>
  )
}
