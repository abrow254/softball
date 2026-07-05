import type { PlayerAccolades, SeasonAwardWon } from '@/lib/db/accolades'

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉')
const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : `${n}rd`)

// "2024 Summer" -> "2024 Su" so a season list stays compact.
const shortSeason = (label: string) => label.replace(/\bSummer\b/, 'Su').replace(/\bFall\b/, 'Fa')

// Collapse one-chip-per-season into one row per award, keeping input order
// (newest-first), e.g. MVP → [2025 Su, 2024 Fa].
function groupAwards(awards: SeasonAwardWon[]) {
  const groups: { label: string; emoji: string; seasons: string[] }[] = []
  const byLabel = new Map<string, { label: string; emoji: string; seasons: string[] }>()
  for (const a of awards) {
    let g = byLabel.get(a.label)
    if (!g) {
      g = { label: a.label, emoji: a.emoji, seasons: [] }
      byLabel.set(a.label, g)
      groups.push(g)
    }
    g.seasons.push(shortSeason(a.season))
  }
  // Most-decorated award first.
  return groups.sort((a, b) => b.seasons.length - a.seasons.length)
}

// The player's honours: season awards, all-time top-3 finishes, and single-game
// team records held. Rendered as a section on the profile; null if empty.
export function TrophyCase({ accolades }: { accolades: PlayerAccolades }) {
  const { championships, seasonAwards, allTimeRanks, gameRecords } = accolades
  if (
    championships.length === 0 &&
    seasonAwards.length === 0 &&
    allTimeRanks.length === 0 &&
    gameRecords.length === 0
  )
    return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Trophy case</h2>

      {championships.length > 0 && (
        <div className="rounded-lg border border-field-gold/50 bg-field-gold/15 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>🏆</span>
            <span className="font-semibold text-field-ink">
              {championships.length}× League Champion
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {championships.map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-field-ink ring-1 ring-field-gold/40"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {seasonAwards.length > 0 && (
        <ul className="space-y-1.5">
          {groupAwards(seasonAwards).map((g) => (
            <li
              key={g.label}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-field-gold/40 bg-field-gold/15 px-3 py-1.5 text-sm text-field-ink"
            >
              <span aria-hidden>{g.emoji}</span>
              <span className="font-semibold">{g.label}</span>
              {g.seasons.length > 1 && (
                <span className="rounded-full bg-field-gold/40 px-1.5 text-xs font-semibold text-field-ink">
                  ×{g.seasons.length}
                </span>
              )}
              <span className="text-xs text-field-muted">{g.seasons.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}

      {(allTimeRanks.length > 0 || gameRecords.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {allTimeRanks.length > 0 && (
            <div className="rounded-lg border border-field-line bg-field-paper p-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-field-muted">
                All-time leaderboard
              </h3>
              <ul className="space-y-1 text-sm">
                {allTimeRanks.map((r) => (
                  <li key={r.label} className="flex items-center gap-2">
                    <span aria-hidden>{medal(r.rank)}</span>
                    <span className="text-field-ink">
                      <span className="font-semibold">{ordinal(r.rank)}</span> in {r.label}
                    </span>
                    <span className="tabular ml-auto text-field-muted">{r.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gameRecords.length > 0 && (
            <div className="rounded-lg border border-field-line bg-field-paper p-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-field-muted">
                Team records held
              </h3>
              <ul className="space-y-1 text-sm">
                {gameRecords.map((r) => (
                  <li key={r.label} className="flex items-center gap-2">
                    <span aria-hidden>🏅</span>
                    <span className="text-field-ink">{r.label}</span>
                    <span className="tabular ml-auto font-semibold text-field-ink">
                      {r.value}
                      {r.shared && <span className="ml-1 text-xs font-normal text-field-muted">(shared)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
