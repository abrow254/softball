'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Game, LineupLabPlayer, Season } from '@/lib/types'
import { LineupLab } from '@/components/LineupLab'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

type CardTarget = 'lineup' | 'scorecard'

interface LineupLabCompleteProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
  allGames: Game[]
}

export function LineupLabComplete({
  players,
  seasons,
  selectedSeasonId,
  allGames,
}: LineupLabCompleteProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Upcoming games for this season — earliest first. "Next game" = the first
  // one whose date is today or later, so the day after a game the card rolls
  // forward to the next matchup automatically.
  const upcomingGames = useMemo(
    () =>
      allGames
        .filter((g) => g.season_id === selectedSeasonId && g.game_date && g.game_date >= today)
        .sort((a, b) => (a.game_date ?? '').localeCompare(b.game_date ?? '')),
    [allGames, selectedSeasonId, today],
  )

  // Auto-select the next game on load.
  const [selectedGameId, setSelectedGameId] = useState<string>(() => upcomingGames[0]?.id ?? '')
  const [order, setOrder] = useState<string[]>([])
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')

  const selectedGame = upcomingGames.find((g) => g.id === selectedGameId)
  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

  function handlePositionChange(playerId: string, pos: string) {
    setPositions((prev) => {
      const next = new Map(prev)
      if (pos) next.set(playerId, pos)
      else next.delete(playerId)
      return next
    })
  }

  function print(which: CardTarget) {
    flushSync(() => setTarget(which))
    window.print()
  }

  const cardTitle = selectedGame?.opponent ? `v. ${selectedGame.opponent}` : 'The Softball Team'

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

  // The game-selection header injected at the top of the embedded Lineup Lab.
  const gameHeader = (
    <div className="space-y-3">
      <div className="rounded-lg border border-field-line bg-field-paper p-4">
        <label className="block text-sm font-semibold text-field-ink">Game</label>
        {upcomingGames.length > 0 ? (
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="mt-2 w-full rounded border border-field-line px-3 py-2 text-sm"
          >
            {upcomingGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.game_date} vs {g.opponent ?? 'Unknown'}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-sm text-field-muted">No upcoming games scheduled.</p>
        )}
      </div>
      {selectedGame && (
        <div className="rounded-lg bg-field-cream/50 p-3">
          <p className="text-sm text-field-muted">
            {selectedGame.game_date} • <strong>{selectedGame.opponent}</strong>
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Full Lineup Lab — trends, The Read, auto-optimize — with inline
          position selectors and game selection injected as the header. */}
      <LineupLab
        players={players}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        onOrderChange={setOrder}
        positions={positions}
        onPositionChange={handlePositionChange}
        embedded
        header={gameHeader}
      />

      {order.length > 0 && (
        <>
          {/* ---- Export ---- */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => print('lineup')}
              className="rounded-md bg-field-grass px-4 py-2 text-sm font-medium text-white hover:bg-field-grass/90"
            >
              Export Batting Order Card
            </button>
            <button
              type="button"
              onClick={() => print('scorecard')}
              className="rounded-md border border-field-line-strong px-4 py-2 text-sm font-medium text-field-ink hover:bg-field-cream"
            >
              Export Lineup / Scorecard
            </button>
          </section>

          {/* ---- Printable cards (hidden except on print) ---- */}
          <div className="hidden print:block space-y-4">
            {target === 'lineup' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <BattingLineupCard title={cardTitle} rows={lineupRows} />
              </div>
            )}
            {target === 'scorecard' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <PrintableCard
                  title={cardTitle}
                  opponent={selectedGame?.opponent ?? null}
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
