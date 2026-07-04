// MMF-aware batting-order optimizer.
//
// Slot-value model: value(player, slot) = w × (a × obp + b × slg)
// where w, a, b come from SLOT_CONFIGS.
//
// MMF constraint (cyclic): no 3 consecutive males in the batting order, with
// the wrap from the last batter back to the first batter counting.
//
// Feasibility guard: a legal cyclic order exists iff males ≤ 2 × females.
// (Null-gender players are counted as females for this constraint.)
//
// Algorithm:
//   n ≤ 8  — brute-force all permutations (≤40 320), keep best legal.
//   n > 8  — enumerate valid cyclic gender patterns; for each, solve the
//            player→slot assignment EXACTLY per gender group (bitmask DP over
//            slotValue), so the OBP/SLG slot blends drive who lands where.
//            Best across all patterns is the global optimum.

import { FIELDING_POSITIONS } from '@/lib/positions'

export interface SlotConfig {
  role: string
  w: number  // importance weight
  a: number  // OBP emphasis
  b: number  // SLG emphasis
}

// Slots 1–5 keep the spec's leverage stances (best hitter 2nd, de-weighted
// 3-hole, SLG-heavy cleanup — per The Book). Slots 6+ decline gently: in a
// 7-inning cycling lineup the real cost of a lower slot is just fewer PAs
// (~25% from top to 11th), so steep weights would exaggerate lineup-score
// deltas without changing the order's shape.
const BASE_SLOTS: SlotConfig[] = [
  { role: 'Leadoff', w: 1.00, a: 0.65, b: 0.35 },
  { role: '2-hole',  w: 1.05, a: 0.58, b: 0.42 },
  { role: '3-hole',  w: 0.80, a: 0.50, b: 0.50 },
  { role: 'Cleanup', w: 1.00, a: 0.40, b: 0.60 },
  { role: '5-hole',  w: 0.90, a: 0.45, b: 0.55 },
  { role: '6-hole',  w: 0.88, a: 0.55, b: 0.45 },
  { role: '7-hole',  w: 0.84, a: 0.50, b: 0.50 },
  { role: '8-hole',  w: 0.80, a: 0.50, b: 0.50 },
]

// Extended weights for slots 9+ — PA-proportional gentle decline.
const EXTENDED_WEIGHTS = [0.76, 0.72, 0.68, 0.65, 0.62, 0.59, 0.56, 0.53]

export function getSlotConfigs(n: number): SlotConfig[] {
  return Array.from({ length: n }, (_, i) => {
    if (i < BASE_SLOTS.length) return BASE_SLOTS[i]
    const extIdx = i - BASE_SLOTS.length
    const w =
      extIdx < EXTENDED_WEIGHTS.length
        ? EXTENDED_WEIGHTS[extIdx]
        : Math.max(0.50, 0.53 - 0.03 * (extIdx - EXTENDED_WEIGHTS.length + 1))
    return { role: `${i + 1}-hole`, w, a: 0.50, b: 0.50 }
  })
}

export function slotValue(obp: number, slg: number, slot: SlotConfig): number {
  return slot.w * (slot.a * obp + slot.b * slg)
}

export function calcLineupScore(
  order: Array<{ obp: number; slg: number }>,
  slots: SlotConfig[],
): number {
  return order.reduce((sum, p, i) => sum + slotValue(p.obp, p.slg, slots[i]), 0)
}

// Returns slot indices that are part of a 3-consecutive-male violation (cyclic).
export function checkMMFViolations(genders: (string | null)[]): number[] {
  const n = genders.length
  const flagged = new Set<number>()
  for (let i = 0; i < n; i++) {
    if (
      genders[i] === 'M' &&
      genders[(i + 1) % n] === 'M' &&
      genders[(i + 2) % n] === 'M'
    ) {
      flagged.add(i)
      flagged.add((i + 1) % n)
      flagged.add((i + 2) % n)
    }
  }
  return [...flagged].sort((a, b) => a - b)
}

// A legal cyclic order exists iff males ≤ 2 × non-males (F + null).
export function isFeasible(males: number, nonMales: number): boolean {
  return males <= 2 * nonMales
}

export interface OptimizerInput {
  player_id: string
  gender: 'M' | 'F' | null
  obp: number
  slg: number
  ops: number  // display/reference; assignment is driven by obp+slg slot blends
}

export interface OptimizeResult {
  order: string[]  // player_ids in optimized order
  score: number
  feasible: boolean
}

export function optimize(players: OptimizerInput[]): OptimizeResult {
  const n = players.length
  if (n === 0) return { order: [], score: 0, feasible: true }

  const males = players.filter((p) => p.gender === 'M').length
  const nonMales = n - males  // F + null

  if (!isFeasible(males, nonMales)) {
    return { order: players.map((p) => p.player_id), score: 0, feasible: false }
  }

  const slots = getSlotConfigs(n)
  return n <= 8 ? bruteForce(players, slots) : patternOptimize(players, slots)
}

// ---- Brute force (n ≤ 8) --------------------------------------------------------

function bruteForce(players: OptimizerInput[], slots: SlotConfig[]): OptimizeResult {
  const n = players.length
  const indices = Array.from({ length: n }, (_, i) => i)
  let bestScore = -Infinity
  let bestPerm: number[] | null = null

  function permute(arr: number[], start: number) {
    if (start === n) {
      const genders = arr.map((i) => players[i].gender)
      if (checkMMFViolations(genders).length === 0) {
        const score = arr.reduce(
          (s, pi, si) => s + slotValue(players[pi].obp, players[pi].slg, slots[si]),
          0,
        )
        if (score > bestScore) {
          bestScore = score
          bestPerm = [...arr]
        }
      }
      return
    }
    for (let i = start; i < n; i++) {
      ;[arr[start], arr[i]] = [arr[i], arr[start]]
      permute(arr, start + 1)
      ;[arr[start], arr[i]] = [arr[i], arr[start]]
    }
  }

  permute(indices, 0)

  if (!bestPerm) {
    // isFeasible passed but still no legal perm (rare with null genders)
    return { order: players.map((p) => p.player_id), score: 0, feasible: false }
  }

  const perm = bestPerm as number[]
  return {
    order: perm.map((i) => players[i].player_id),
    score: bestScore,
    feasible: true,
  }
}

// ---- Exact pattern-based (n > 8) --------------------------------------------------
// 1. Enumerate valid cyclic gender patterns for the given male/non-male counts.
// 2. For each pattern, solve the player→slot assignment exactly per gender
//    group with a bitmask DP maximizing summed slotValue — so the per-slot
//    OBP/SLG blends (not just overall OPS rank) decide who bats where.
// 3. Keep the best pattern. Since patterns cover every legal gender layout and
//    the DP is optimal within a pattern, the result is the global optimum.

function popcount(x: number): number {
  let c = 0
  while (x) {
    x &= x - 1
    c++
  }
  return c
}

// Optimal assignment of a group's players to that group's slots (both length k)
// maximizing summed slotValue. O(2^k · k) — trivial for rec-roster group sizes.
function assignGroupOptimal(
  playerIdxs: number[],
  slotIdxs: number[],
  players: OptimizerInput[],
  slots: SlotConfig[],
): { value: number; bySlot: Map<number, number> } {
  const k = playerIdxs.length
  const size = 1 << k
  const dp = new Float64Array(size).fill(-Infinity)
  const choice = new Int32Array(size).fill(-1)
  dp[0] = 0

  for (let mask = 1; mask < size; mask++) {
    const slot = slots[slotIdxs[popcount(mask) - 1]]
    for (let p = 0; p < k; p++) {
      if (!(mask & (1 << p))) continue
      const prev = dp[mask ^ (1 << p)]
      if (prev === -Infinity) continue
      const pl = players[playerIdxs[p]]
      const v = prev + slotValue(pl.obp, pl.slg, slot)
      if (v > dp[mask]) {
        dp[mask] = v
        choice[mask] = p
      }
    }
  }

  const bySlot = new Map<number, number>()
  let mask = size - 1
  while (mask > 0) {
    const p = choice[mask]
    bySlot.set(slotIdxs[popcount(mask) - 1], playerIdxs[p])
    mask ^= 1 << p
  }
  return { value: k === 0 ? 0 : dp[size - 1], bySlot }
}

function patternOptimize(players: OptimizerInput[], slots: SlotConfig[]): OptimizeResult {
  const n = players.length
  const maleIdxs = players.map((_, i) => i).filter((i) => players[i].gender === 'M')
  const nonMaleIdxs = players.map((_, i) => i).filter((i) => players[i].gender !== 'M')

  let bestScore = -Infinity
  let bestOrder: number[] | null = null

  for (const pattern of generateGenderPatterns(n, maleIdxs.length, nonMaleIdxs.length)) {
    // pattern[i]: 1 = male slot, 0 = non-male slot
    const maleSlotIdxs: number[] = []
    const nonMaleSlotIdxs: number[] = []
    pattern.forEach((g, i) => (g === 1 ? maleSlotIdxs : nonMaleSlotIdxs).push(i))

    const m = assignGroupOptimal(maleIdxs, maleSlotIdxs, players, slots)
    const f = assignGroupOptimal(nonMaleIdxs, nonMaleSlotIdxs, players, slots)
    const score = m.value + f.value

    if (score > bestScore) {
      const assignment = new Array<number>(n).fill(-1)
      for (const [si, pi] of m.bySlot) assignment[si] = pi
      for (const [si, pi] of f.bySlot) assignment[si] = pi
      bestScore = score
      bestOrder = assignment
    }
  }

  if (!bestOrder) {
    return { order: players.map((p) => p.player_id), score: 0, feasible: false }
  }

  return {
    order: bestOrder.map((i) => players[i].player_id),
    score: bestScore,
    feasible: true,
  }
}

// Generates all valid cyclic gender sequences of length n with `males` 1s and
// `nonMales` 0s, where no 3 consecutive values are 1 (checked cyclically).
// The linear generation prunes 3-in-a-row eagerly; the cyclic wrap is verified
// at the leaf.
function* generateGenderPatterns(
  n: number,
  males: number,
  nonMales: number,
): Generator<number[]> {
  const pattern: number[] = []

  function* gen(
    remaining: number,
    mLeft: number,
    fLeft: number,
    consec: number,
  ): Generator<number[]> {
    if (remaining === 0) {
      if (isCyclicLegal(pattern)) yield [...pattern]
      return
    }
    // Place a male (only if fewer than 2 consecutive so far)
    if (mLeft > 0 && consec < 2) {
      pattern.push(1)
      yield* gen(remaining - 1, mLeft - 1, fLeft, consec + 1)
      pattern.pop()
    }
    // Place a non-male
    if (fLeft > 0) {
      pattern.push(0)
      yield* gen(remaining - 1, mLeft, fLeft - 1, 0)
      pattern.pop()
    }
  }

  yield* gen(n, males, nonMales, 0)
}

function isCyclicLegal(pattern: number[]): boolean {
  const n = pattern.length
  for (let i = 0; i < n; i++) {
    if (
      pattern[i] === 1 &&
      pattern[(i + 1) % n] === 1 &&
      pattern[(i + 2) % n] === 1
    )
      return false
  }
  return true
}

// ---- Defensive alignment ----------------------------------------------------

// Assign players to the 9 fielding positions, respecting eligibility and using
// each player's position list as a depth chart (earlier = primary, preferred).
// Bipartite max-cardinality matching (Kuhn) with candidates visited in
// depth-chart order so people land at their primary spot when possible. Players
// left unfilled (more batters than field spots) get 'DH'. A player with an
// empty position list is treated as eligible for any spot (no preference).
export function assignPositions(
  realOrder: string[],
  eligibilityById: Map<string, string[]>,
): Map<string, string> {
  const positions = [...FIELDING_POSITIONS]

  const rank = (pid: string, pos: string): number => {
    const elig = eligibilityById.get(pid) ?? []
    if (elig.length === 0) return 0 // unknown → eligible anywhere, no preference
    const i = elig.indexOf(pos)
    return i // -1 means not eligible
  }
  const eligible = (pid: string, pos: string): boolean => {
    const elig = eligibilityById.get(pid) ?? []
    return elig.length === 0 || elig.includes(pos)
  }

  // Candidates per position, ordered by depth-chart preference (primary first).
  const candidates = positions.map((pos) =>
    realOrder
      .filter((pid) => eligible(pid, pos))
      .sort((a, b) => rank(a, pos) - rank(b, pos)),
  )

  // Fill the scarcest positions first to maximize coverage.
  const posOrder = positions.map((_, i) => i).sort((a, b) => candidates[a].length - candidates[b].length)

  const posMatch = new Map<number, string>()
  const playerMatch = new Map<string, number>()

  const tryAssign = (posIdx: number, visited: Set<string>): boolean => {
    for (const pid of candidates[posIdx]) {
      if (visited.has(pid)) continue
      visited.add(pid)
      const cur = playerMatch.get(pid)
      if (cur === undefined || tryAssign(cur, visited)) {
        playerMatch.set(pid, posIdx)
        posMatch.set(posIdx, pid)
        return true
      }
    }
    return false
  }

  for (const posIdx of posOrder) tryAssign(posIdx, new Set())

  const result = new Map<string, string>()
  for (const [posIdx, pid] of posMatch) result.set(pid, positions[posIdx])
  for (const pid of realOrder) if (!result.has(pid)) result.set(pid, 'DH')
  return result
}
