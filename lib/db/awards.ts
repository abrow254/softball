import { createClient } from '@/lib/supabase/server'
import type { SeasonStatRow, Season } from '@/lib/types'
import { fmt3 } from '@/lib/formulas'

// ---------- Types ------------------------------------------------------------

export interface AwardWinner {
  player_id: string
  name: string
  value: string    // formatted stat value
  statLine: string // supporting context (e.g. "12 AB, .417 OBP")
}

export interface SeasonAward {
  id: string
  label: string
  description: string
  winners: AwardWinner[]
}

// ---------- Eligibility ------------------------------------------------------

// "Qualified" = ab >= max(10, 0.5 × season max AB).
// Scales with season length so early-season boards don't crown 2-AB players.
function qualifiedThreshold(rows: SeasonStatRow[]): number {
  const maxAb = Math.max(...rows.map((r) => r.ab), 0)
  return Math.max(10, Math.floor(0.5 * maxAb))
}

// ---------- Award helpers ----------------------------------------------------

function bestOf(
  rows: SeasonStatRow[],
  key: keyof SeasonStatRow,
  fmtFn: (v: number) => string,
  contextFn: (r: SeasonStatRow) => string,
  tiebreaker?: keyof SeasonStatRow,
): AwardWinner[] {
  if (rows.length === 0) return []
  const sorted = [...rows].sort((a, b) => {
    const diff = (b[key] as number) - (a[key] as number)
    if (diff !== 0) return diff
    if (tiebreaker) return (b[tiebreaker] as number) - (a[tiebreaker] as number)
    return 0
  })
  const best = sorted[0]
  const winners = sorted.filter((r) => r[key] === best[key])
  return winners.map((r) => ({
    player_id: r.player_id,
    name: r.name,
    value: fmtFn(r[key] as number),
    statLine: contextFn(r),
  }))
}

// ---------- Main export ------------------------------------------------------

export interface SeasonAwardsResult {
  awards: SeasonAward[]
  qualified: SeasonStatRow[]  // rows that pass the eligibility threshold
  all: SeasonStatRow[]         // all rows for counting-stat awards
  season: Season | null
}

export async function getSeasonAwards(seasonId: string): Promise<SeasonAwardsResult> {
  const supabase = createClient()

  // Fetch season metadata, current season stats, all seasons, and PotG counts.
  const [ssRes, seasonsRes, potgRes] = await Promise.all([
    supabase.from('season_stats').select('*').eq('season_id', seasonId),
    supabase.from('seasons').select('*').order('year').order('term'),
    supabase
      .from('games')
      .select('potg_player_id')
      .eq('season_id', seasonId)
      .eq('is_aggregate', false)
      .not('potg_player_id', 'is', null),
  ])

  if (ssRes.error) throw new Error(ssRes.error.message)
  if (seasonsRes.error) throw new Error(seasonsRes.error.message)

  const allRows = (ssRes.data ?? []) as SeasonStatRow[]
  const seasons = (seasonsRes.data ?? []) as Season[]
  const season = seasons.find((s) => s.id === seasonId) ?? null

  if (allRows.length === 0) return { awards: [], qualified: [], all: [], season }

  const minAb = qualifiedThreshold(allRows)
  const qualified = allRows.filter((r) => r.ab >= minAb)

  // PotG wins per player
  const potgWins = new Map<string, number>()
  for (const g of potgRes.data ?? []) {
    if (g.potg_player_id) {
      potgWins.set(g.potg_player_id, (potgWins.get(g.potg_player_id) ?? 0) + 1)
    }
  }

  // Most Improved: compare current season OPS to the player's immediately prior season.
  // Only qualified players in BOTH seasons are eligible.
  const currentSeasonIdx = seasons.findIndex((s) => s.id === seasonId)
  let improvedWinners: AwardWinner[] = []

  if (currentSeasonIdx > 0 && qualified.length > 0) {
    const qualifiedIds = new Set(qualified.map((r) => r.player_id))
    const priorSeasonIds = seasons
      .slice(0, currentSeasonIdx)
      .map((s) => s.id)

    if (priorSeasonIds.length > 0) {
      const priorRes = await supabase
        .from('season_stats')
        .select('player_id, season_id, ab, ops')
        .in('player_id', [...qualifiedIds])
        .in('season_id', priorSeasonIds)

      if (!priorRes.error && priorRes.data) {
        // For each player, find the most recent prior season (latest in priorSeasonIds order).
        const byPlayer = new Map<string, { season_idx: number; ab: number; ops: number }>()
        for (const row of priorRes.data) {
          const idx = priorSeasonIds.indexOf(row.season_id)
          if (idx === -1) continue
          const existing = byPlayer.get(row.player_id)
          if (!existing || idx > existing.season_idx) {
            byPlayer.set(row.player_id, { season_idx: idx, ab: row.ab, ops: Number(row.ops) })
          }
        }

        // Compute OPS delta for players who appear in both seasons with enough AB.
        const priorMinAb = 10
        const deltas: Array<{ player_id: string; name: string; delta: number; currOps: number }> = []
        for (const curr of qualified) {
          const prior = byPlayer.get(curr.player_id)
          if (!prior || prior.ab < priorMinAb) continue
          deltas.push({
            player_id: curr.player_id,
            name: curr.name,
            delta: curr.ops - prior.ops,
            currOps: curr.ops,
          })
        }

        if (deltas.length > 0) {
          deltas.sort((a, b) => b.delta - a.delta || b.currOps - a.currOps)
          const best = deltas[0]
          if (best.delta > 0) {
            improvedWinners = [
              {
                player_id: best.player_id,
                name: best.name,
                value: `+${fmt3(best.delta)}`,
                statLine: `${fmt3(best.currOps)} OPS this season`,
              },
            ]
          }
        }
      }
    }
  }

  // PotG season award
  let potgAwardWinners: AwardWinner[] = []
  if (potgWins.size > 0) {
    const potgRows = [...potgWins.entries()].map(([pid, wins]) => {
      const row = allRows.find((r) => r.player_id === pid)
      return { player_id: pid, name: row?.name ?? '—', wins }
    })
    potgRows.sort((a, b) => b.wins - a.wins)
    const maxWins = potgRows[0].wins
    potgAwardWinners = potgRows
      .filter((r) => r.wins === maxWins)
      .map((r) => ({
        player_id: r.player_id,
        name: r.name,
        value: `${r.wins}`,
        statLine: `${r.wins} game${r.wins === 1 ? '' : 's'}`,
      }))
  }

  // Ringer MVP: best OPS among non-regulars with ab >= 6
  const ringers = allRows.filter((r) => !r.is_regular && r.ab >= 6)

  const awards: SeasonAward[] = [
    {
      id: 'mvp',
      label: 'MVP',
      description: 'Best OPS among qualified hitters',
      winners: bestOf(
        qualified,
        'ops',
        fmt3,
        (r) => `${fmt3(r.avg)} AVG, ${r.ab} AB`,
        'obp',
      ),
    },
    {
      id: 'batting_champ',
      label: 'Batting Champ',
      description: 'Best batting average among qualified hitters',
      winners: bestOf(
        qualified,
        'avg',
        fmt3,
        (r) => `${r.hits} H, ${r.ab} AB`,
        'obp',
      ),
    },
    {
      id: 'slugger',
      label: 'Slugger',
      description: 'Most home runs',
      winners: bestOf(
        allRows.filter((r) => r.hr > 0),
        'hr',
        (v) => String(v),
        (r) => `${r.tb} TB, ${fmt3(r.slg)} SLG`,
        'tb',
      ),
    },
    {
      id: 'on_base',
      label: 'On-Base Machine',
      description: 'Best on-base percentage among qualified hitters',
      winners: bestOf(
        qualified,
        'obp',
        fmt3,
        (r) => `${r.hits + r.fc} on-base, ${r.ab} AB`,
        'avg',
      ),
    },
    {
      id: 'xbh',
      label: 'Extra-Base King/Queen',
      description: 'Most extra-base hits (2B + 3B + HR)',
      winners: bestOf(
        allRows.filter((r) => r.doubles + r.triples + r.hr > 0),
        'doubles',  // we compute XBH below
        (v) => String(v),
        (r) => `${r.doubles} 2B, ${r.triples} 3B, ${r.hr} HR`,
        'tb',
      ),
    },
    ...(ringers.length > 0
      ? [
          {
            id: 'ringer_mvp',
            label: 'Ringer MVP',
            description: 'Best OPS among guest players (min 6 AB)',
            winners: bestOf(
              ringers,
              'ops',
              fmt3,
              (r) => `${fmt3(r.avg)} AVG, ${r.ab} AB`,
              'obp',
            ),
          },
        ]
      : []),
    ...(improvedWinners.length > 0
      ? [
          {
            id: 'most_improved',
            label: 'Most Improved',
            description: 'Largest OPS gain vs their own prior season',
            winners: improvedWinners,
          },
        ]
      : []),
    ...(potgAwardWinners.length > 0
      ? [
          {
            id: 'potg_award',
            label: 'Player of the Game Award',
            description: 'Most Player of the Game honours this season',
            winners: potgAwardWinners,
          },
        ]
      : []),
  ]

  // Fix XBH: we used 'doubles' as a placeholder above but the real metric is
  // doubles + triples + hr. Re-sort and reformat the XBH award in-place.
  const xbhAward = awards.find((a) => a.id === 'xbh')
  if (xbhAward) {
    const xbhRows = allRows
      .map((r) => ({ ...r, xbh: r.doubles + r.triples + r.hr }))
      .filter((r) => r.xbh > 0)
      .sort((a, b) => b.xbh - a.xbh || b.tb - a.tb)
    const maxXbh = xbhRows[0]?.xbh ?? 0
    xbhAward.winners = xbhRows
      .filter((r) => r.xbh === maxXbh)
      .map((r) => ({
        player_id: r.player_id,
        name: r.name,
        value: String(r.xbh),
        statLine: `${r.doubles} 2B, ${r.triples} 3B, ${r.hr} HR`,
      }))
  }

  return { awards, qualified, all: allRows, season }
}
