import Link from 'next/link'
import { listSeasons, getCurrentSeason, getSeasonStats, getCareerStats } from '@/lib/db'
import { fmt3, fmtPct } from '@/lib/formulas'
import type { SeasonStatRow, CareerStatRow } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Leaderboards — The Softball Team' }

// ---------- Config -----------------------------------------------------------

const STAT_KEYS = ['ops', 'avg', 'obp', 'slg', 'iso', 'xbh_pct', 'hr', 'tb', 'hits', 'doubles', 'triples', 'ab'] as const
type StatKey = (typeof STAT_KEYS)[number]

const STAT_CONFIG: Record<StatKey, { label: string; qualified: boolean; format: 'rate' | 'pct' | 'int'; col: string }> = {
  ops:     { label: 'OPS',   qualified: true,  format: 'rate', col: 'ops' },
  avg:     { label: 'AVG',   qualified: true,  format: 'rate', col: 'avg' },
  obp:     { label: 'OBP',   qualified: true,  format: 'rate', col: 'obp' },
  slg:     { label: 'SLG',   qualified: true,  format: 'rate', col: 'slg' },
  iso:     { label: 'ISO',   qualified: true,  format: 'rate', col: 'iso' },
  xbh_pct: { label: 'XBH%',  qualified: true,  format: 'pct',  col: 'xbh_pct' },
  hr:      { label: 'HR',    qualified: false, format: 'int',  col: 'hr' },
  tb:      { label: 'TB',    qualified: false, format: 'int',  col: 'tb' },
  hits:    { label: 'Hits',  qualified: false, format: 'int',  col: 'hits' },
  doubles: { label: '2B',    qualified: false, format: 'int',  col: 'doubles' },
  triples: { label: '3B',    qualified: false, format: 'int',  col: 'triples' },
  ab:      { label: 'AB',    qualified: false, format: 'int',  col: 'ab' },
}

const TOP_N = 10
const CAREER_MIN_AB = 30

// ---------- Helpers ----------------------------------------------------------

function fmtStat(key: StatKey, value: number): string {
  const { format } = STAT_CONFIG[key]
  if (format === 'rate') return fmt3(value)
  if (format === 'pct') return fmtPct(value)
  return String(value)
}

function qualifiedThreshold(rows: { ab: number }[]): number {
  const maxAb = Math.max(...rows.map((r) => r.ab), 0)
  return Math.max(10, Math.floor(0.5 * maxAb))
}

// ---------- Leaderboard entry ------------------------------------------------

interface LeaderEntry {
  rank: number
  player_id: string
  name: string
  value: string
  ab: number
  is_regular: boolean
  dimmed: boolean
}

function buildLeaders(
  rows: (SeasonStatRow | CareerStatRow)[],
  stat: StatKey,
  isCareer: boolean,
): LeaderEntry[] {
  const cfg = STAT_CONFIG[stat]
  const minAb = isCareer ? CAREER_MIN_AB : qualifiedThreshold(rows)

  const sorted = [...rows].sort(
    (a, b) => (b[cfg.col as keyof typeof b] as number) - (a[cfg.col as keyof typeof a] as number),
  )

  const results: LeaderEntry[] = []
  let rank = 0
  let lastValue = ''

  for (const row of sorted.slice(0, cfg.qualified ? sorted.length : TOP_N)) {
    const raw = row[cfg.col as keyof typeof row] as number
    const value = fmtStat(stat, raw)
    const dimmed = cfg.qualified && row.ab < minAb

    rank++
    if (value !== lastValue) lastValue = value

    results.push({
      rank,
      player_id: 'player_id' in row ? row.player_id : '',
      name: row.name,
      value,
      ab: row.ab,
      is_regular: row.is_regular,
      dimmed,
    })

    if (results.filter((r) => !r.dimmed).length >= TOP_N) break
  }

  return results.slice(0, TOP_N)
}

// ---------- UI ---------------------------------------------------------------

function StatTabs({ stats, selected, season }: { stats: readonly StatKey[]; selected: StatKey; season: string }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
      {stats.map((s) => (
        <Link
          key={s}
          href={`/leaderboards?season=${season}&stat=${s}`}
          className={[
            'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors',
            s === selected
              ? 'bg-field-grass text-white'
              : 'bg-field-cream border border-field-line text-field-muted hover:text-field-ink',
          ].join(' ')}
        >
          {STAT_CONFIG[s].label}
        </Link>
      ))}
    </div>
  )
}

function LeaderTable({ entries, stat }: { entries: LeaderEntry[]; stat: StatKey }) {
  const cfg = STAT_CONFIG[stat]
  return (
    <div className="overflow-x-auto rounded-lg border border-field-line">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-field-cream/70 text-field-muted">
            <th className="w-8 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">{cfg.label}</th>
            <th className="px-3 py-2 text-right font-medium">AB</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.player_id}
              className={[
                'border-t border-field-line',
                i === 0 && !e.dimmed ? 'bg-field-gold/15' : 'even:bg-field-cream/30',
                e.dimmed ? 'opacity-40' : '',
              ].join(' ')}
            >
              <td className="px-3 py-2 text-right tabular text-field-muted">{e.dimmed ? '—' : e.rank}</td>
              <td className="px-3 py-2">
                <Link href={`/players/${e.player_id}`} className="font-medium text-field-ink hover:underline">
                  {e.name}
                </Link>
                {!e.is_regular && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-field-muted">ringer</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular font-semibold text-field-ink">{e.value}</td>
              <td className="px-3 py-2 text-right tabular text-field-muted">{e.ab}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-field-muted">
                No data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Page -------------------------------------------------------------

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: { season?: string; stat?: string }
}) {
  const seasons = await listSeasons()
  const current = await getCurrentSeason()
  const fallbackId = current?.id ?? seasons[0]?.id

  const isCareer = searchParams.season === 'all-time'
  const selectedSeasonId = isCareer
    ? 'all-time'
    : searchParams.season && seasons.some((s) => s.id === searchParams.season)
      ? searchParams.season
      : fallbackId ?? 'all-time'

  const rawStat = searchParams.stat ?? 'ops'
  const selectedStat: StatKey = (STAT_KEYS as readonly string[]).includes(rawStat)
    ? (rawStat as StatKey)
    : 'ops'

  const [seasonRows, careerRows] = await Promise.all([
    !isCareer && selectedSeasonId !== 'all-time' ? getSeasonStats(selectedSeasonId) : Promise.resolve([]),
    isCareer ? getCareerStats() : Promise.resolve([]),
  ])

  const rows = isCareer ? careerRows : seasonRows
  const entries = buildLeaders(rows, selectedStat, isCareer)

  const selectedLabel = isCareer
    ? 'All-time'
    : seasons.find((s) => s.id === selectedSeasonId)?.label ?? 'Season'

  const seasonParam = selectedSeasonId

  return (
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Leaderboards</h1>
        <p className="mt-1 text-sm text-field-muted">{selectedLabel}</p>
      </div>

      {/* Season picker */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/leaderboards?season=${s.id}&stat=${selectedStat}`}
            className={[
              'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors',
              s.id === selectedSeasonId
                ? 'bg-field-grass text-white'
                : 'bg-field-cream border border-field-line text-field-muted hover:text-field-ink',
            ].join(' ')}
          >
            {s.label}
          </Link>
        ))}
        <Link
          href={`/leaderboards?season=all-time&stat=${selectedStat}`}
          className={[
            'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors',
            isCareer
              ? 'bg-field-grass text-white'
              : 'bg-field-cream border border-field-line text-field-muted hover:text-field-ink',
          ].join(' ')}
        >
          All-time
        </Link>
      </div>

      {/* Stat picker */}
      <StatTabs stats={STAT_KEYS} selected={selectedStat} season={seasonParam} />

      {/* Table */}
      <LeaderTable entries={entries} stat={selectedStat} />

      <p className="text-xs text-field-muted">
        {STAT_CONFIG[selectedStat].qualified
          ? `Rate stats: players under the qualified threshold (≥ min AB for this season) are dimmed and sorted last. `
          : ''}
        House rules: OBP counts FC and divides by AB; OPS is AVG + SLG.
      </p>
    </div>
  )
}
