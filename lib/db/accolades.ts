import { createClient } from '@/lib/supabase/server'
import type { CareerStatRow } from '@/lib/types'
import { getSeasonAwards } from '@/lib/db/awards'
import { getRecords } from '@/lib/db/records'
import { getCareerStats } from '@/lib/db/career'
import { isChampionSeason } from '@/lib/seasonRecords'

// A player's "trophy case": season awards won, all-time leaderboard finishes,
// and single-game team records they hold. Aggregated across every season so the
// profile shows a career of honours, not just counting-stat milestones.

export interface SeasonAwardWon {
  season: string
  label: string
  emoji: string
  value: string
}

export interface AllTimeRank {
  label: string // e.g. "home runs"
  emoji: string
  rank: number // 1..3
  value: string
}

export interface GameRecordHeld {
  label: string // e.g. "Most hits, game"
  value: string
  shared: boolean // co-held with others
}

export interface PlayerAccolades {
  championships: string[] // season labels the player was part of, newest first
  seasonAwards: SeasonAwardWon[]
  allTimeRanks: AllTimeRank[]
  gameRecords: GameRecordHeld[]
}

const AWARD_EMOJI: Record<string, string> = {
  mvp: '🏅',
  batting_champ: '🎯',
  slugger: '💣',
  on_base: '🧲',
  xbh: '💥',
  ringer_mvp: '🎖️',
  most_improved: '📈',
  potg_award: '🐦',
}

// 1-based rank of value (highest = 1); only meaningful when value > 0.
function rankOf(value: number, all: number[]): number {
  return all.filter((v) => v > value).length + 1
}

export async function getPlayerAccolades(playerId: string): Promise<PlayerAccolades> {
  const supabase = createClient()
  const { data: seasonsData, error } = await supabase.from('seasons').select('id, label, year, term')
  if (error) throw new Error(error.message)
  const seasons = seasonsData ?? []
  const termRank = (t: string) => (t === 'Fall' ? 1 : 0)
  const champIds = seasons.filter((s) => isChampionSeason(s.year, s.term)).map((s) => s.id)

  const [awardsBySeasons, records, career, rosterRes] = await Promise.all([
    Promise.all(seasons.map((s) => getSeasonAwards(s.id))),
    getRecords(),
    getCareerStats(),
    champIds.length > 0
      ? supabase.from('season_roster').select('season_id').eq('player_id', playerId).in('season_id', champIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  // ---- Championships (played the season, by stats or roster) ----
  const rosterChampIds = new Set((rosterRes.data ?? []).map((r) => r.season_id as string))
  const championships: string[] = []
  seasons.forEach((s, i) => {
    if (!isChampionSeason(s.year, s.term)) return
    const played = awardsBySeasons[i].all.some((r) => r.player_id === playerId) || rosterChampIds.has(s.id)
    if (played) championships.push(s.label)
  })
  championships.sort((a, b) => {
    const sa = seasons.find((s) => s.label === a)
    const sb = seasons.find((s) => s.label === b)
    if (!sa || !sb) return 0
    return sb.year - sa.year || termRank(sb.term) - termRank(sa.term)
  })

  // ---- Season awards won ----
  const seasonAwards: SeasonAwardWon[] = []
  awardsBySeasons.forEach((res, i) => {
    const label = seasons[i].label
    for (const award of res.awards) {
      const win = award.winners.find((w) => w.player_id === playerId)
      if (win) {
        seasonAwards.push({
          season: label,
          label: award.label,
          emoji: AWARD_EMOJI[award.id] ?? '🏆',
          value: win.value,
        })
      }
    }
  })
  // Newest season first.
  seasonAwards.sort((a, b) => {
    const sa = seasons.find((s) => s.label === a.season)
    const sb = seasons.find((s) => s.label === b.season)
    if (!sa || !sb) return 0
    return sb.year - sa.year || termRank(sb.term) - termRank(sa.term)
  })

  // ---- All-time leaderboard finishes (top 3) ----
  const me = career.find((c) => c.player_id === playerId)
  const allTimeRanks: AllTimeRank[] = []
  if (me) {
    const countingCats: { key: keyof CareerStatRow; label: string; emoji: string }[] = [
      { key: 'hr', label: 'home runs', emoji: '💣' },
      { key: 'hits', label: 'hits', emoji: '🏏' },
      { key: 'rbi', label: 'RBI', emoji: '🏆' },
      { key: 'tb', label: 'total bases', emoji: '🧱' },
      { key: 'runs', label: 'runs', emoji: '🏃' },
      { key: 'gp', label: 'games played', emoji: '🎮' },
    ]
    for (const cat of countingCats) {
      const mine = me[cat.key] as number
      if (mine <= 0) continue
      const rank = rankOf(mine, career.map((c) => c[cat.key] as number))
      if (rank <= 3) allTimeRanks.push({ label: cat.label, emoji: cat.emoji, rank, value: String(mine) })
    }
    // Extra-base hits (2B + 3B + HR) — a computed counting category.
    const xbh = (c: CareerStatRow) => c.doubles + c.triples + c.hr
    const myXbh = xbh(me)
    if (myXbh > 0) {
      const rank = rankOf(myXbh, career.map(xbh))
      if (rank <= 3) allTimeRanks.push({ label: 'extra-base hits', emoji: '🧨', rank, value: String(myXbh) })
    }
    // Rate stats among the qualified career pool (>= 30 AB, matching All-Time page).
    const qualified = career.filter((c) => c.ab >= 30)
    if (me.ab >= 30) {
      const fmt3 = (n: number) => n.toFixed(3).replace(/^0/, '')
      const rateCats: { key: keyof CareerStatRow; label: string; emoji: string }[] = [
        { key: 'avg', label: 'average', emoji: '🎯' },
        { key: 'obp', label: 'on-base %', emoji: '🧲' },
        { key: 'slg', label: 'slugging', emoji: '💥' },
        { key: 'ops', label: 'OPS', emoji: '⚡' },
      ]
      for (const cat of rateCats) {
        const mine = me[cat.key] as number
        const rank = rankOf(mine, qualified.map((c) => c[cat.key] as number))
        if (rank <= 3) allTimeRanks.push({ label: cat.label, emoji: cat.emoji, rank, value: fmt3(mine) })
      }
    }
    // PotG (from the all-time leaderboard in records).
    const potgIdx = records.potgLeaders.findIndex((p) => p.player_id === playerId)
    if (potgIdx >= 0 && records.potgLeaders[potgIdx].wins > 0) {
      const wins = records.potgLeaders[potgIdx].wins
      const rank = records.potgLeaders.filter((p) => p.wins > wins).length + 1
      if (rank <= 3) allTimeRanks.push({ label: 'Player of the Game', emoji: '🐦', rank, value: String(wins) })
    }
  }
  allTimeRanks.sort((a, b) => a.rank - b.rank)

  // ---- Single-game team records held ----
  const gameRecords: GameRecordHeld[] = []
  for (const rec of records.singleGame) {
    if (rec.holders.some((h) => h.player_id === playerId)) {
      gameRecords.push({ label: rec.label, value: rec.display, shared: rec.holders.length > 1 })
    }
  }

  return { championships, seasonAwards, allTimeRanks, gameRecords }
}
