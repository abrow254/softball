import { describe, it, expect } from 'vitest'
import { computeStats, fmt3, fmtPct, type CountingLine } from '@/lib/formulas'

const zero: CountingLine = {
  singles: 0,
  doubles: 0,
  triples: 0,
  hr: 0,
  ab: 0,
  fc: 0,
  bb: 0,
  hbp: 0,
  roe: 0,
  rbi: 0,
  runs: 0,
  k: 0,
}

describe('house formulas — §4 worked example', () => {
  // Player with one game: 2 singles, 1 double, 1 HR, 5 AB, 0 everything else.
  const line: CountingLine = { ...zero, singles: 2, doubles: 1, hr: 1, ab: 5 }
  const s = computeStats(line)

  it('hits = 4', () => expect(s.hits).toBe(4))
  it('tb = 8 (2 + 2 + 0 + 4)', () => expect(s.tb).toBe(8))
  it('avg = .800', () => expect(s.avg).toBeCloseTo(0.8, 10))
  it('slg = 1.600', () => expect(s.slg).toBeCloseTo(1.6, 10))
  it('ops = 2.400 (AVG + SLG, house rule)', () => expect(s.ops).toBeCloseTo(2.4, 10))
  it('iso = .800', () => expect(s.iso).toBeCloseTo(0.8, 10))
  it('obp = .800 ((hits + fc) / ab, house rule)', () => expect(s.obp).toBeCloseTo(0.8, 10))
  it('xbh% = 50% ((1 + 0 + 1) / 4)', () => expect(s.xbhPct).toBeCloseTo(0.5, 10))

  it('formats baseball-style', () => {
    expect(fmt3(s.avg)).toBe('.800')
    expect(fmt3(s.slg)).toBe('1.600')
    expect(fmt3(s.ops)).toBe('2.400')
    expect(fmtPct(s.xbhPct)).toBe('50%')
  })
})

describe('house rules are non-standard on purpose', () => {
  it('obp counts FC and divides by AB (not PA)', () => {
    // 1 single + 1 FC over 4 AB → obp = (1 + 1) / 4 = .500, avg = .250
    const line: CountingLine = { ...zero, singles: 1, fc: 1, ab: 4 }
    const s = computeStats(line)
    expect(s.avg).toBeCloseTo(0.25, 10)
    expect(s.obp).toBeCloseTo(0.5, 10)
  })

  it('pa = runs + hits + bb + hbp + roe', () => {
    const line: CountingLine = { ...zero, singles: 2, ab: 4, bb: 1, hbp: 1, roe: 1, runs: 2 }
    const s = computeStats(line)
    // 2 runs + 2 hits + 1 bb + 1 hbp + 1 roe = 7
    expect(s.pa).toBe(7)
  })

  it('ops is AVG + SLG, not OBP + SLG', () => {
    const line: CountingLine = { ...zero, singles: 1, fc: 1, ab: 4 }
    const s = computeStats(line)
    expect(s.ops).toBeCloseTo(s.avg + s.slg, 10)
    expect(s.ops).not.toBeCloseTo(s.obp + s.slg, 10)
  })
})

describe('division guards', () => {
  it('all rate stats are 0 when ab and hits are 0', () => {
    const s = computeStats(zero)
    expect([s.avg, s.obp, s.slg, s.ops, s.iso, s.xbhPct]).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('xbh% is 0 when there are no hits even if AB > 0', () => {
    const s = computeStats({ ...zero, ab: 3, k: 3 })
    expect(s.xbhPct).toBe(0)
  })
})

describe('fmt3 edge cases', () => {
  it('drops leading zero below 1, keeps it at/above 1', () => {
    expect(fmt3(0.8)).toBe('.800')
    expect(fmt3(1.6)).toBe('1.600')
  })
  it('handles negative ISO', () => {
    expect(fmt3(-0.05)).toBe('-.050')
  })
})
