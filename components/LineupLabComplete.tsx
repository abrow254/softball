'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Game, LineupLabPlayer, Season, Lineup } from '@/lib/types'
import { optimize } from '@/lib/optimizer'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover', 'BE']
const FIELD_POSITIONS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover'])

type CardTarget = 'lineup' | 'scorecard'

interface LineupLabCompleteProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
  allGames: Game[]
  allLineups: Lineup[]
}

export function LineupLabComplete({
  players,
  seasons,
  selectedSeasonId,
  allGames,
  allLineups,
}: LineupLabCompleteProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [order, setOrder] = useState<string[]>([])
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')

  const today = new Date().toISOString().slice(0, 10)

  const upcomingGames = useMemo(
    () =>
      allGames
        .filter((g) => g.season_id === selectedSeasonId && g.game_date && g.game_date >= today)
        .sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? '')),
    [allGames, selectedSeasonId, today],
  )

  const selectedGame = upcomingGames.find((g) => g.id === selectedGameId)
  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

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
      // Auto-optimize for this game
      const inputs = players.map((p) => ({
        player_id: p.player_id,
        gender: p.gender,
        obp: p.obp,
        slg: p.slg,
        ops: p.ops,
      }))
      const result = optimize(inputs)
      setOrder(result.feasible ? result.order : inputs.map((p) => p.player_id))
      setPositions(new Map())
    }
  }

  function handlePositionChange(playerId: string, pos: string) {
    const newPos = new Map(positions)
    if (pos) {
      newPos.set(playerId, pos)
    } else {
      newPos.delete(playerId)
    }
    setPositions(newPos)
  }

  function print(which: CardTarget) {
    flushSync(() => setTarget(which))
    window.print()
  }

  const lineupRows: LineupCardRow[] = order.map((id, i) => ({
    batting_order: i + 1,
    name: playerMap.get(id)?.name ?? 'Unknown',
    starting_pos: positions.get(id) || '',
  }))

  const scorecardRows: PrintableCardRow[] = order.map((id, i) => ({
    batting_order: i + 1,
    name: playerMap.get(id)?.name ?? 'Unknown',
    starting_pos: positions.get(id) || '',
  }))

  const empty = order.length === 0

  return (
    <div className="space-y-6">
      {/* ---- Game Selection ---- */}
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

      {selectedGame && !empty && (
        <>
          {/* ---- Game Info ---- */}
          <div className="rounded-lg bg-field-cream/50 p-3">
            <p className="text-sm text-field-muted">
              {selectedGame.game_date} • <strong>{selectedGame.opponent}</strong>
            </p>
          </div>

          {/* ---- Batting Order with inline positions ---- */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
              Batting Order · {order.length} players
            </h3>
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

                    {/* Position selector inline */}
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
          </section>

          {/* ---- Preview ---- */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Preview</h3>
            <div className="rounded-lg border border-field-line bg-field-paper p-4">
              <ol className="space-y-1">
                {lineupRows.map((row) => (
                  <li key={row.batting_order} className="flex items-center gap-2 text-sm text-field-ink">
                    <span className="font-semibold text-field-grass w-5">{row.batting_order}.</span>
                    <span className="flex-1">{row.name}</span>
                    {row.starting_pos && (
                      <span className="rounded bg-field-cream px-2 py-0.5 text-xs font-medium text-field-muted">
                        {row.starting_pos}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ---- Export Buttons ---- */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => print('lineup')}
              className="rounded-md bg-field-grass px-4 py-2 text-sm font-medium text-white hover:bg-field-grass/90"
            >
              Export Lineup Card
            </button>
            <button
              type="button"
              onClick={() => print('scorecard')}
              className="rounded-md border border-field-line-strong px-4 py-2 text-sm font-medium text-field-ink hover:bg-field-cream"
            >
              Export Scorecard
            </button>
          </section>

          {/* ---- Printable Cards (hidden except on print) ---- */}
          <div className="hidden print:block space-y-4">
            {target === 'lineup' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <BattingLineupCard
                  title={selectedGame.opponent ? `v. ${selectedGame.opponent}` : 'The Softball Team'}
                  rows={lineupRows}
                />
              </div>
            )}
            {target === 'scorecard' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <PrintableCard
                  title={selectedGame.opponent ? `v. ${selectedGame.opponent}` : 'The Softball Team'}
                  opponent={selectedGame.opponent}
                  rows={scorecardRows}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
