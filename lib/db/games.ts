import { createClient } from '@/lib/supabase/server'
import type { Game, BoxScoreRow } from '@/lib/types'
import { selectPotG } from '@/lib/potg'
import type { PotGLine } from '@/lib/potg'

export async function listGames(seasonId: string): Promise<Game[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .order('game_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('games').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

// All-time Player-of-the-Game wins for one player (real games only).
export async function getPlayerPotgCount(playerId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('potg_player_id', playerId)
    .eq('is_aggregate', false)
  if (error) throw new Error(error.message)
  return count ?? 0
}

// Returns the box score for a real (non-aggregate) game, or null for aggregates.
// Merges lineup order from the lineups table.
export async function getBoxScore(gameId: string): Promise<BoxScoreRow[] | null> {
  const supabase = createClient()

  const game = await getGame(gameId)
  if (!game || game.is_aggregate) return null

  const [statsRes, playersRes, lineupRes] = await Promise.all([
    supabase.from('game_player_stats').select('*').eq('game_id', gameId),
    supabase.from('players').select('id, name, is_regular'),
    supabase.from('lineups').select('player_id, batting_order').eq('game_id', gameId),
  ])

  if (statsRes.error) throw new Error(statsRes.error.message)
  if (playersRes.error) throw new Error(playersRes.error.message)
  if (lineupRes.error) throw new Error(lineupRes.error.message)

  const playerById = new Map(
    (playersRes.data ?? []).map((p) => [p.id, { name: p.name as string, is_regular: p.is_regular as boolean }]),
  )
  const orderById = new Map(
    (lineupRes.data ?? []).map((l) => [l.player_id, l.batting_order as number | null]),
  )

  const rows: BoxScoreRow[] = (statsRes.data ?? []).map((s) => {
    const p = playerById.get(s.player_id) ?? { name: 'Unknown', is_regular: true }
    const h = s.singles + s.doubles + s.triples + s.hr
    const tb = s.singles + 2 * s.doubles + 3 * s.triples + 4 * s.hr
    const avg = s.ab > 0 ? h / s.ab : 0
    const slg = s.ab > 0 ? tb / s.ab : 0
    return {
      player_id: s.player_id,
      name: p.name,
      is_regular: p.is_regular,
      batting_order: orderById.get(s.player_id) ?? null,
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
      hits: h,
      tb,
      avg,
      slg,
      ops: avg + slg,
      is_potg: game.potg_player_id === s.player_id,
    }
  })

  rows.sort((a, b) => {
    const ao = a.batting_order ?? Number.MAX_SAFE_INTEGER
    const bo = b.batting_order ?? Number.MAX_SAFE_INTEGER
    return ao !== bo ? ao - bo : a.name.localeCompare(b.name)
  })

  return rows
}

// Find the real (non-aggregate) game for a season + date, or create one. Used
// when saving a lineup for an upcoming scheduled game that has no DB row yet.
// Assumes one game per date for this league.
export async function getOrCreateGame(
  seasonId: string,
  gameDate: string,
  opponent: string | null,
): Promise<Game> {
  const supabase = createClient()
  const { data: existing, error } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .eq('game_date', gameDate)
    .eq('is_aggregate', false)
  if (error) throw new Error(error.message)
  if (existing && existing.length > 0) return existing[0]

  return upsertGame({ season_id: seasonId, game_date: gameDate, opponent, our_runs: null, opp_runs: null })
}

export interface GameInput {
  id?: string
  season_id: string
  game_date: string | null
  opponent: string | null
  our_runs: number | null
  opp_runs: number | null
}

// Insert or update a game row.
export async function upsertGame(input: GameInput): Promise<Game> {
  const supabase = createClient()
  if (input.id) {
    const { data, error } = await supabase
      .from('games')
      .update({
        season_id: input.season_id,
        game_date: input.game_date,
        opponent: input.opponent,
        our_runs: input.our_runs,
        opp_runs: input.opp_runs,
      })
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .from('games')
    .insert({
      season_id: input.season_id,
      game_date: input.game_date,
      opponent: input.opponent,
      our_runs: input.our_runs,
      opp_runs: input.opp_runs,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Compute PotG from stored stat rows and persist it on the game row.
// Called from commitGame after stats are written; safe to call on re-saves.
export async function updatePotG(gameId: string): Promise<void> {
  const supabase = createClient()

  const [statsRes, playersRes] = await Promise.all([
    supabase.from('game_player_stats').select('*').eq('game_id', gameId),
    supabase.from('players').select('id, name'),
  ])
  if (statsRes.error || playersRes.error) return // non-fatal; PotG stays null

  const nameById = new Map((playersRes.data ?? []).map((p) => [p.id, p.name as string]))

  const lines: PotGLine[] = (statsRes.data ?? []).map((s) => ({
    player_id: s.player_id,
    name: nameById.get(s.player_id) ?? '',
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
  }))

  const { winnerId, score } = selectPotG(lines)
  await supabase
    .from('games')
    .update({ potg_player_id: winnerId, potg_score: score })
    .eq('id', gameId)
}
