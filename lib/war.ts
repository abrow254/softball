// Batting WAR (bWAR) — an OFFENSE-ONLY wins-above-replacement estimate.
//
// The app tracks no fielding or baserunning outcomes, so this is not real WAR;
// it measures runs a hitter added above a replacement-level hitter, using the
// house batting line, then converts runs to wins with the team's actual (very
// high) run environment. Inputs mirror the house rules in lib/formulas.ts:
// on-base counts FC, and walks are excluded (you pitch to your own team).
//
// bWAR is a COUNTING metric — it accumulates with playing time — so a strong
// full-season regular outranks a high-rate cameo. Over a ~12-game season,
// values land roughly in the -1..+3 range; that's honest for the sample.

import { qualifiedThreshold } from '@/lib/db/eligibility'

export const WAR_CONFIG = {
  // Replacement hitter produces this fraction of league-average offense per AB.
  replacementFactor: 0.8,
}

export interface WarLine {
  ab: number
  hits: number
  tb: number
  fc: number
  hbp: number
  roe: number
}

export interface WarResult {
  rc: number // house runs created
  rar: number // runs above replacement
  war: number // rar / runs-per-win
}

export interface RunEnv {
  rsPerG: number
  raPerG: number
}

// House Runs Created (Bill James basic RC, adapted to house rules): times on
// base × total bases / at-bats. FC counts as reaching (house OBP rule); HBP/ROE
// are added when tracked (they default to 0 otherwise). AB=0 → 0.
export function houseRunsCreated(l: WarLine): number {
  if (l.ab <= 0) return 0
  const tob = l.hits + l.fc + l.hbp + l.roe
  return (tob * l.tb) / l.ab
}

// Runs per win from the run environment (Tango approximation). rsPerG+raPerG is
// total runs per game by both sides; in this ~38 runs/game league RPW ≈ 20.
export function runsPerWin(env: RunEnv): number {
  const rpg = Math.max(1, env.rsPerG + env.raPerG)
  return 1.5 * Math.pow(rpg, 0.72)
}

// Compute bWAR for every row, using the qualified pool to set league-average
// and replacement baselines. `war` is produced for all rows (including low-AB
// ones, which land near/below 0 by construction).
export function computeWar(
  rows: Array<{ player_id: string } & WarLine>,
  env: RunEnv,
): Map<string, WarResult> {
  const out = new Map<string, WarResult>()
  if (rows.length === 0) return out

  // League baseline over the qualified pool (reuse the awards/records rule).
  const minAb = qualifiedThreshold(rows)
  const pool = rows.filter((r) => r.ab >= minAb)
  let poolRc = 0
  let poolAb = 0
  for (const r of pool) {
    poolRc += houseRunsCreated(r)
    poolAb += r.ab
  }
  const avgRunsPerAb = poolAb > 0 ? poolRc / poolAb : 0
  const replRunsPerAb = WAR_CONFIG.replacementFactor * avgRunsPerAb
  const rpw = runsPerWin(env)

  for (const r of rows) {
    const rc = houseRunsCreated(r)
    const rar = rc - replRunsPerAb * r.ab
    out.set(r.player_id, { rc, rar, war: rpw > 0 ? rar / rpw : 0 })
  }
  return out
}
