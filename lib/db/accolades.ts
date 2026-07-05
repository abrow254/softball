import { createClient } from '@/lib/supabase/server'
import type { CareerStatRow } from '@/lib/types'
import { getSeasonAwards } from '@/lib/db/awards'
import { getRecords } from '@/lib/db/records'
import { getCareerStats } from '@/lib/db/career'

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

  const [awardsBySeasons, records, career] = await Promise.all([
    Promise.all(seasons.map((s) => getSeasonAwards(s.id))),
    getRecords(),
    getCareerStats(),
  ])

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
    ]
    for (const cat of countingCats) {
      const mine = me[cat.key] as number
      if (mine <= 0) continue
      const rank = rankOf(mine, career.map((c) => c[cat.key] as number))
      if (rank <= 3) allTimeRanks.push({ label: cat.label, emoji: cat.emoji, rank, value: String(mine) })
    }
    // Rate stat (OPS) among the qualified career pool (>= 30 AB, matching All-Time page).
    const qualified = career.filter((c) => c.ab >= 30)
    if (me.ab >= 30) {
      const rank = rankOf(me.ops, qualified.map((c) => c.ops))
      if (rank <= 3) allTimeRanks.push({ label: 'OPS', emoji: '⚡', rank, value: me.ops.toFixed(3).replace(/^0/, '') })
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

  return { seasonAwards, allTimeRanks, gameRecords }
}
