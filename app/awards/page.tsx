import Link from 'next/link'
import { listSeasons, getCurrentSeason, getSeasonAwards, getRecords, type StatRecord } from '@/lib/db'
import type { SeasonAward, AwardWinner } from '@/lib/db/awards'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Awards & Records — The Softball Team' }

const AWARD_EMOJI: Record<string, string> = {
  mvp: '🏆',
  batting_champ: '🥇',
  slugger: '💪',
  on_base: '🎯',
  xbh: '🔥',
  ringer_mvp: '⭐',
  most_improved: '📈',
  potg_award: '🐦',
}

function WinnerRow({ winner, linkBase }: { winner: AwardWinner; linkBase: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`${linkBase}/${winner.player_id}`}
        className="font-semibold text-field-ink hover:underline"
      >
        {winner.name}
      </Link>
      <div className="text-right">
        <span className="tabular font-bold text-field-grass">{winner.value}</span>
        <span className="ml-2 text-sm text-field-muted">{winner.statLine}</span>
      </div>
    </div>
  )
}

function AwardCard({ award }: { award: SeasonAward }) {
  const emoji = AWARD_EMOJI[award.id] ?? '🏅'
  const isCoWin = award.winners.length > 1

  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-semibold text-field-ink">{award.label}</h3>
        {isCoWin && (
          <span className="rounded-full bg-field-cream px-2 py-0.5 text-xs text-field-muted">
            tied
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-field-muted">{award.description}</p>
      <div className="space-y-1.5 border-t border-field-line pt-2">
        {award.winners.map((w) => (
          <WinnerRow key={w.player_id} winner={w} linkBase="/players" />
        ))}
        {award.winners.length === 0 && (
          <p className="text-sm text-field-muted">No eligible players yet.</p>
        )}
      </div>
    </div>
  )
}

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

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const seasons = await listSeasons()
  const current = await getCurrentSeason()
  const fallbackId = current?.id ?? seasons[0]?.id

  const selectedId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season)
      ? searchParams.season
      : fallbackId

  const [{ awards, qualified, season }, records] = await Promise.all([
    selectedId
      ? getSeasonAwards(selectedId)
      : Promise.resolve({ awards: [], qualified: [], all: [], season: null }),
    getRecords(),
  ])

  return (
    <div className="space-y-8" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Awards &amp; Records</h1>
        {season && <p className="mt-1 text-sm text-field-muted">Season awards · {season.label}</p>}
      </div>

      {/* Season selector */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/awards?season=${s.id}`}
            className={[
              'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors',
              s.id === selectedId
                ? 'bg-field-grass text-white'
                : 'bg-field-cream border border-field-line text-field-muted hover:text-field-ink',
            ].join(' ')}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {awards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No stats recorded yet for this season.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {awards.map((award) => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>

          <p className="text-xs text-field-muted">
            Qualified = {qualified.length} player{qualified.length !== 1 ? 's' : ''} with enough AB. Rate-stat
            awards (MVP, Batting Champ, OBP, Most Improved) require qualification. Counting-stat awards (HR, XBH)
            are open to everyone. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
          </p>
        </>
      )}

      {/* ---- All-time records ---- */}
      <div className="space-y-6 border-t border-field-line pt-6">
        <h2 className="text-xl font-semibold tracking-tight text-field-ink">All-time records</h2>

        {records.team.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Team</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {records.team.map((t) => (
                <div key={t.label} className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                  <div className="tabular text-xl font-semibold text-field-ink">{t.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-field-muted">{t.label}</div>
                  {t.detail && <div className="mt-0.5 text-[11px] text-field-muted">{t.detail}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {records.potgLeaders.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
              Player of the Game — all-time
            </h3>
            <div className="overflow-hidden rounded-lg border border-field-line">
              <ul className="divide-y divide-field-line">
                {records.potgLeaders.slice(0, 10).map((p, i) => (
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

        {records.singleGame.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Single game</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {records.singleGame.map((r) => (
                <RecordCard key={r.label} rec={r} />
              ))}
            </div>
          </section>
        )}

        {records.season.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Single season</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {records.season.map((r) => (
                <RecordCard key={r.label} rec={r} />
              ))}
            </div>
          </section>
        )}

        {(records.onBaseStreak || records.multiHitStreak) && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Streaks</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {records.onBaseStreak && (
                <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                  <div className="tabular text-xl font-semibold text-field-ink">{records.onBaseStreak.length}</div>
                  <div className="text-[11px] uppercase tracking-wide text-field-muted">On-base streak</div>
                  <Link
                    href={`/players/${records.onBaseStreak.player_id}`}
                    className="mt-0.5 block text-[11px] text-field-ink hover:underline"
                  >
                    {records.onBaseStreak.name}
                  </Link>
                </div>
              )}
              {records.multiHitStreak && (
                <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
                  <div className="tabular text-xl font-semibold text-field-ink">{records.multiHitStreak.length}</div>
                  <div className="text-[11px] uppercase tracking-wide text-field-muted">Multi-hit games</div>
                  <Link
                    href={`/players/${records.multiHitStreak.player_id}`}
                    className="mt-0.5 block text-[11px] text-field-ink hover:underline"
                  >
                    {records.multiHitStreak.name}
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        <p className="text-xs text-field-muted">
          Single-game and streak records come from games entered game-by-game; bulk-imported season totals count
          toward season and career records only.
        </p>
      </div>
    </div>
  )
}
