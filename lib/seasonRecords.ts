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
  rankingPoints: number
  finished: string // e.g. "1st", "T-1st", "2nd"
}

export const SEASON_RECORDS: SeasonRecord[] = [
  { year: 2022, term: 'Summer', w: 9, l: 3, d: 0, winPct: 0.75, rsPerG: 14.2, raPerG: 9.8, runDiff: 52, rankingPoints: 17, finished: '2nd' },
  { year: 2023, term: 'Summer', w: 8, l: 3, d: 1, winPct: 0.667, rsPerG: 17.1, raPerG: 14.9, runDiff: 26, rankingPoints: 17, finished: '3rd' },
  { year: 2023, term: 'Fall', w: 6, l: 0, d: 1, winPct: 0.857, rsPerG: 26.6, raPerG: 10.7, runDiff: 111, rankingPoints: 13, finished: '2nd' },
  { year: 2024, term: 'Summer', w: 9, l: 2, d: 0, winPct: 0.818, rsPerG: 22.5, raPerG: 13.5, runDiff: 98, rankingPoints: 18, finished: 'T-1st' },
  { year: 2024, term: 'Fall', w: 7, l: 0, d: 0, winPct: 1.0, rsPerG: 29.0, raPerG: 10.9, runDiff: 127, rankingPoints: 14, finished: '1st' },
  { year: 2025, term: 'Summer', w: 13, l: 0, d: 0, winPct: 1.0, rsPerG: 21.8, raPerG: 10.1, runDiff: 153, rankingPoints: 26, finished: '1st' },
  // The current season (2026 Summer) is computed live from entered games.
]

// All-time totals across every season (for the All-Time page, if wanted).
export const ALL_TIME = {
  w: 52,
  l: 10,
  d: 2,
  winPct: 0.813,
  rsPerG: 22.7,
  raPerG: 15.0,
  runDiff: 546,
}

export function recordForSeason(year: number, term: string): SeasonRecord | undefined {
  return SEASON_RECORDS.find((r) => r.year === year && r.term === term)
}
