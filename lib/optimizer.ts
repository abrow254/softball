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
//   n > 8  — enumerate valid cyclic gender patterns; for each, assign players
//            greedily (best player to most-valuable open slot within gender
//            group); return best across all patterns.

export interface SlotConfig {
  role: string
  w: number  // importance weight
  a: number  // OBP emphasis
  b: number  // SLG emphasis
}

// Slots 1–8 verbatim from the spec.
const BASE_SLOTS: SlotConfig[] = [
  { role: 'Leadoff', w: 1.00, a: 0.65, b: 0.35 },
  { role: '2-hole',  w: 1.05, a: 0.58, b: 0.42 },
  { role: '3-hole',  w: 0.80, a: 0.50, b: 0.50 },
  { role: 'Cleanup', w: 1.00, a: 0.40, b: 0.60 },
  { role: '5-hole',  w: 0.90, a: 0.45, b: 0.55 },
  { role: '6-hole',  w: 0.74, a: 0.55, b: 0.45 },
  { role: '7-hole',  w: 0.66, a: 0.50, b: 0.50 },
  { role: '8-hole',  w: 0.60, a: 0.50, b: 0.50 },
]

// Extended weights for slots 9+ (descending from 0.55).
const EXTENDED_WEIGHTS = [0.55, 0.50, 0.46, 0.42, 0.39, 0.36, 0.33, 0.30]

export function getSlotConfigs(n: number): SlotConfig[] {
  return Array.from({ length: n }, (_, i) => {
    if (i < BASE_SLOTS.length) return BASE_SLOTS[i]
    const extIdx = i - BASE_SLOTS.length
    const w =
      extIdx < EXTENDED_WEIGHTS.length
        ? EXTENDED_WEIGHTS[extIdx]
        : Math.max(0.20, 0.30 - 0.03 * (extIdx - EXTENDED_WEIGHTS.length + 1))
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
  ops: number  // used as tiebreaker in greedy assignment
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
  return n <= 8 ? bruteForce(players, slots) : greedyOptimize(players, slots)
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

  return {
    order: bestPerm.map((i) => players[i].player_id),
    score: bestScore,
    feasible: true,
  }
}

// ---- Greedy pattern-based (n > 8) -----------------------------------------------
// 1. Enumerate valid cyclic gender patterns for the given male/non-male counts.
// 2. For each pattern, greedily assign: best player → most-valuable open slot
//    within their gender group (OPS as the player ranking metric).
// 3. Keep the assignment with the highest lineupScore.

function greedyOptimize(players: OptimizerInput[], slots: SlotConfig[]): OptimizeResult {
  const n = players.length
  const maleCount = players.filter((p) => p.gender === 'M').length
  const nonMaleCount = n - maleCount

  // Player index arrays pre-sorted by OPS descending (used in assignment).
  const malesByOps = players
    .map((_, i) => i)
    .filter((i) => players[i].gender === 'M')
    .sort((a, b) => players[b].ops - players[a].ops)
  const nonMalesByOps = players
    .map((_, i) => i)
    .filter((i) => players[i].gender !== 'M')
    .sort((a, b) => players[b].ops - players[a].ops)

  let bestScore = -Infinity
  let bestOrder: number[] | null = null

  for (const pattern of generateGenderPatterns(n, maleCount, nonMaleCount)) {
    // pattern[i]: 1 = male slot, 0 = non-male slot
    const maleSlots = pattern
      .map((g, i) => (g === 1 ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => slots[b].w - slots[a].w)  // most valuable first

    const nonMaleSlots = pattern
      .map((g, i) => (g === 0 ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => slots[b].w - slots[a].w)

    // Assign i-th best player to i-th most-valuable slot within each group.
    const assignment = new Array(n).fill(-1)
    malesByOps.forEach((pi, rank) => {
      if (rank < maleSlots.length) assignment[maleSlots[rank]] = pi
    })
    nonMalesByOps.forEach((pi, rank) => {
      if (rank < nonMaleSlots.length) assignment[nonMaleSlots[rank]] = pi
    })

    const score = assignment.reduce(
      (s, pi, si) => s + slotValue(players[pi].obp, players[pi].slg, slots[si]),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      bestOrder = [...assignment]
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
