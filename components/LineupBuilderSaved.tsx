'use client'

import { useMemo, useState } from 'react'
import type { Game, LineupLabPlayer, Season, Lineup } from '@/lib/types'
import { saveLineupAction } from '@/app/lineup/actions'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover', 'BE']

interface LineupBuilderSavedProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
  allGames: Game[]
  allLineups: Lineup[]
}

export function LineupBuilderSaved({
  players,
  seasons,
  selectedSeasonId,
  allGames,
  allLineups,
}: LineupBuilderSavedProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [order, setOrder] = useState<string[]>([])
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const upcomingGames = useMemo(
    () =>
      allGames
        .filter((g) => g.season_id === selectedSeasonId && g.game_date && g.game_date >= today)
        .sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? '')),
    [allGames, selectedSeasonId, today],
  )

  const selectedGame = upcomingGames.find((g) => g.id === selectedGameId)

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId)

    // Load existing lineup for this game
    const gameLineups = allLineups.filter((l) => l.game_id === gameId)
    if (gameLineups.length > 0) {
      const newOrder = gameLineups
        .filter((l) => l.batting_order)
        .sort((a, b) => (a.batting_order ?? 0) - (b.batting_order ?? 0))
        .map((l) => l.player_id)
      setOrder(newOrder)
      const posMap = new Map(gameLineups.map((l) => [l.player_id, l.starting_pos || '']))
      setPositions(posMap)
    } else {
      // Load previous game's lineup as template
      const prevGame = allGames
        .filter((g) => g.season_id === selectedSeasonId && g.game_date && g.game_date < (selectedGame?.game_date || today))
        .sort((a, b) => (b.game_date ?? '').localeCompare(a.game_date ?? ''))[0]

      if (prevGame) {
        const prevLineups = allLineups.filter((l) => l.game_id === prevGame.id)
        if (prevLineups.length > 0) {
          const newOrder = prevLineups
            .filter((l) => l.batting_order)
            .sort((a, b) => (a.batting_order ?? 0) - (b.batting_order ?? 0))
            .map((l) => l.player_id)
          setOrder(newOrder)
          const posMap = new Map(prevLineups.map((l) => [l.player_id, l.starting_pos || '']))
          setPositions(posMap)
        }
      }

      setOrder([])
      setPositions(new Map())
    }
  }

  const handlePositionChange = (playerId: string, pos: string) => {
    const newPos = new Map(positions)
    if (pos) {
      newPos.set(playerId, pos)
    } else {
      newPos.delete(playerId)
    }
    setPositions(newPos)
  }

  const handleSave = async () => {
    if (!selectedGameId || order.length === 0) {
      setSaveStatus({ type: 'error', msg: 'Select a game and add players to the lineup' })
      return
    }

    setSaving(true)
    setSaveStatus(null)

    try {
      const rows = order.map((playerId, idx) => ({
        player_id: playerId,
        batting_order: idx + 1,
        starting_pos: positions.get(playerId) ?? null,
      }))

      await saveLineupAction(selectedGameId, rows)
      setSaveStatus({ type: 'success', msg: '✓ Lineup saved' })
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      setSaveStatus({
        type: 'error',
        msg: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      })
    } finally {
      setSaving(false)
    }
  }

  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

  return (
    <div className="space-y-6">
      {/* Game selector */}
      <div className="rounded-lg border border-field-line bg-field-paper p-4">
        <label className="block text-sm font-semibold text-field-ink">Select game:</label>
        <select
          value={selectedGameId}
          onChange={(e) => handleSelectGame(e.target.value)}
          className="mt-2 w-full rounded border border-field-line px-3 py-2 text-sm"
        >
          <option value="">Choose a game...</option>
          {upcomingGames.map((g) => (
            <option key={g.id} value={g.id}>
              {g.game_date} vs {g.opponent ?? 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      {selectedGame && (
        <>
          {/* Info chip */}
          <div className="rounded-lg bg-field-cream/50 p-3">
            <p className="text-sm text-field-muted">
              {selectedGame.game_date} • <strong>{selectedGame.opponent}</strong>
            </p>
          </div>

          {/* Lineup editor */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
              Lineup · {order.length} players
            </h3>

            {/* Player list with position selector */}
            <ol className="space-y-1.5">
              {order.map((playerId, idx) => {
                const player = playerMap.get(playerId)
                if (!player) return null

                return (
                  <li
                    key={playerId}
                    className="flex items-center gap-2 rounded-lg border border-field-line bg-field-paper p-3"
                  >
                    <span className="w-6 shrink-0 text-right font-semibold text-field-grass">{idx + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-field-ink">{player.name}</span>

                    {/* Position selector */}
                    <select
                      value={positions.get(playerId) || ''}
                      onChange={(e) => handlePositionChange(playerId, e.target.value)}
                      className="rounded border border-field-line px-2 py-1 text-xs text-field-ink"
                    >
                      <option value="">—</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => setOrder((o) => o.filter((_, i) => i !== idx))}
                      className="flex h-8 w-8 items-center justify-center rounded text-xs text-field-clay hover:bg-field-clay/10"
                      aria-label="Remove player"
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ol>

            {/* Add player button */}
            {order.length < players.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-muted">Available</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {players
                    .filter((p) => !order.includes(p.player_id))
                    .map((p) => (
                      <li key={p.player_id}>
                        <button
                          type="button"
                          onClick={() => setOrder((o) => [...o, p.player_id])}
                          className="w-full rounded border border-field-line bg-field-paper px-3 py-2 text-left text-xs font-medium text-field-ink hover:border-field-grass hover:bg-field-grass/5"
                        >
                          + {p.name}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* Save button + status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || order.length === 0}
              className="rounded-md bg-field-grass px-4 py-2 text-sm font-medium text-white hover:bg-field-clay active:scale-95 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Lineup'}
            </button>
            {saveStatus && (
              <span
                className={`text-sm font-medium ${
                  saveStatus.type === 'success' ? 'text-green-700' : 'text-field-clay'
                }`}
              >
                {saveStatus.msg}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
