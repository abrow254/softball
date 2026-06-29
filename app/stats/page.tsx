import { listSeasons, getCurrentSeason, getSeasonStats } from '@/lib/db'
import { StatsGrid } from '@/components/StatsGrid'
import { SeasonSelector } from '@/components/SeasonSelector'
import { SeasonPhotoBanner } from '@/components/SeasonPhotoBanner'
import { photoForSeason } from '@/lib/teamPhotos'

export const dynamic = 'force-dynamic'

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {

  const seasons = await listSeasons()

  if (seasons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        No seasons yet. An admin can add one to get started.
      </p>
    )
  }

  const fallback = (await getCurrentSeason())?.id ?? seasons[0].id
  const selectedId = searchParams.season && seasons.some((s) => s.id === searchParams.season)
    ? searchParams.season
    : fallback

  const rows = await getSeasonStats(selectedId)
  const selectedSeason = seasons.find((s) => s.id === selectedId)
  const photo = selectedSeason ? photoForSeason(selectedSeason.year, selectedSeason.term) : undefined

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season stats</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedId} />
      </div>

      {photo && <SeasonPhotoBanner src={photo.src} caption={photo.caption} />}

      <StatsGrid rows={rows} />

      <p className="text-xs text-field-muted">
        Tap a column header to sort, or a name for that player&rsquo;s career.{' '}
        <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the season leader; when sorting a
        rate stat, players under 10 AB are dimmed and sorted last. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
