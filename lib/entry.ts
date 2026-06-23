// Shared shapes for the entry / review grid (Surface 1) and the photo-intake
// pre-fill. Plain module (no 'use server') so both client components and the
// server action can import these types.

import type { CountingLine } from './formulas'
import type { AtBatCode } from './codes'
import type { GamePlayerStats, Lineup, Player } from './types'

// A player's editable counting line is exactly the house CountingLine.
export type StatLine = CountingLine

// Sentinel position meaning "didn't play" — appears on the lineup card but
// gets no game_player_stats row (so it doesn't count as a game played).
export const SIT = 'Sit'

export interface EditorRow {
  player_id: string
  name: string
  batting_order: number | null
  starting_pos: string
  stats: StatLine
}

export interface SaveGameInput {
  game: {
    id?: string
    season_id: string
    game_date: string | null
    opponent: string | null
    our_runs: number | null
    opp_runs: number | null
  }
  rows: EditorRow[]
  // Optional at-bat detail (photo intake only).
  atBats?: Array<{ player_id: string; inning: number | null; code: AtBatCode }>
}

export function emptyStatLine(): StatLine {
  return {
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
}

// A player "played" (gets a stat line) unless they're explicitly sitting.
export function playedThisGame(row: EditorRow): boolean {
  return row.starting_pos.trim().toLowerCase() !== SIT.toLowerCase()
}

function pickStatLine(s: GamePlayerStats): StatLine {
  return {
    singles: s.singles,
    doubles: s.doubles,
    triples: s.triples,
    hr: s.hr,
    ab: s.ab,
    fc: s.fc,
    bb: s.bb,
    hbp: s.hbp,
    roe: s.roe,
    rbi: s.rbi,
    runs: s.runs,
    k: s.k,
  }
}

// Merge a game's lineup + stat rows into editor rows, ordered by batting order
// (then name). A player appears if they're in the lineup or have a stat line.
export function buildEditorRows(
  players: ReadonlyArray<Player>,
  lineup: ReadonlyArray<Lineup>,
  stats: ReadonlyArray<GamePlayerStats>,
): EditorRow[] {
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const lineupById = new Map(lineup.map((l) => [l.player_id, l]))
  const statById = new Map(stats.map((s) => [s.player_id, s]))
  const ids = new Set<string>([...lineupById.keys(), ...statById.keys()])

  const rows: EditorRow[] = [...ids].map((id) => {
    const l = lineupById.get(id)
    const s = statById.get(id)
    return {
      player_id: id,
      name: nameById.get(id) ?? 'Unknown',
      batting_order: l?.batting_order ?? null,
      starting_pos: l?.starting_pos ?? '',
      stats: s ? pickStatLine(s) : emptyStatLine(),
    }
  })

  rows.sort((a, b) => {
    const ao = a.batting_order ?? Number.MAX_SAFE_INTEGER
    const bo = b.batting_order ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
  return rows
}
