// The fixed code vocabulary written in each card cell, and the card → totals
// aggregation. This is the single source of truth for what each code means and
// how it rolls up into a per-game counting line. Used by photo intake and the
// review grid. Pure + dependency-free so it can be unit-tested directly.

export const AT_BAT_CODES = ['H1', 'H2', 'H3', 'H4', 'FC', 'FO', 'PO', 'GO', 'K'] as const
export type AtBatCode = (typeof AT_BAT_CODES)[number]

export const CODE_MEANINGS: Record<AtBatCode, string> = {
  H1: 'Single',
  H2: 'Double',
  H3: 'Triple',
  H4: 'Home run',
  FC: "Fielder's choice",
  FO: 'Fly out',
  PO: 'Pop out',
  GO: 'Ground out',
  K: 'Strikeout',
}

export function isAtBatCode(x: unknown): x is AtBatCode {
  return typeof x === 'string' && (AT_BAT_CODES as readonly string[]).includes(x)
}

// The counting-line shape the card aggregates into. bb/hbp/roe/rbi/runs are NOT
// on the card vocabulary — they default to 0 and are filled by the admin in
// review if the team tracked them.
export interface AggregatedLine {
  singles: number
  doubles: number
  triples: number
  hr: number
  ab: number
  fc: number
  k: number
  bb: number
  hbp: number
  roe: number
  rbi: number
  runs: number
}

export function emptyLine(): AggregatedLine {
  return { singles: 0, doubles: 0, triples: 0, hr: 0, ab: 0, fc: 0, k: 0, bb: 0, hbp: 0, roe: 0, rbi: 0, runs: 0 }
}

/**
 * Aggregate a player's coded cells into a counting line.
 * KEY RULE: every coded cell is an at-bat (ab), including outs and FC.
 * Hits = H1..H4; FC and K get their own columns; FO/PO/GO are outs counted
 * only in ab (no separate column on the stat line).
 */
export function aggregateCodes(codes: readonly AtBatCode[]): AggregatedLine {
  const line = emptyLine()
  for (const code of codes) {
    line.ab += 1 // every code is an AB
    switch (code) {
      case 'H1':
        line.singles += 1
        break
      case 'H2':
        line.doubles += 1
        break
      case 'H3':
        line.triples += 1
        break
      case 'H4':
        line.hr += 1
        break
      case 'FC':
        line.fc += 1
        break
      case 'K':
        line.k += 1
        break
      // FO / PO / GO: outs — only contribute to ab
    }
  }
  return line
}
