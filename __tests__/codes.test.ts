import { describe, it, expect } from 'vitest'
import { aggregateCodes, isAtBatCode, AT_BAT_CODES, type AtBatCode } from '@/lib/codes'
import { computeStats } from '@/lib/formulas'

describe('aggregateCodes — card → totals', () => {
  it('every coded cell counts as an AB, including outs and FC', () => {
    // One of each code: 9 cells → 9 AB.
    const line = aggregateCodes([...AT_BAT_CODES])
    expect(line.ab).toBe(9)
    expect(line.singles).toBe(1)
    expect(line.doubles).toBe(1)
    expect(line.triples).toBe(1)
    expect(line.hr).toBe(1)
    expect(line.fc).toBe(1)
    expect(line.k).toBe(1)
    // FO / PO / GO are outs — only in AB, no dedicated column.
    expect(line.bb).toBe(0)
    expect(line.hbp).toBe(0)
    expect(line.roe).toBe(0)
    expect(line.runs).toBe(0)
    expect(line.rbi).toBe(0)
  })

  it('a realistic mixed card aggregates correctly', () => {
    // H1 H1 H2 H4 FC GO K FO PO  → 9 AB, 4 hits (2×1B,1×2B,1×HR), 1 FC, 1 K
    const codes: AtBatCode[] = ['H1', 'H1', 'H2', 'H4', 'FC', 'GO', 'K', 'FO', 'PO']
    const line = aggregateCodes(codes)
    expect(line.ab).toBe(9)
    expect(line.singles).toBe(2)
    expect(line.doubles).toBe(1)
    expect(line.hr).toBe(1)
    expect(line.fc).toBe(1)
    expect(line.k).toBe(1)

    // And the aggregated line flows into the house formulas as expected.
    const s = computeStats({ ...line })
    expect(s.hits).toBe(4)
    expect(s.tb).toBe(2 + 2 + 4) // 2×1B + 1×2B + 1×HR = 8
    expect(s.avg).toBeCloseTo(4 / 9, 10)
    expect(s.obp).toBeCloseTo((4 + 1) / 9, 10) // hits + fc over ab
  })

  it('reproduces the §4 worked example from codes', () => {
    // 2 singles, 1 double, 1 HR, plus one out to reach 5 AB.
    const line = aggregateCodes(['H1', 'H1', 'H2', 'H4', 'GO'])
    expect(line.ab).toBe(5)
    const s = computeStats({ ...line })
    expect(s.hits).toBe(4)
    expect(s.tb).toBe(8)
    expect(s.avg).toBeCloseTo(0.8, 10)
    expect(s.slg).toBeCloseTo(1.6, 10)
  })

  it('empty card → all zeros', () => {
    const line = aggregateCodes([])
    expect(line.ab).toBe(0)
    expect(line.singles).toBe(0)
  })
})

describe('isAtBatCode', () => {
  it('accepts valid codes and rejects junk', () => {
    expect(isAtBatCode('H1')).toBe(true)
    expect(isAtBatCode('K')).toBe(true)
    expect(isAtBatCode('XX')).toBe(false)
    expect(isAtBatCode('')).toBe(false)
    expect(isAtBatCode(null)).toBe(false)
    expect(isAtBatCode(3)).toBe(false)
  })
})
