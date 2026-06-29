import { listSeasons, getCurrentSeason, getSeasonStats, listGames } from '@/lib/db'
import { StatsGrid } from '@/components/StatsGrid'
import { SeasonSelector } from '@/components/SeasonSelector'
import { SeasonPhotoBanner } from '@/components/SeasonPhotoBanner'
import { photoForSeason } from '@/lib/teamPhotos'
import { SEASON_RECORDS, recordForSeason } from '@/lib/seasonRecords'
import type { Season } from '@/lib/types'

function RecordTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className="tabular text-lg font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

// Sort newest-first: year desc, then Fall after Summer within a year.
const termRank = (t: string) => (t === 'Fall' ? 1 : 0)
const bySeasonDesc = (a: Season, b: Season) =>
  b.year - a.year || termRank(b.term) - termRank(a.term)

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const dbSeasons = await listSeasons()

  // Merge in seasons that exist only in the records sheet (e.g. 2022, where we
  // didn't track player stats) so they're selectable with a record + photo.
  const dbKeys = new Set(dbSeasons.map((s) => `${s.year}-${s.term}`))
  const registryOnly: Season[] = SEASON_RECORDS.filter((r) => !dbKeys.has(`${r.year}-${r.term}`)).map((r) => ({
    id: `rec:${r.year}-${r.term}`,
    year: r.year,
    term: r.term,
    label: `${r.year} ${r.term}`,
    is_current: false,
    created_at: '',
  }))
  const seasons = [...dbSeasons, ...registryOnly].sort(bySeasonDesc)

  if (seasons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        No seasons yet. An admin can add one to get started.
      </p>
    )
  }

  const currentSeason = await getCurrentSeason()
  const fallback = currentSeason?.id ?? seasons[0].id
  const selectedId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season) ? searchParams.season : fallback

  const selectedSeason = seasons.find((s) => s.id === selectedId)
  const isRegistryOnly = selectedId.startsWith('rec:')
  const isCurrent = selectedId === currentSeason?.id

  const photo = selectedSeason ? photoForSeason(selectedSeason.year, selectedSeason.term) : undefined

  // Player stats + live record only for real (DB) seasons.
  const [rows, games] = isRegistryOnly
    ? [[], []]
    : await Promise.all([getSeasonStats(selectedId), listGames(selectedId)])

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

  // Season summary: official record for past/untracked seasons, live game data
  // for the current season. (Win % is W / games played, per the records sheet.)
  const reg = selectedSeason ? recordForSeason(selectedSeason.year, selectedSeason.term) : undefined
  const summary =
    reg && !isCurrent
      ? {
          w: reg.w, l: reg.l, d: reg.d,
          winPct: reg.winPct,
          rsPerG: reg.rsPerG, raPerG: reg.raPerG,
          runDiff: reg.runDiff,
          finished: reg.finished as string | undefined,
          rankingPoints: reg.rankingPoints as number | undefined,
        }
      : gp > 0
        ? {
            w, l, d,
            winPct: w / gp,
            rsPerG: rf / gp, raPerG: ra / gp,
            runDiff: rf - ra,
            finished: isCurrent ? 'In progress' : undefined,
            rankingPoints: undefined as number | undefined,
          }
        : null

  const fmtPct = (n: number) => n.toFixed(3).replace(/^0/, '')

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Season stats</h1>
        <SeasonSelector seasons={seasons} selectedId={selectedId} />
      </div>

      {/* Photo on one side, record stacked on the other */}
      {(photo || summary) && (
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {photo && (
            <div className="sm:w-1/2 sm:shrink-0">
              <SeasonPhotoBanner src={photo.src} caption={photo.caption} />
            </div>
          )}
          {summary && (
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2">
                <RecordTile label="Record" value={`${summary.w}-${summary.l}-${summary.d}`} />
                <RecordTile label="Win %" value={fmtPct(summary.winPct)} />
                <RecordTile
                  label="Run Diff"
                  value={summary.runDiff > 0 ? `+${summary.runDiff}` : String(summary.runDiff)}
                />
                <RecordTile label="Finish" value={summary.finished ?? '—'} />
              </div>
              <p className="mt-2 text-xs text-field-muted">
                {summary.rsPerG.toFixed(1)} runs/game · {summary.raPerG.toFixed(1)} allowed
                {summary.rankingPoints != null ? ` · ${summary.rankingPoints} ranking pts` : ''}
              </p>
            </div>
          )}
        </section>
      )}

      {isRegistryOnly ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-sm text-field-muted">
          Player stats weren&rsquo;t tracked this season — only the team record above.
        </p>
      ) : (
        <>
          <StatsGrid rows={rows} />
          <p className="text-xs text-field-muted">
            Tap a column header to sort, or a name for that player&rsquo;s career.{' '}
            <span className="rounded bg-field-gold/30 px-1 font-semibold">Gold</span> marks the season leader; when
            sorting a rate stat, players under 10 AB are dimmed and sorted last. House rules: OBP counts FC and divides
            by AB; OPS is AVG + SLG.
          </p>
        </>
      )}
    </div>
  )
}
