// Client-safe shapes for the photo-extraction result. Kept separate from
// lib/extraction.ts (which is `server-only` and pulls in the Anthropic SDK) so
// client components can import the types without dragging the server code in.

import type { AtBatCode } from './codes'

export interface ExtractedAtBat {
  inning: number | null
  code: AtBatCode
}

export interface ExtractedPlayer {
  name: string
  batting_order: number | null
  starting_pos: string | null
  at_bats: ExtractedAtBat[]
}

export interface ExtractedCard {
  game: {
    opponent: string | null
    our_runs: number | null
    opp_runs: number | null
  }
  players: ExtractedPlayer[]
}
