import { describe, it, expect } from 'vitest'
import { houseRunsCreated, runsPerWin, computeWar, WAR_CONFIG } from '@/lib/war'

const env = { rsPerG: 22.7, raPerG: 15.0 } // all-time run environment

// Build a batting line with sensible defaults.
function line(over: Partial<{ ab: number; hits: number; tb: number; fc: number; hbp: number; roe: number }>) {
  return { ab: 0, hits: 0, tb: 0, fc: 0, hbp: 0, roe: 0, ...over }
}

describe('houseRunsCreated', () => {
  it('is (H + FC + HBP + ROE) * TB / AB', () => {
    // 30 hits, 5 FC, 70 TB, 40 AB -> 35 * 70 / 40 = 61.25
    expect(houseRunsCreated(line({ ab: 40, hits: 30, tb: 70, fc: 5 }))).toBeCloseTo(61.25, 5)
  })
  it('is 0 with no at-bats', () => {
    expect(houseRunsCreated(line({ ab: 0, hits: 3, tb: 5 }))).toBe(0)
  })
})

describe('runsPerWin', () => {
  it('is ~20 in a ~38 runs/game environment', () => {
    const rpw = runsPerWin(env)
    expect(rpw).toBeGreaterThan(18)
    expect(rpw).toBeLessThan(22)
  })
})

describe('computeWar', () => {
  it('ranks a masher above a regular above a sub-replacement bench bat', () => {
    const rows = [
      { player_id: 'masher', ...line({ ab: 40, hits: 30, tb: 70, fc: 5 }) },
      { player_id: 'regular', ...line({ ab: 40, hits: 16, tb: 26, fc: 3 }) },
      { player_id: 'bench', ...line({ ab: 30, hits: 5, tb: 6, fc: 1 }) },
    ]
    const w = computeWar(rows, env)
    const masher = w.get('masher')!.war
    const regular = w.get('regular')!.war
    const bench = w.get('bench')!.war
    expect(masher).toBeGreaterThan(regular)
    expect(regular).toBeGreaterThan(bench)
    expect(masher).toBeGreaterThan(0)
    expect(bench).toBeLessThan(0)
  })

  it('a league-average hitter sits above replacement (war > 0 but small)', () => {
    // Three identical hitters => each is exactly league average; RAR per player
    // = RC - replacementFactor*avg*AB = (1 - 0.8) * RC > 0.
    const l = line({ ab: 40, hits: 18, tb: 30, fc: 4 })
    const rows = [
      { player_id: 'a', ...l },
      { player_id: 'b', ...l },
      { player_id: 'c', ...l },
    ]
    const w = computeWar(rows, env)
    const rc = houseRunsCreated(l)
    const expectedRar = rc * (1 - WAR_CONFIG.replacementFactor)
    expect(w.get('a')!.rar).toBeCloseTo(expectedRar, 5)
    expect(w.get('a')!.war).toBeGreaterThan(0)
  })

  it('returns an empty map for no rows', () => {
    expect(computeWar([], env).size).toBe(0)
  })
})
