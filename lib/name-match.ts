// Match an extracted name (from a card photo) to an existing player:
// case-insensitive exact first, then fuzzy (Levenshtein ratio). Unmatched names
// are surfaced in the review grid for the admin to map or create.

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Classic iterative Levenshtein distance.
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

export type MatchKind = 'exact' | 'fuzzy' | 'none'

export interface NameMatch {
  playerId: string | null
  kind: MatchKind
  score: number // 1 = exact, 0..1 fuzzy ratio, 0 = none
}

const FUZZY_THRESHOLD = 0.7

export function matchName(input: string, players: ReadonlyArray<{ id: string; name: string }>): NameMatch {
  const target = normalizeName(input)
  if (!target) return { playerId: null, kind: 'none', score: 0 }

  // exact (case-insensitive)
  for (const p of players) {
    if (normalizeName(p.name) === target) return { playerId: p.id, kind: 'exact', score: 1 }
  }

  // fuzzy: best ratio above threshold
  let best: { id: string; ratio: number } | null = null
  for (const p of players) {
    const candidate = normalizeName(p.name)
    const dist = levenshtein(target, candidate)
    const maxLen = Math.max(target.length, candidate.length)
    const ratio = maxLen === 0 ? 0 : 1 - dist / maxLen
    if (!best || ratio > best.ratio) best = { id: p.id, ratio }
  }

  if (best && best.ratio >= FUZZY_THRESHOLD) {
    return { playerId: best.id, kind: 'fuzzy', score: best.ratio }
  }
  return { playerId: null, kind: 'none', score: 0 }
}
