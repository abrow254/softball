// Player-of-the-Game scoring. Single source of truth reused by the finalize
// path, backfill, box scores, and the PotG award.

export const POTG_WEIGHTS = {
  W_HIT: 1.0,  // reward for each hit
  W_ONB: 0.5,  // reward for each BB / HBP / FC (on-base without a hit)
  W_OUT: 0.5,  // penalty per out made (AB that aren't H or FC)
  W_RBI: 1.0,  // reward per RBI
  W_RUN: 0.5,  // reward per run scored
} as const

export interface PotGLine {
  player_id: string
  name: string
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
}

// Pure function: score a single player's game line.
// RBI and runs default to 0 in the DB when untracked, so they never penalise.
export function gameScore(line: Omit<PotGLine, 'player_id' | 'name'>): number {
  const { W_HIT, W_ONB, W_OUT, W_RBI, W_RUN } = POTG_WEIGHTS
  const h = line.singles + line.doubles + line.triples + line.hr
  const tb = line.singles + 2 * line.doubles + 3 * line.triples + 4 * line.hr
  const outs = Math.max(0, line.ab - h - line.fc)
  return (
    tb +
    W_HIT * h +
    W_ONB * (line.bb + line.hbp + line.fc) -
    W_OUT * outs +
    W_RBI * line.rbi +
    W_RUN * line.runs
  )
}

export interface PotGResult {
  winnerId: string | null
  winnerName: string | null
  coWinnerIds: string[]
  score: number | null
}

// Select the PotG winner from per-game stat lines.
// Eligible = ab >= 1. Tiebreak: score desc → TB desc → OUTS asc → H desc → name asc.
// Returns co-winners only when all five tiebreakers are identical (same name too,
// which is theoretically possible for two players with the same display name).
export function selectPotG(lines: PotGLine[]): PotGResult {
  const eligible = lines.filter((l) => l.ab >= 1)
  if (eligible.length === 0) return { winnerId: null, winnerName: null, coWinnerIds: [], score: null }

  const scored = eligible.map((l) => {
    const h = l.singles + l.doubles + l.triples + l.hr
    const tb = l.singles + 2 * l.doubles + 3 * l.triples + 4 * l.hr
    const outs = Math.max(0, l.ab - h - l.fc)
    return { ...l, h, tb, outs, score: gameScore(l) }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.tb !== a.tb) return b.tb - a.tb
    if (a.outs !== b.outs) return a.outs - b.outs
    if (b.h !== a.h) return b.h - a.h
    return a.name.localeCompare(b.name)
  })

  const best = scored[0]
  // Co-winners: fully tied on every tiebreaker including name
  const tied = scored.filter(
    (s) =>
      s.score === best.score &&
      s.tb === best.tb &&
      s.outs === best.outs &&
      s.h === best.h &&
      s.name === best.name,
  )

  return {
    winnerId: best.player_id,
    winnerName: best.name,
    coWinnerIds: tied.length > 1 ? tied.map((t) => t.player_id) : [best.player_id],
    score: best.score,
  }
}

// Short one-line performance summary: "2-for-3, HR, 3 TB"
export function formatPotGLine(line: Omit<PotGLine, 'player_id' | 'name'>): string {
  const h = line.singles + line.doubles + line.triples + line.hr
  const tb = line.singles + 2 * line.doubles + 3 * line.triples + 4 * line.hr
  const parts: string[] = [`${h}-for-${line.ab}`]
  if (line.hr > 0) parts.push(line.hr > 1 ? `${line.hr} HR` : 'HR')
  else if (line.triples > 0) parts.push(line.triples > 1 ? `${line.triples} 3B` : '3B')
  else if (line.doubles > 0) parts.push(line.doubles > 1 ? `${line.doubles} 2B` : '2B')
  if (tb > 0) parts.push(`${tb} TB`)
  return parts.join(', ')
}
