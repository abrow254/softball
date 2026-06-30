import Link from 'next/link'
import type { RecordsResult, StatRecord } from '@/lib/db'

function RecordCard({ rec }: { rec: StatRecord }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper p-3">
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{rec.label}</div>
      <div className="tabular text-xl font-semibold text-field-ink">{rec.display}</div>
      <div className="mt-1 space-y-0.5">
        {rec.holders.map((h, i) => (
          <div key={`${h.player_id}-${i}`} className="text-xs text-field-muted">
            <Link href={`/players/${h.player_id}`} className="font-medium text-field-ink hover:underline">
              {h.name}
            </Link>
            {h.season ? ` · ${h.season}` : ''}
            {h.opponent ? ` · vs ${h.opponent}` : ''}
            {h.date ? ` · ${h.date}` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// All-time records: team, PotG leaderboard, single-game, single-season, streaks.
export function RecordsPanel({ records }: { records: RecordsResult }) {
  const { singleGame, season, team, potgLeaders, onBaseStreak, multiHitStreak } = records
  const hasAny =
    singleGame.length || season.length || team.length || potgLeaders.length || onBaseStreak || multiHitStreak
  if (!hasAny) return null

  return (
    <div className="space-y-6">
      {team.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Team</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {team.map((t) => (
              <div key={t.label} className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{t.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">{t.label}</div>
                {t.detail && <div className="mt-0.5 text-[11px] text-field-muted">{t.detail}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {potgLeaders.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
            Player of the Game — all-time
          </h3>
          <div className="overflow-hidden rounded-lg border border-field-line">
            <ul className="divide-y divide-field-line">
              {potgLeaders.slice(0, 10).map((p, i) => (
                <li key={p.player_id} className="flex items-center gap-3 bg-field-paper px-4 py-2">
                  <span className="w-5 text-right font-semibold text-field-grass">{i + 1}</span>
                  <Link
                    href={`/players/${p.player_id}`}
                    className="min-w-0 flex-1 truncate font-medium text-field-ink hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className="tabular text-sm font-semibold text-field-ink">⭐ {p.wins}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {singleGame.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Single game</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {singleGame.map((r) => (
              <RecordCard key={r.label} rec={r} />
            ))}
          </div>
        </section>
      )}

      {season.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Single season</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {season.map((r) => (
              <RecordCard key={r.label} rec={r} />
            ))}
          </div>
        </section>
      )}

      {(onBaseStreak || multiHitStreak) && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Streaks</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {onBaseStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{onBaseStreak.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">On-base streak</div>
                <Link
                  href={`/players/${onBaseStreak.player_id}`}
                  className="mt-0.5 block text-[11px] text-field-ink hover:underline"
                >
                  {onBaseStreak.name}
                </Link>
              </div>
            )}
            {multiHitStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{multiHitStreak.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">Multi-hit games</div>
                <Link
                  href={`/players/${multiHitStreak.player_id}`}
                  className="mt-0.5 block text-[11px] text-field-ink hover:underline"
                >
                  {multiHitStreak.name}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <p className="text-xs text-field-muted">
        Single-game and streak records come from games entered game-by-game; bulk-imported season totals count toward
        season and career records only.
      </p>
    </div>
  )
}
