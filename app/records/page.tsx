import Link from 'next/link'
import { getRecords, type StatRecord } from '@/lib/db'
import { Tile } from '@/components/Tile'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Records — The Softball Team' }

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">{title}</h2>
      {children}
    </section>
  )
}

export default async function RecordsPage() {
  const { singleGame, season, team, potgLeaders, onBaseStreak, multiHitStreak } = await getRecords()

  const hasAny =
    singleGame.length || season.length || team.length || potgLeaders.length || onBaseStreak || multiHitStreak

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Records</h1>
        <p className="mt-1 text-sm text-field-muted">The team&rsquo;s best — all-time.</p>
      </div>

      {!hasAny && (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No records yet — enter some games to get started.
        </p>
      )}

      {team.length > 0 && (
        <Section title="Team">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {team.map((t) => (
              <div key={t.label} className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{t.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">{t.label}</div>
                {t.detail && <div className="mt-0.5 text-[11px] text-field-muted">{t.detail}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {potgLeaders.length > 0 && (
        <Section title="Player of the Game — all-time">
          <div className="overflow-hidden rounded-lg border border-field-line">
            <ul className="divide-y divide-field-line">
              {potgLeaders.slice(0, 10).map((p, i) => (
                <li key={p.player_id} className="flex items-center gap-3 bg-field-paper px-4 py-2">
                  <span className="w-5 text-right font-semibold text-field-grass">{i + 1}</span>
                  <Link href={`/players/${p.player_id}`} className="min-w-0 flex-1 truncate font-medium text-field-ink hover:underline">
                    {p.name}
                  </Link>
                  <span className="tabular text-sm font-semibold text-field-ink">⭐ {p.wins}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {singleGame.length > 0 && (
        <Section title="Single game">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {singleGame.map((r) => (
              <RecordCard key={r.label} rec={r} />
            ))}
          </div>
        </Section>
      )}

      {season.length > 0 && (
        <Section title="Single season">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {season.map((r) => (
              <RecordCard key={r.label} rec={r} />
            ))}
          </div>
        </Section>
      )}

      {(onBaseStreak || multiHitStreak) && (
        <Section title="Streaks">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {onBaseStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{onBaseStreak.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">On-base streak</div>
                <Link href={`/players/${onBaseStreak.player_id}`} className="mt-0.5 block text-[11px] text-field-ink hover:underline">
                  {onBaseStreak.name}
                </Link>
              </div>
            )}
            {multiHitStreak && (
              <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                <div className="tabular text-xl font-semibold text-field-ink">{multiHitStreak.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-field-muted">Multi-hit games</div>
                <Link href={`/players/${multiHitStreak.player_id}`} className="mt-0.5 block text-[11px] text-field-ink hover:underline">
                  {multiHitStreak.name}
                </Link>
              </div>
            )}
          </div>
        </Section>
      )}

      <p className="text-xs text-field-muted">
        Single-game and streak records come from games entered game-by-game; bulk-imported season totals count toward
        season and career records only.
      </p>
    </div>
  )
}
