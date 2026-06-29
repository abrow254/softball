// Shared position vocabulary, single source of truth for the roster editor,
// the per-game starting-position selector, and the defensive alignment builder.

// Options offered in the per-game lineup selector (includes DH and bench).
export const LINEUP_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover', 'BE'] as const

// Real defensive positions a player can be *eligible* for and that must be
// filled in a valid alignment (excludes DH = bat-only and BE = bench).
export const FIELDING_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Rover'] as const

export type FieldingPosition = (typeof FIELDING_POSITIONS)[number]

export const isFieldingPosition = (p: string): p is FieldingPosition =>
  (FIELDING_POSITIONS as readonly string[]).includes(p)
