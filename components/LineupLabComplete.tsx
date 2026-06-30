'use client'

import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import type { LineupLabPlayer, Season, AvailabilityStatus } from '@/lib/types'
import type { OppAnalysis } from '@/lib/opponentScouting'
import { LineupLab } from '@/components/LineupLab'
import { OpponentScouting } from '@/components/OpponentScouting'
import { AlignmentBuilder } from '@/components/AlignmentBuilder'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'
import { calcLineupScore, getSlotConfigs } from '@/lib/optimizer'
import { setAvailabilityAction, saveLineupForMatchAction } from '@/app/lineup/actions'

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
  // Availability by game date: playerId -> status. Seeds the RSVP toggles.
  availabilityByDate: Record<string, { player_id: string; status: AvailabilityStatus }[]>
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
  availabilityByDate,
}: LineupLabCompleteProps) {
  // Auto-select the next game (earliest upcoming) on load.
  const [selectedDate, setSelectedDate] = useState<string>(() => upcomingMatches[0]?.date ?? '')
  const [order, setOrder] = useState<string[]>([])
  const [positions, setPositions] = useState<Map<string, string>>(new Map())
  const [target, setTarget] = useState<CardTarget>('lineup')
  const [pinnedB, setPinnedB] = useState<{ score: number; n: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // RSVP availability for the selected date: playerId -> status. Seeded from the
  // server, edited optimistically as toggles are clicked.
  const [availability, setAvailability] = useState<Map<string, AvailabilityStatus>>(new Map())
  useEffect(() => {
    const rows = availabilityByDate[selectedDate] ?? []
    setAvailability(new Map(rows.map((r) => [r.player_id, r.status])))
  }, [selectedDate, availabilityByDate])

  const selectedMatch = upcomingMatches.find((m) => m.date === selectedDate) ?? null
  const playerMap = useMemo(() => new Map(players.map((p) => [p.player_id, p])), [players])

  // Players the optimizer should consider: everyone not explicitly marked "out".
  const availablePlayers = useMemo(
    () => players.filter((p) => availability.get(p.player_id) !== 'out'),
    [players, availability],
  )
  // Re-key the optimizer so it re-optimizes over the available set when the game
  // or availability changes.
  const labKey = `${selectedDate}|${availablePlayers.map((p) => p.player_id).sort().join(',')}`

  async function toggleAvailability(playerId: string, status: AvailabilityStatus) {
    if (!selectedDate) return
    setAvailability((prev) => {
      const next = new Map(prev)
      next.set(playerId, status)
      return next
    })
    try {
      await setAvailabilityAction(selectedSeasonId, selectedDate, playerId, status)
    } catch {
      // best-effort; the optimistic state stays
    }
  }

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

  async function saveLineup() {
    if (!selectedMatch || order.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const rows = order.map((id, i) => ({
        player_id: id,
        batting_order: i + 1,
        starting_pos: positions.get(id) || null,
      }))
      await saveLineupForMatchAction(selectedSeasonId, selectedMatch.date, selectedMatch.opponent, rows)
      setSaveMsg('✓ Lineup saved')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) {
      setSaveMsg(`Error: ${e instanceof Error ? e.message : 'could not save'}`)
    } finally {
      setSaving(false)
    }
  }

  // Current lineup score (slot-value model) for the live order.
  const currentScore = useMemo(() => {
    if (order.length === 0) return 0
    const slots = getSlotConfigs(order.length)
    return calcLineupScore(
      order.map((id) => ({ obp: playerMap.get(id)?.obp ?? 0, slg: playerMap.get(id)?.slg ?? 0 })),
      slots,
    )
  }, [order, playerMap])

  // Defensive alignment entries (batting order + assigned position + eligibility).
  const alignmentEntries = useMemo(
    () =>
      order.map((id) => ({
        name: playerMap.get(id)?.name ?? 'Unknown',
        pos: positions.get(id) || '',
        eligible: playerMap.get(id)?.positions ?? [],
      })),
    [order, positions, playerMap],
  )

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

      {/* Availability / RSVP — players marked "out" are dropped from the optimizer */}
      {selectedMatch && (
        <details className="rounded-lg border border-field-line bg-field-paper p-3">
          <summary className="cursor-pointer text-sm font-semibold text-field-ink">
            Availability · {availablePlayers.length} in
          </summary>
          <ul className="mt-2 space-y-1">
            {players.map((p) => {
              const status = availability.get(p.player_id) ?? 'in'
              return (
                <li key={p.player_id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-field-ink">{p.name}</span>
                  <div className="flex shrink-0 gap-1">
                    {(['in', 'maybe', 'out'] as AvailabilityStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleAvailability(p.player_id, s)}
                        className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                          status === s
                            ? s === 'out'
                              ? 'bg-field-clay text-white'
                              : s === 'maybe'
                                ? 'bg-field-gold text-field-ink'
                                : 'bg-field-grass text-white'
                            : 'border border-field-line text-field-muted hover:bg-field-cream'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Game selection, scouting & availability above the optimizer. */}
      {gameHeader}

      {/* Full Lineup Lab — trends, The Read, auto-optimize, inline positions.
          Keyed on the available set so it re-optimizes when availability or the
          selected game changes. */}
      <LineupLab
        key={labKey}
        players={availablePlayers}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        onOrderChange={setOrder}
        positions={positions}
        onPositionChange={handlePositionChange}
        embedded
      />

      {order.length > 0 && (
        <>
          {/* ---- Lineup score + A/B what-if ---- */}
          <section className="rounded-lg border border-field-line bg-field-paper p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wide text-field-muted">Lineup score</span>
                <span className="ml-2 tabular text-lg font-semibold text-field-ink">{currentScore.toFixed(3)}</span>
                {pinnedB && (
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentScore > pinnedB.score
                        ? 'text-field-grass'
                        : currentScore < pinnedB.score
                          ? 'text-field-clay'
                          : 'text-field-muted'
                    }`}
                  >
                    {currentScore >= pinnedB.score ? '+' : ''}
                    {(currentScore - pinnedB.score).toFixed(3)} vs B ({pinnedB.score.toFixed(3)})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinnedB({ score: currentScore, n: order.length })}
                  className="rounded-md border border-field-line-strong px-3 py-1.5 text-xs font-medium text-field-ink hover:bg-field-cream"
                >
                  Pin as B
                </button>
                {pinnedB && (
                  <button
                    type="button"
                    onClick={() => setPinnedB(null)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-field-muted hover:bg-field-cream"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-field-muted">
              Slot-weighted on-base + slugging. Pin a lineup as B, rearrange, and compare — higher is better.
            </p>
          </section>

          {/* ---- Defensive alignment ---- */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Defensive alignment</h2>
            <AlignmentBuilder entries={alignmentEntries} />
          </section>

          {/* ---- Save + Export ---- */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveLineup}
              disabled={saving || !selectedMatch}
              className="rounded-md bg-field-grass px-4 py-2 text-sm font-medium text-white hover:bg-field-grass/90 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save lineup'}
            </button>
            <button
              type="button"
              onClick={() => print('lineup')}
              className="rounded-md border border-field-line-strong px-4 py-2 text-sm font-medium text-field-ink hover:bg-field-cream"
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
            {saveMsg && (
              <span
                className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-field-clay' : 'text-field-grass'}`}
              >
                {saveMsg}
              </span>
            )}
          </section>
          <p className="text-xs text-field-muted">
            Saving stores the batting order and positions on this game — it powers the by-batting-order stats and stays
            attached when you enter the box score later.
          </p>

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
