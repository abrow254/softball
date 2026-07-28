import type { Col } from '@/components/StatTable'
import type { SeasonStatRow, CareerStatRow, PlayerSeasonRow } from '@/lib/types'

// Season grid. (GP, PA, K, RBI, BB, OPS, R intentionally omitted per team pref.)
export const SEASON_COLS: Col<SeasonStatRow>[] = [
  { key: 'name', label: 'Player', kind: 'text' },
  { key: 'ab', label: 'AB', kind: 'int', title: 'At-bats' },
  { key: 'hits', label: 'H', kind: 'int', title: 'Hits' },
  { key: 'singles', label: '1B', kind: 'int', hideOnMobile: true },
  { key: 'doubles', label: '2B', kind: 'int', hideOnMobile: true },
  { key: 'triples', label: '3B', kind: 'int', hideOnMobile: true },
  { key: 'hr', label: 'HR', kind: 'int' },
  { key: 'tb', label: 'TB', kind: 'int', title: 'Total bases' },
  { key: 'avg', label: 'AVG', kind: 'rate', title: 'hits / ab' },
  { key: 'obp', label: 'OBP', kind: 'rate', title: 'House rule: (hits + fc) / ab' },
  { key: 'slg', label: 'SLG', kind: 'rate', title: 'tb / ab' },
  { key: 'iso', label: 'ISO', kind: 'rate', title: 'slg - avg', hideOnMobile: true },
  { key: 'xbh_pct', label: 'XBH%', kind: 'pct', title: '(2B + 3B + HR) / hits', hideOnMobile: true },
  { key: 'war', label: 'bWAR', kind: 'war', title: 'Batting WAR — offense-only wins above a replacement hitter, scaled to our run environment' },
]

// All-time leaderboard.
export const CAREER_COLS: Col<CareerStatRow>[] = [
  { key: 'name', label: 'Player', kind: 'text' },
  { key: 'seasons_played', label: 'Sea', kind: 'int', title: 'Seasons played' },
  { key: 'ab', label: 'AB', kind: 'int', title: 'At-bats' },
  { key: 'hits', label: 'H', kind: 'int', title: 'Hits' },
  { key: 'singles', label: '1B', kind: 'int', hideOnMobile: true },
  { key: 'doubles', label: '2B', kind: 'int', hideOnMobile: true },
  { key: 'triples', label: '3B', kind: 'int', hideOnMobile: true },
  { key: 'hr', label: 'HR', kind: 'int' },
  { key: 'tb', label: 'TB', kind: 'int', title: 'Total bases' },
  { key: 'avg', label: 'AVG', kind: 'rate', title: 'hits / ab' },
  { key: 'obp', label: 'OBP', kind: 'rate', title: 'House rule: (hits + fc) / ab' },
  { key: 'slg', label: 'SLG', kind: 'rate', title: 'tb / ab' },
  { key: 'iso', label: 'ISO', kind: 'rate', title: 'slg - avg', hideOnMobile: true },
  { key: 'xbh_pct', label: 'XBH%', kind: 'pct', title: '(2B + 3B + HR) / hits', hideOnMobile: true },
  { key: 'war', label: 'bWAR', kind: 'war', title: 'Batting WAR — offense-only wins above a replacement hitter, scaled to our run environment' },
]

// Player career page: season-by-season (first column is the season label).
export const PLAYER_SEASON_COLS: Col<PlayerSeasonRow>[] = [
  { key: 'season_label', label: 'Season', kind: 'text' },
  { key: 'ab', label: 'AB', kind: 'int', title: 'At-bats' },
  { key: 'hits', label: 'H', kind: 'int', title: 'Hits' },
  { key: 'singles', label: '1B', kind: 'int', hideOnMobile: true },
  { key: 'doubles', label: '2B', kind: 'int', hideOnMobile: true },
  { key: 'triples', label: '3B', kind: 'int', hideOnMobile: true },
  { key: 'hr', label: 'HR', kind: 'int' },
  { key: 'tb', label: 'TB', kind: 'int', title: 'Total bases' },
  { key: 'avg', label: 'AVG', kind: 'rate', title: 'hits / ab' },
  { key: 'obp', label: 'OBP', kind: 'rate', title: 'House rule: (hits + fc) / ab' },
  { key: 'slg', label: 'SLG', kind: 'rate', title: 'tb / ab' },
  { key: 'iso', label: 'ISO', kind: 'rate', title: 'slg - avg', hideOnMobile: true },
  { key: 'xbh_pct', label: 'XBH%', kind: 'pct', title: '(2B + 3B + HR) / hits', hideOnMobile: true },
  { key: 'war', label: 'bWAR', kind: 'war', title: 'Batting WAR — offense-only wins above a replacement hitter, scaled to our run environment' },
]
