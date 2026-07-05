import type { PlayerAccolades } from '@/lib/db/accolades'

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉')
const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : `${n}rd`)

// The player's honours: season awards, all-time top-3 finishes, and single-game
// team records held. Rendered as a section on the profile; null if empty.
export function TrophyCase({ accolades }: { accolades: PlayerAccolades }) {
  const { seasonAwards, allTimeRanks, gameRecords } = accolades
  if (seasonAwards.length === 0 && allTimeRanks.length === 0 && gameRecords.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Trophy case</h2>

      {seasonAwards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {seasonAwards.map((a, i) => (
            <span
              key={`${a.season}-${a.label}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-field-gold/40 bg-field-gold/15 px-3 py-1.5 text-sm text-field-ink"
              title={`${a.label} · ${a.value}`}
            >
              <span aria-hidden>{a.emoji}</span>
              <span className="font-semibold">{a.label}</span>
              <span className="text-xs text-field-muted">{a.season}</span>
            </span>
          ))}
        </div>
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
