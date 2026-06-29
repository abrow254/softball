'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { LineupLabPlayer, Season } from '@/lib/types'
import { LineupLab } from '@/components/LineupLab'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover', 'BE']
const FIELD_POSITIONS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'Rover'])

type CardTarget = 'lineup' | 'scorecard'

interface LineupLabCompleteProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
}

export function LineupLabComplete({ players, seasons, selectedSeasonId }: LineupLabCompleteProps) {
  const [optimizedOrder, setOptimizedOrder] = useState<string[]>([])
  const [opponent, setOpponent] = useState('')
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')

  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

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
      {/* ---- Single unified Lineup Lab section ---- */}
      <section className="space-y-4 rounded-lg border border-field-line bg-field-paper p-4">
        {/* Optimizer */}
        <div className="-mx-4 -my-4 px-4 py-4 border-b border-field-line">
          <LineupLab
            players={players}
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onOrderChange={setOptimizedOrder}
          />
        </div>

        {!empty && (
          <>
            {/* Positions inline */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Assign Starting Positions</h3>
              <div className="space-y-1.5">
                {optimizedOrder.map((playerId, idx) => {
                  const player = playerMap.get(playerId)
                  if (!player) return null

                  return (
                    <div key={playerId} className="flex items-center gap-2">
                      <span className="w-6 text-right font-semibold text-field-grass text-sm">{idx + 1}.</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-field-ink text-sm">{player.name}</span>
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
                <p className="text-xs text-field-muted mt-2">
                  {summary.unset} {summary.unset === 1 ? 'player' : 'players'} missing position
                </p>
              )}
              {summary.dupes.length > 0 && (
                <p className="text-xs text-field-clay mt-2">
                  ⚠️ Duplicate positions: {summary.dupes.join(', ')}
                </p>
              )}
            </div>

            {/* Opponent */}
            <div className="pt-2 border-t border-field-line">
              <label className="block text-xs font-semibold text-field-muted uppercase tracking-wide mb-2">
                Opponent (optional)
              </label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g., Hot Mess"
                className="w-full rounded border border-field-line px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
      </section>

      {!empty && (
        <>
          {/* ---- Preview ---- */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Preview</h2>
            <div className="rounded-lg border border-field-line bg-field-paper p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-field-muted mb-2">Batting Order</p>
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
            </div>
          </section>

          {/* ---- Export/Print ---- */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => print('lineup')}
              className="rounded-md bg-field-grass px-4 py-2 font-medium text-white hover:bg-field-grass/90"
            >
              Export Lineup Card
            </button>
            <button
              type="button"
              onClick={() => print('scorecard')}
              className="rounded-md border border-field-line-strong px-4 py-2 font-medium text-field-ink hover:bg-field-cream"
            >
              Export Scorecard
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
        </>
      )}
    </div>
  )
}
