import { describe, it, expect } from 'vitest'
import { matchName, normalizeName, levenshtein } from '@/lib/name-match'

const roster = [
  { id: 'p1', name: 'Aaron Brown' },
  { id: 'p2', name: 'Mike Carter' },
  { id: 'p3', name: 'Dave Singh' },
]

describe('matchName', () => {
  it('matches case-insensitively exact', () => {
    const m = matchName('aaron brown', roster)
    expect(m.kind).toBe('exact')
    expect(m.playerId).toBe('p1')
  })

  it('trims and collapses whitespace before matching', () => {
    expect(matchName('  Dave   Singh ', roster).playerId).toBe('p3')
  })

  it('fuzzy-matches a small misspelling', () => {
    const m = matchName('Mike Cartr', roster) // dropped an "e"
    expect(m.kind).toBe('fuzzy')
    expect(m.playerId).toBe('p2')
    expect(m.score).toBeGreaterThan(0.7)
  })

  it('returns none for an unrelated name', () => {
    const m = matchName('Wayne Gretzky', roster)
    expect(m.kind).toBe('none')
    expect(m.playerId).toBeNull()
  })

  it('returns none for empty input', () => {
    expect(matchName('   ', roster).kind).toBe('none')
  })
})

describe('helpers', () => {
  it('normalizeName lowercases and collapses spaces', () => {
    expect(normalizeName('  Foo   Bar ')).toBe('foo bar')
  })
  it('levenshtein basic distances', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('abc', 'abc')).toBe(0)
  })
})
