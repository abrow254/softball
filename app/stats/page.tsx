import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason, getSeasonStats } from '@/lib/db'
import { StatsGrid } from '@/components/StatsGrid'
import { SeasonSelector } from '@/components/SeasonSelector'

export const dynamic = 'force-dynamic'

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season stats</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedId} />
      </div>

      <StatsGrid rows={rows} />

      <p className="text-xs text-field-muted">
        Tap a column header to sort. Two columns use house rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
