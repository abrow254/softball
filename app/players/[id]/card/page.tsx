import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlayerSeasons, getPlayerSeasonReview } from '@/lib/db'
import { SeasonReviewCard } from '@/components/SeasonReviewCard'
import { ShareLinkButton } from '@/components/ShareLinkButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { season?: string }
}) {
  const seasons = await getPlayerSeasons(params.id)
  const seasonId = searchParams.season && seasons.some((s) => s.id === searchParams.season)
    ? searchParams.season
    : seasons[0]?.id
  const review = seasonId ? await getPlayerSeasonReview(params.id, seasonId) : null
  return {
    title: review ? `${review.playerName} — ${review.seasonLabel} in Review` : 'Season card',
  }
}

export default async function SeasonCardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { season?: string }
}) {
  const seasons = await getPlayerSeasons(params.id)
  if (seasons.length === 0) notFound()

  const seasonId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season)
      ? searchParams.season
      : seasons[0].id
  const review = await getPlayerSeasonReview(params.id, seasonId)
  if (!review) notFound()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/players/${params.id}`} className="text-sm text-field-grass hover:underline">
          ← {review.playerName}
        </Link>
        <ShareLinkButton title={`${review.playerName} — ${review.seasonLabel}`} />
      </div>

      {/* Season switcher */}
      {seasons.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/players/${params.id}/card?season=${s.id}`}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                s.id === seasonId
                  ? 'bg-field-grass text-white'
                  : 'border border-field-line text-field-muted hover:border-field-grass hover:text-field-ink',
              ].join(' ')}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      <SeasonReviewCard review={review} />

      <p className="text-center text-xs text-field-muted">
        Screenshot the card to share it, or use Share to send the live link.
      </p>
    </div>
  )
}
