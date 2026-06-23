import { upsertGame, type GameInput } from './games'
import { replaceLineup, type LineupRow } from './lineups'
import { replaceGameStats, type StatRowInput } from './gameStats'
import { replaceAtBats, type AtBatRow } from './atbats'

export interface CommitGamePayload {
  game: GameInput
  stats: StatRowInput[]
  lineup: LineupRow[]
  // Optional — only the photo-intake path supplies at-bat detail. When
  // omitted, existing at_bats are left untouched (totals are source of truth).
  atBats?: AtBatRow[]
}

export interface CommitGameResult {
  gameId: string
}

/**
 * Writes a full game in one call: the game row, its lineup, the per-player
 * counting lines, and (optionally) at-bat detail.
 *
 * NOTE: Supabase JS has no multi-statement transaction, so these writes run
 * sequentially — game first so children have a valid game_id. For v1's single
 * admin and low volume this is acceptable; if partial-write atomicity ever
 * matters, move this body into a Postgres RPC and call it once.
 */
export async function commitGame(payload: CommitGamePayload): Promise<CommitGameResult> {
  const game = await upsertGame(payload.game)
  await replaceLineup(game.id, payload.lineup)
  await replaceGameStats(game.id, payload.stats)
  if (payload.atBats !== undefined) {
    await replaceAtBats(game.id, payload.atBats)
  }
  return { gameId: game.id }
}
