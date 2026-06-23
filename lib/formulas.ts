// The team's HOUSE FORMULAS, mirrored from the original Google Sheet and from
// the season_stats SQL view (supabase/migrations/0003). Two are deliberately
// non-standard (see HOUSE RULE comments). DO NOT "fix" them to textbook
// baseball — historical numbers depend on them. This TS copy exists for the
// review-grid live preview and is verified against the worked example in
// __tests__/formulas.test.ts. If you change a formula here, change the view too.

export interface CountingLine {
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
  k: number
}

export interface DerivedStats {
  hits: number
  tb: number
  pa: number
  avg: number
  obp: number
  slg: number
  ops: number
  iso: number
  xbhPct: number
}

// Guarded division: denominator 0 → 0 (matches COALESCE(.. / NULLIF(d,0), 0)).
function div(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

export function computeStats(l: CountingLine): DerivedStats {
  const hits = l.singles + l.doubles + l.triples + l.hr
  const tb = l.singles + 2 * l.doubles + 3 * l.triples + 4 * l.hr
  const pa = l.runs + hits + l.bb + l.hbp + l.roe // HOUSE RULE

  const avg = div(hits, l.ab)
  const obp = div(hits + l.fc, l.ab) // HOUSE RULE: counts FC, divides by AB not PA
  const slg = div(tb, l.ab)
  const ops = avg + slg // HOUSE RULE: AVG + SLG, not OBP + SLG
  const iso = slg - avg
  const xbhPct = div(l.doubles + l.triples + l.hr, hits)

  return { hits, tb, pa, avg, obp, slg, ops, iso, xbhPct }
}

// ---- Display helpers --------------------------------------------------------

// AVG/OBP/SLG/OPS/ISO to 3 decimals, baseball-style (leading 0 dropped for
// magnitudes < 1, so .800 and 1.600 and -.050).
export function fmt3(n: number): string {
  const s = Math.abs(n).toFixed(3)
  const body = s.startsWith('0.') ? s.slice(1) : s
  return n < 0 ? `-${body}` : body
}

// XBH% shown as a whole percent.
export function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}
