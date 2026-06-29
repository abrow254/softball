import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listPlayers, listSeasons, getCurrentSeason, getSeasonRoster } from '@/lib/db'
import { RosterEditor } from '@/components/RosterEditor'
import { SeasonSelector } from '@/components/SeasonSelector'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Roster — The Softball Team' }

export default async function RosterPage({
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Roster</h1>
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No seasons yet.
        </p>
      </div>
    )
  }

  const fallback = (await getCurrentSeason())?.id ?? seasons[0].id
  const selectedSeasonId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season) ? searchParams.season : fallback
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? null

  const [players, rosterIds] = await Promise.all([listPlayers(), getSeasonRoster(selectedSeasonId)])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Roster</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/admin/roster" />
      </div>
      <p className="text-sm text-field-muted">
        Check who&rsquo;s playing in <strong>{selectedSeason?.label}</strong> — only those players show in the lineup
        builder for that season. Set each player&rsquo;s gender (for the MMF rule) and the positions they can field, in
        order of preference (first = primary) so Auto-optimize can fill the field.
      </p>
      <RosterEditor
        players={players}
        seasonId={selectedSeasonId}
        seasonLabel={selectedSeason?.label ?? ''}
        rosterIds={rosterIds}
      />
    </div>
  )
}
