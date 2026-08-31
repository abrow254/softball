import {
  listSeasons,
  listPlayers,
  getSeasonSummary,
  getScoringProfile,
  getSeasonHighlights,
  getLineupSpotTotals,
  getSeasonWar,
  getCareerWar,
  listGames,
  getSeasonAwards,
  getRecords,
  getOpponentRecords,
} from '@/lib/db'
import { SEASON_RECORDS, ALL_TIME, recordForSeason } from '@/lib/seasonRecords'
import { gameResult } from '@/lib/types'

// Assembles every dataset the app computes into one JSON bundle, for download
// and downstream analysis. Composes the existing data-access layer — no new
// queries. Auth/RLS is enforced by the caller (the request-scoped client).
export async function getFullExport() {
  const [seasons, players, careers, records, opponents] = await Promise.all([
    listSeasons(),
    listPlayers(),
    getCareerWar(),
    getRecords(),
    getOpponentRecords(),
  ])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const seasonBlocks = await Promise.all(
    seasons.map(async (s) => {
      const [summary, scoringProfile, highlights, battingBySpot, playerRows, games, awardsRes] = await Promise.all([
        getSeasonSummary(s.id),
        getScoringProfile(s.id),
        getSeasonHighlights(s.id),
        getLineupSpotTotals(s.id),
        getSeasonWar(s.id),
        listGames(s.id),
        getSeasonAwards(s.id),
      ])
      const reg = recordForSeason(s.year, s.term)
      return {
        id: s.id,
        label: s.label,
        year: s.year,
        term: s.term,
        is_current: s.is_current,
        finished: reg?.finished ?? null,
        champion: reg?.champion ?? false,
        summary,
        scoringProfile,
        players: playerRows,
        games: games
          .filter((g) => !g.is_aggregate)
          .map((g) => ({
            date: g.game_date,
            opponent: g.opponent,
            our_runs: g.our_runs,
            opp_runs: g.opp_runs,
            result: g.is_forfeit ? (g.forfeit_won ? 'W' : 'L') : gameResult(g.our_runs, g.opp_runs),
            is_forfeit: g.is_forfeit,
            potgName: g.potg_player_id ? nameById.get(g.potg_player_id) ?? null : null,
          })),
        awards: awardsRes.awards,
        battingBySpot,
        highlights,
      }
    }),
  )

  return {
    exportedAt: new Date().toISOString(),
    team: 'The Softball Team',
    allTime: ALL_TIME,
    officialRecords: SEASON_RECORDS,
    seasons: seasonBlocks,
    careers,
    records,
    opponents,
  }
}
