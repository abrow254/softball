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

// Defensive value order for short-handed play (most important to keep → first
// to drop). Slo-pitch is a fly-ball, no-bunt, no-steal game, so the biggest run
// prevention is in the OUTFIELD — keep all three outfielders first. Then the
// infield corners + shortstop (the range/force positions), then catcher (plays
// at the plate), then second base, and finally Rover — the "extra" fielder — is
// dropped first. When fewer than 9 take the field, the auto-assigner fills this
// list top-down, so e.g. 7 players field C, 1B, 3B, SS, LF, CF, RF and leave
// 2B + Rover unmanned. Reorder this list to change the short-handed philosophy.
export const POSITION_PRIORITY: readonly FieldingPosition[] = [
  'CF', 'LF', 'RF', '1B', 'SS', '3B', 'C', '2B', 'Rover',
]
