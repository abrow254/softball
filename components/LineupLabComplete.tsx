'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { LineupLabPlayer, Season } from '@/lib/types'
import type { OppAnalysis } from '@/lib/opponentScouting'
import { LineupLab } from '@/components/LineupLab'
import { OpponentScouting } from '@/components/OpponentScouting'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

type CardTarget = 'lineup' | 'scorecard'

// An upcoming game from the scraped schedule, with opponent scouting attached.
export interface UpcomingMatch {
  date: string
  opponent: string
  time: string | null
  record: string | null
  analysis: OppAnalysis | null
}

interface LineupLabCompleteProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
  upcomingMatches: UpcomingMatch[]
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function LineupLabComplete({
  players,
  seasons,
  selectedSeasonId,
  upcomingMatches,
}: LineupLabCompleteProps) {
  // Auto-select the next game (earliest upcoming) on load.
  const [selectedDate, setSelectedDate] = useState<string>(() => upcomingMatches[0]?.date ?? '')
  const [order, setOrder] = useState<string[]>([])
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')

  const selectedMatch = upcomingMatches.find((m) => m.date === selectedDate) ?? null
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

  const cardTitle = selectedMatch?.opponent ? `v. ${selectedMatch.opponent}` : 'The Softball Team'

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

  // Game header (with opponent scouting) injected at the top of the Lineup Lab.
  const gameHeader = (
    <div className="space-y-3">
      <div className="rounded-lg border border-field-line bg-field-paper p-4">
        <label className="block text-sm font-semibold text-field-ink">Next game</label>
        {upcomingMatches.length > 0 ? (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 w-full rounded border border-field-line px-3 py-2 text-sm"
          >
            {upcomingMatches.map((m) => (
              <option key={m.date} value={m.date}>
                {prettyDate(m.date)} vs {m.opponent}
                {m.time ? ` · ${m.time}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-sm text-field-muted">No upcoming games scheduled.</p>
        )}
      </div>

      {selectedMatch && (
        <div className="rounded-lg border border-field-line bg-field-cream/40 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-field-ink">
              <strong>{selectedMatch.opponent}</strong>
            </p>
            <p className="text-xs text-field-muted">
              {prettyDate(selectedMatch.date)}
              {selectedMatch.time ? ` · ${selectedMatch.time}` : ''}
            </p>
          </div>
          {selectedMatch.analysis ? (
            <div className="mt-2">
              <OpponentScouting analysis={selectedMatch.analysis} record={selectedMatch.record} />
            </div>
          ) : (
            selectedMatch.record && (
              <p className="mt-1 text-xs text-field-muted">Opp record {selectedMatch.record}</p>
            )
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Full Lineup Lab — trends, The Read, auto-optimize — with inline
          position selectors and the next-game header injected on top. */}
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
                  opponent={selectedMatch?.opponent ?? null}
                  date={selectedMatch?.date ?? null}
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
