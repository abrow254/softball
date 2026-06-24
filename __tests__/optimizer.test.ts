import { describe, it, expect } from 'vitest'
import {
  optimize,
  checkMMFViolations,
  calcLineupScore,
  getSlotConfigs,
  isFeasible,
} from '@/lib/optimizer'
import type { OptimizerInput } from '@/lib/optimizer'

// Helper: build a roster with controlled OPS/OBP/SLG values.
function mkPlayer(
  id: string,
  gender: 'M' | 'F' | null,
  obp = 0.350,
  slg = 0.450,
): OptimizerInput {
  return { player_id: id, gender, obp, slg, ops: obp + slg }
}

// ---- QA Case 1: 5M / 3F, 8 deep -----------------------------------------------
// Optimizer must return a legal order with no flagged spots.
// The two highest-OPS players must land in slots 2 and 4 (0-indexed: 1 and 3).
describe('QA Case 1 — 5M / 3F, 8 deep', () => {
  // Deliberately vary OPS so we know who the two best bats are.
  const players: OptimizerInput[] = [
    mkPlayer('m1', 'M', 0.40, 0.60),  // OPS 1.00 — best
    mkPlayer('m2', 'M', 0.35, 0.55),  // OPS 0.90 — second best
    mkPlayer('m3', 'M', 0.30, 0.50),
    mkPlayer('m4', 'M', 0.28, 0.45),
    mkPlayer('m5', 'M', 0.25, 0.40),
    mkPlayer('f1', 'F', 0.22, 0.35),
    mkPlayer('f2', 'F', 0.20, 0.33),
    mkPlayer('f3', 'F', 0.18, 0.30),
  ]

  it('returns a feasible result', () => {
    const result = optimize(players)
    expect(result.feasible).toBe(true)
  })

  it('returns a legal order (no MMF violations)', () => {
    const result = optimize(players)
    const playerMap = new Map(players.map((p) => [p.player_id, p]))
    const genders = result.order.map((id) => playerMap.get(id)!.gender)
    expect(checkMMFViolations(genders)).toHaveLength(0)
  })

  it('places the two highest-OPS players in slots 2 and 4 (indices 1 and 3)', () => {
    const result = optimize(players)
    const slot2 = result.order[1]
    const slot4 = result.order[3]
    const topTwo = new Set(['m1', 'm2'])
    expect(topTwo.has(slot2)).toBe(true)
    expect(topTwo.has(slot4)).toBe(true)
    expect(slot2).not.toBe(slot4)
  })
})

// ---- QA Case 2: 6M / 2F, 8 deep (infeasible) ----------------------------------
describe('QA Case 2 — 6M / 2F, 8 deep', () => {
  it('feasibility guard trips (6 > 2×2)', () => {
    expect(isFeasible(6, 2)).toBe(false)
  })

  it('optimize() returns feasible:false without running', () => {
    const players: OptimizerInput[] = [
      ...Array.from({ length: 6 }, (_, i) => mkPlayer(`m${i}`, 'M')),
      ...Array.from({ length: 2 }, (_, i) => mkPlayer(`f${i}`, 'F')),
    ]
    const result = optimize(players)
    expect(result.feasible).toBe(false)
    expect(result.score).toBe(0)
  })
})

// ---- QA Case 3: Manual violation including cyclic wrap -------------------------
// Men in slots 8, 1, 2 (0-indexed: 7, 0, 1) — wrap from last batter to first.
describe('QA Case 3 — cyclic wrap violation (slots 8, 1, 2)', () => {
  it('flags all three slots in the violation set', () => {
    // 8 players: men at indices 7, 0, 1; women everywhere else.
    const genders = [
      'M', 'M', 'F', 'F', 'F', 'F', 'F', 'M',
    ] as ('M' | 'F')[]

    const violations = checkMMFViolations(genders)
    // positions 7→0→1 are the three consecutive males (cyclically)
    expect(violations).toContain(7)
    expect(violations).toContain(0)
    expect(violations).toContain(1)
  })

  it('produces a non-empty flagged set (order is illegal)', () => {
    const genders = ['M', 'M', 'F', 'F', 'F', 'F', 'F', 'M'] as ('M' | 'F')[]
    expect(checkMMFViolations(genders).length).toBeGreaterThan(0)
  })
})

// ---- QA Case 4: Score monotonicity ---------------------------------------------
// Moving a higher-OPS player from slot 6 to slot 2 must raise lineupScore.
describe('QA Case 4 — score monotonicity', () => {
  it('slot 2 is more valuable than slot 6', () => {
    const slots = getSlotConfigs(8)
    // A player with OBP 0.35 / SLG 0.50 in slot 2 (index 1) vs slot 6 (index 5)
    const p = { obp: 0.35, slg: 0.50 }
    const filler = { obp: 0.25, slg: 0.35 }

    // Build an 8-player order: filler everywhere except the test positions
    function makeOrder(highAtIdx: number) {
      return Array.from({ length: 8 }, (_, i) => (i === highAtIdx ? p : filler))
    }

    const scoreWithHighAt2 = calcLineupScore(makeOrder(1), slots)
    const scoreWithHighAt6 = calcLineupScore(makeOrder(5), slots)
    expect(scoreWithHighAt2).toBeGreaterThan(scoreWithHighAt6)
  })
})

// ---- Edge cases ----------------------------------------------------------------

describe('edge cases', () => {
  it('empty roster returns feasible empty order', () => {
    const result = optimize([])
    expect(result.feasible).toBe(true)
    expect(result.order).toHaveLength(0)
  })

  it('3M 3F (boundary: 3 ≤ 2×3) is feasible', () => {
    expect(isFeasible(3, 3)).toBe(true)
  })

  it('3M 1F (3 > 2×1) is infeasible', () => {
    expect(isFeasible(3, 1)).toBe(false)
  })

  it('all-female lineup is legal (no males to violate MMF)', () => {
    const players = Array.from({ length: 6 }, (_, i) => mkPlayer(`f${i}`, 'F'))
    const result = optimize(players)
    expect(result.feasible).toBe(true)
    const playerMap = new Map(players.map((p) => [p.player_id, p]))
    const genders = result.order.map((id) => playerMap.get(id)!.gender)
    expect(checkMMFViolations(genders)).toHaveLength(0)
  })

  it('n>8 greedy path returns a legal order for 5M 5F', () => {
    const players: OptimizerInput[] = [
      ...Array.from({ length: 5 }, (_, i) => mkPlayer(`m${i}`, 'M', 0.35 - i * 0.02, 0.45 - i * 0.02)),
      ...Array.from({ length: 5 }, (_, i) => mkPlayer(`f${i}`, 'F', 0.30 - i * 0.02, 0.40 - i * 0.02)),
    ]
    const result = optimize(players)
    expect(result.feasible).toBe(true)
    const playerMap = new Map(players.map((p) => [p.player_id, p]))
    const genders = result.order.map((id) => playerMap.get(id)!.gender)
    expect(checkMMFViolations(genders)).toHaveLength(0)
  })
})
