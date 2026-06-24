import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason, getLineupLabData } from '@/lib/db'
import { LineupLab } from '@/components/LineupLab'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Lineup Lab — The Softball Team' }

export default async function LineupLabPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const seasons = await listSeasons()

  if (seasons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        No seasons yet.
      </p>
    )
  }

  const fallback = (await getCurrentSeason())?.id ?? seasons[0].id
  const selectedId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season)
      ? searchParams.season
      : fallback

  const players = await getLineupLabData(selectedId)

  // key forces a full remount when the season changes so state re-initializes.
  return (
    <LineupLab
      key={selectedId}
      players={players}
      seasons={seasons}
      selectedSeasonId={selectedId}
    />
  )
}
