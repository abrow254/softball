import { listSeasons, getCurrentSeason, getSeasonStats, listGames } from '@/lib/db'
import { StatsGrid } from '@/components/StatsGrid'
import { SeasonSelector } from '@/components/SeasonSelector'
import { SeasonPhotoBanner } from '@/components/SeasonPhotoBanner'
import { photoForSeason } from '@/lib/teamPhotos'

function RecordTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className="tabular text-lg font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

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

  const [rows, games] = await Promise.all([getSeasonStats(selectedId), listGames(selectedId)])
  const selectedSeason = seasons.find((s) => s.id === selectedId)
  const photo = selectedSeason ? photoForSeason(selectedSeason.year, selectedSeason.term) : undefined

  // Season record from this season's played, non-aggregate games.
  let w = 0, l = 0, d = 0, rf = 0, ra = 0, gp = 0
  for (const g of games) {
    if (g.is_aggregate || g.our_runs == null || g.opp_runs == null) continue
    gp++
    rf += g.our_runs
    ra += g.opp_runs
    if (g.our_runs > g.opp_runs) w++
    else if (g.our_runs < g.opp_runs) l++
    else d++
  }
  const diff = rf - ra

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season stats</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedId} />
      </div>

      {photo && <SeasonPhotoBanner src={photo.src} caption={photo.caption} />}

      {gp > 0 && (
        <section className="grid grid-cols-4 gap-2">
          <RecordTile label="Record" value={`${w}-${l}-${d}`} />
          <RecordTile label="Run Diff" value={diff > 0 ? `+${diff}` : String(diff)} />
          <RecordTile label="Runs For" value={String(rf)} />
          <RecordTile label="Runs Against" value={String(ra)} />
        </section>
      )}

      <StatsGrid rows={rows} />

      <p className="text-xs text-field-muted">
        Tap a column header to sort, or a name for that player&rsquo;s career.{' '}
        <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the season leader; when sorting a
        rate stat, players under 10 AB are dimmed and sorted last. House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
