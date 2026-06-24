import Link from 'next/link'
import { listSeasons, getCurrentSeason, getSeasonAwards } from '@/lib/db'
import type { SeasonAward, AwardWinner } from '@/lib/db/awards'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Awards — The Softball Team' }

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

  const { awards, qualified, season } = selectedId
    ? await getSeasonAwards(selectedId)
    : { awards: [], qualified: [], season: null }

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season Awards</h1>
        {season && <p className="mt-1 text-sm text-field-muted">{season.label}</p>}
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
    </div>
  )
}
