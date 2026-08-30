// Official season records (from the league/team records sheet). Source of truth
// for the per-season summary on the stats page — older seasons have no per-game
// rows in the DB, so these canonical totals fill that in, plus finish/placement.
//
// Win % is W / games played (draws count as games), matching the records sheet.

export type Term = 'Summer' | 'Fall'

export interface SeasonRecord {
  year: number
  term: Term
  w: number
  l: number
  d: number
  winPct: number
  rsPerG: number
  raPerG: number
  runDiff: number
  rankingPoints?: number
  finished: string // e.g. "1st", "T-1st", "2nd"
  champion?: boolean // won the league championship that season
}

export const SEASON_RECORDS: SeasonRecord[] = [
  { year: 2022, term: 'Summer', w: 9, l: 3, d: 0, winPct: 0.75, rsPerG: 14.2, raPerG: 9.8, runDiff: 52, rankingPoints: 17, finished: '2nd' },
  { year: 2023, term: 'Summer', w: 8, l: 3, d: 1, winPct: 0.667, rsPerG: 17.1, raPerG: 14.9, runDiff: 26, rankingPoints: 17, finished: '3rd' },
  { year: 2023, term: 'Fall', w: 6, l: 0, d: 1, winPct: 0.857, rsPerG: 26.6, raPerG: 10.7, runDiff: 111, rankingPoints: 13, finished: '2nd' },
  { year: 2024, term: 'Summer', w: 9, l: 2, d: 0, winPct: 0.818, rsPerG: 22.5, raPerG: 13.5, runDiff: 98, rankingPoints: 18, finished: 'T-1st', champion: true },
  { year: 2024, term: 'Fall', w: 7, l: 0, d: 0, winPct: 1.0, rsPerG: 29.0, raPerG: 10.9, runDiff: 127, rankingPoints: 14, finished: '1st', champion: true },
  { year: 2025, term: 'Summer', w: 13, l: 0, d: 0, winPct: 1.0, rsPerG: 21.8, raPerG: 10.1, runDiff: 153, rankingPoints: 26, finished: '1st', champion: true },
  { year: 2026, term: 'Summer', w: 7, l: 4, d: 1, winPct: 0.583, rsPerG: 14.8, raPerG: 14.3, runDiff: 6, finished: '5th' },
  // Next season is computed live from entered games until it's finalized here.
]

// Championship seasons, newest first.
export const CHAMPIONSHIPS: SeasonRecord[] = SEASON_RECORDS.filter((r) => r.champion).sort(
  (a, b) => b.year - a.year || (a.term === 'Fall' ? 1 : 0) - (b.term === 'Fall' ? 1 : 0),
)

export const isChampionSeason = (year: number, term: string): boolean =>
  SEASON_RECORDS.some((r) => r.year === year && r.term === term && r.champion)

// All-time totals across every season — the exact sum of SEASON_RECORDS above
// (2022 Summer → 2026 Summer): 59-12-3 over 74 games, 1472 RF / 899 RA.
export const ALL_TIME = {
  w: 59,
  l: 12,
  d: 3,
  winPct: 0.797,
  rsPerG: 19.9,
  raPerG: 12.1,
  runDiff: 573,
}

export function recordForSeason(year: number, term: string): SeasonRecord | undefined {
  return SEASON_RECORDS.find((r) => r.year === year && r.term === term)
}
