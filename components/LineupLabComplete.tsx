'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { LineupLabPlayer, Season } from '@/lib/types'
import { LineupLab } from '@/components/LineupLab'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'
import { PrintButton } from '@/components/PrintButton'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover', 'BE']
const FIELD_POSITIONS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover'])

type CardTarget = 'lineup' | 'scorecard'

interface LineupLabCompleteProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
}

export function LineupLabComplete({ players, seasons, selectedSeasonId }: LineupLabCompleteProps) {
  // Optimizer state passed from LineupLab
  const [optimizedOrder, setOptimizedOrder] = useState<string[]>([])
  const [opponent, setOpponent] = useState('')
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')

  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

  // Validation summary
  const summary = useMemo(() => {
    const unset = optimizedOrder.filter((id) => !positions.get(id)).length
    const counts = new Map<string, number>()
    for (const id of optimizedOrder) {
      const pos = positions.get(id)
      if (pos && FIELD_POSITIONS.has(pos)) {
        counts.set(pos, (counts.get(pos) ?? 0) + 1)
      }
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([pos]) => pos)
    return { batters: optimizedOrder.length, unset, dupes }
  }, [optimizedOrder, positions])

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

  const lineupRows: LineupCardRow[] = optimizedOrder.map((id, i) => ({
    batting_order: i + 1,
    name: playerMap.get(id)?.name ?? 'Unknown',
    starting_pos: positions.get(id) || '',
  }))

  const scorecardRows: PrintableCardRow[] = optimizedOrder.map((id, i) => ({
    batting_order: i + 1,
    name: playerMap.get(id)?.name ?? 'Unknown',
    starting_pos: positions.get(id) || '',
  }))

  const empty = optimizedOrder.length === 0

  return (
    <div className="space-y-6">
      {/* ---- Lineup Lab Optimizer ---- */}
      <section>
        <LineupLab
          players={players}
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onOrderChange={setOptimizedOrder}
        />
      </section>

      {!empty && (
        <>
          {/* ---- Batting Order with inline position assignment ---- */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Batting Order & Positions</h2>
            <div className="space-y-1.5">
              {optimizedOrder.map((playerId, idx) => {
                const player = playerMap.get(playerId)
                if (!player) return null

                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 rounded-lg border border-field-line bg-field-paper p-3"
                  >
                    <span className="w-6 shrink-0 text-right font-semibold text-field-grass">{idx + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-field-ink">{player.name}</span>
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
                  </div>
                )
              })}
            </div>

            {/* Validation warnings */}
            {summary.unset > 0 && (
              <p className="text-xs text-field-muted">
                {summary.unset} {summary.unset === 1 ? 'player' : 'players'} missing position
              </p>
            )}
            {summary.dupes.length > 0 && (
              <p className="text-xs text-field-clay">
                ⚠️ Duplicate positions: {summary.dupes.join(', ')}
              </p>
            )}
          </section>

          {/* ---- Game Info ---- */}
          <section className="rounded-lg border border-field-line bg-field-paper p-4">
            <label className="block text-sm font-semibold text-field-ink">
              Opponent (for printable card)
            </label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="e.g., Hot Mess"
              className="mt-2 w-full rounded border border-field-line px-3 py-2 text-sm"
            />
          </section>

          {/* ---- Preview & Export ---- */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => print('lineup')}
              className="rounded-md bg-field-grass px-4 py-2 font-medium text-white hover:bg-field-grass/90"
            >
              Print Lineup Card
            </button>
            <button
              type="button"
              onClick={() => print('scorecard')}
              className="rounded-md border border-field-line-strong px-4 py-2 font-medium text-field-ink hover:bg-field-cream"
            >
              Print Scorecard
            </button>
          </section>

          {/* ---- Printable Cards (hidden except on print) ---- */}
          <div className="hidden print:block space-y-4">
            {target === 'lineup' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <BattingLineupCard
                  title={opponent ? `v. ${opponent}` : 'The Softball Team'}
                  rows={lineupRows}
                />
              </div>
            )}
            {target === 'scorecard' && (
              <div className="rounded-lg border border-field-line bg-field-paper p-5 shadow-sm">
                <PrintableCard
                  title={opponent ? `v. ${opponent}` : 'The Softball Team'}
                  opponent={opponent}
                  rows={scorecardRows}
                />
              </div>
            )}
          </div>

          {/* ---- On-Screen Preview ---- */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Preview</h2>
            <div className="rounded-lg border border-field-line bg-field-paper p-4">
              <p className="mb-3 text-sm font-medium text-field-ink">
                Batting Order {opponent && `vs ${opponent}`}
              </p>
              <ol className="space-y-1 text-sm">
                {lineupRows.map((row) => (
                  <li key={row.batting_order} className="flex items-center gap-2 text-field-ink">
                    <span className="font-semibold text-field-grass">{row.batting_order}.</span>
                    <span>{row.name}</span>
                    {row.starting_pos && (
                      <span className="ml-auto rounded bg-field-cream px-2 py-0.5 text-xs font-medium text-field-muted">
                        {row.starting_pos}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
