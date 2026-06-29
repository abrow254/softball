// Row shapes for the six tables + the season_stats view + auth profile.
// These mirror supabase/migrations. Kept hand-written (no generated types) to
// stay dependency-light; if the schema grows, swap in `supabase gen types`.

export type { AtBatCode } from './codes'

export type Term = 'Summer' | 'Fall'
export type Role = 'admin' | 'viewer'

export interface Player {
  id: string
  name: string
  is_regular: boolean
  active: boolean
  created_at: string
}

export interface Season {
  id: string
  year: number
  term: Term
  label: string
  is_current: boolean
  created_at: string
}

export interface Game {
  id: string
  season_id: string
  game_date: string | null
  opponent: string | null
  our_runs: number | null
  opp_runs: number | null
  is_aggregate: boolean
  potg_player_id: string | null
  potg_score: number | null
  created_at: string
}

export interface Lineup {
  id: string
  game_id: string
  player_id: string
  batting_order: number | null
  starting_pos: string | null
}

export interface GamePlayerStats {
  id: string
  game_id: string
  player_id: string
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
}

export interface AtBat {
  id: string
  game_id: string
  player_id: string
  inning: number | null
  code: string | null
}

export interface Profile {
  id: string
  email: string | null
  role: Role
  created_at: string
}

// One row of the season_stats view: raw sums + house-formula derived stats.
export interface SeasonStatRow {
  season_id: string
  player_id: string
  name: string
  is_regular: boolean
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
  hits: number
  tb: number
  pa: number
  avg: number
  obp: number
  slg: number
  ops: number
  iso: number
  xbh_pct: number
}

// One row of the career_stats view: all-time totals across every season.
export type CareerTier = 'core' | 'regular' | 'ringer'

export interface CareerStatRow {
  player_id: string
  name: string
  is_regular: boolean
  tier: CareerTier
  gp: number
  seasons_played: number
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
  hits: number
  tb: number
  pa: number
  avg: number
  obp: number
  slg: number
  ops: number
  iso: number
  xbh_pct: number
}

// A season_stats row enriched with its season's label, for career timelines.
export interface PlayerSeasonRow extends SeasonStatRow {
  season_label: string
  year: number
  term: Term
}

// Derived game result for display only (never stored).
export type GameResult = 'W' | 'L' | 'D' | null

// ---- Lineup Lab --------------------------------------------------------------

export type Gender = 'M' | 'F'

export interface PlayerGameLog {
  player_id: string
  game_id: string
  game_date: string
  season_id: string
  hits: number
  ab: number
  avg: number
  slg: number
  ops: number
}

// Extended per-game line used by player profiles and box scores.
export interface PlayerGameLogEntry extends PlayerGameLog {
  singles: number
  doubles: number
  triples: number
  hr: number
  tb: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
  opponent: string | null
  is_potg: boolean
}

// One player's box-score line: counting stats + derived rate stats, for /games/[id].
export interface BoxScoreRow {
  player_id: string
  name: string
  is_regular: boolean
  batting_order: number | null
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
  k: number
  hits: number
  tb: number
  avg: number
  slg: number
  ops: number
  is_potg: boolean
}

// One player's season data enriched with recent form, for Lineup Lab.
export interface LineupLabPlayer {
  player_id: string
  name: string
  gender: Gender | null
  is_regular: boolean
  avg: number
  obp: number
  slg: number
  ops: number
  form: number[]      // last-6 game balanced-form values (0.5·OBP+0.5·SLG), oldest-first
  recentForm: number  // mean balanced-form of last-3 games; 0 if fewer than 1 game
}

export function gameResult(our: number | null, opp: number | null): GameResult {
  if (our == null || opp == null) return null
  if (our > opp) return 'W'
  if (our < opp) return 'L'
  return 'D'
}
