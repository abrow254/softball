'use client'

import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import type { Player } from '@/lib/types'
import { SIT } from '@/lib/entry'
import { createPlayerAction } from '@/app/games/actions'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Rover', SIT]
// Positions a real fielder occupies — duplicates here are worth flagging.
// SIT and blank are intentionally allowed to repeat.
const FIELD_POSITIONS = new Set(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Rover'])

interface BuilderRow {
  player_id: string
  name: string
  starting_pos: string
}

type CardTarget = 'lineup' | 'scorecard'

export interface LineupBuilderProps {
  players: Player[]
  defaultRows?: BuilderRow[]
}

export function LineupBuilder({ players: initialPlayers, defaultRows = [] }: LineupBuilderProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [rows, setRows] = useState<BuilderRow[]>(defaultRows)
  const [gameLabel, setGameLabel] = useState('')
  const [opponent, setOpponent] = useState('')

  const [addPlayerId, setAddPlayerId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRegular, setNewRegular] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Single source of truth for both the on-screen preview and which printable
  // carries `print-card`. The other printable is display:none (also in print),
  // so only the selected sheet ever prints (globals.css: one card at a time).
  const [target, setTarget] = useState<CardTarget>('lineup')
  const [previewOpen, setPreviewOpen] = useState(false)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Native drag is desktop-only; on touch it just fights text selection.
  const [canDrag, setCanDrag] = useState(false)
  useEffect(() => {
    setCanDrag(window.matchMedia('(pointer: fine)').matches)
  }, [])

  const availablePlayers = useMemo(
    () => players.filter((p) => !rows.some((r) => r.player_id === p.id)),
    [players, rows],
  )

  // Non-blocking validity hints: starters with no position, and field
  // positions assigned to more than one player.
  const summary = useMemo(() => {
    const unset = rows.filter((r) => !r.starting_pos).length
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (FIELD_POSITIONS.has(r.starting_pos)) counts.set(r.starting_pos, (counts.get(r.starting_pos) ?? 0) + 1)
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([pos]) => pos)
    return { batters: rows.length, unset, dupes }
  }, [rows])

  function addRow(playerId: string) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    setRows((rs) => [...rs, { player_id: player.id, name: player.name, starting_pos: '' }])
    setAddPlayerId('')
  }

  function removeRow(playerId: string) {
    setRows((rs) => rs.filter((r) => r.player_id !== playerId))
  }

  function setPos(playerId: string, pos: string) {
    setRows((rs) => rs.map((r) => (r.player_id === playerId ? { ...r, starting_pos: pos } : r)))
  }

  function move(index: number, dir: -1 | 1) {
    setRows((rs) => {
      const next = index + dir
      if (next < 0 || next >= rs.length) return rs
      const copy = [...rs]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  function onDrop(targetIndex: number) {
    setRows((rs) => {
      if (dragIndex === null || dragIndex === targetIndex) return rs
      const copy = [...rs]
      const [moved] = copy.splice(dragIndex, 1)
      copy.splice(targetIndex, 0, moved)
      return copy
    })
    setDragIndex(null)
  }

  async function handleCreatePlayer() {
    const name = newName.trim()
    if (!name) return
    try {
      const player = await createPlayerAction({ name, is_regular: newRegular })
      setPlayers((ps) => [...ps, player].sort((a, b) => a.name.localeCompare(b.name)))
      setRows((rs) => [...rs, { player_id: player.id, name: player.name, starting_pos: '' }])
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create player')
    }
  }

  // flushSync so the chosen printable is un-hidden in the DOM *before* the
  // synchronous print dialog opens.
  function print(which: CardTarget) {
    flushSync(() => setTarget(which))
    window.print()
  }

  const lineupRows: LineupCardRow[] = rows.map((r, i) => ({
    batting_order: i + 1,
    name: r.name,
    starting_pos: r.starting_pos,
  }))
  const scorecardRows: PrintableCardRow[] = rows.map((r, i) => ({
    batting_order: i + 1,
    name: r.name,
    starting_pos: r.starting_pos,
  }))

  const empty = rows.length === 0

  // "Game 4 v. The Garbage Cans" — falls back gracefully as fields fill in.
  const title =
    [gameLabel.trim(), opponent.trim() ? `v. ${opponent.trim()}` : ''].filter(Boolean).join(' ') ||
    'The Softball Team'

  return (
    <div className="space-y-6 pb-28">
      {/* ---- Game header (no-print) ---- */}
      <section className="no-print rounded-lg border border-field-line bg-field-paper p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Game</span>
            <input
              type="text"
              value={gameLabel}
              onChange={(e) => setGameLabel(e.target.value)}
              placeholder="Game 4"
              className="h-11 w-full rounded-md border border-field-line-strong bg-white px-3"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Opponent</span>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="The Garbage Cans"
              className="h-11 w-full rounded-md border border-field-line-strong bg-white px-3"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-field-muted">
          Prints as <span className="font-semibold text-field-ink">{title}</span>
        </p>
      </section>

      {/* ---- Batting order (no-print) ---- */}
      <section className="no-print">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-field-muted">Batting order</h2>
        <p className="mb-2 text-xs text-field-muted">
          {canDrag ? 'Drag rows to reorder, or' : 'Use'} <span aria-hidden>▲▼</span> to move a player. Set{' '}
          <strong>{SIT}</strong> for anyone not batting.
        </p>
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={row.player_id}
              draggable={canDrag}
              onDragStart={() => canDrag && setDragIndex(i)}
              onDragOver={(e) => canDrag && e.preventDefault()}
              onDrop={() => canDrag && onDrop(i)}
              className={[
                'flex items-center gap-2 rounded-lg border border-field-line bg-field-paper py-1.5 pl-2.5 pr-1.5',
                dragIndex === i ? 'opacity-50' : '',
              ].join(' ')}
            >
              {canDrag && (
                <span className="w-4 cursor-grab select-none text-field-muted" aria-hidden>
                  ⠿
                </span>
              )}
              <span className="w-6 shrink-0 text-right font-semibold tabular text-field-grass">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-field-ink">{row.name}</span>
              <select
                value={row.starting_pos}
                onChange={(e) => setPos(row.player_id, e.target.value)}
                className="h-11 shrink-0 rounded-md border border-field-line-strong bg-white px-1.5 text-sm"
                aria-label={`Position for ${row.name}`}
              >
                <option value="">Pos</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-field-muted hover:bg-field-cream disabled:opacity-25"
                aria-label={`Move ${row.name} up`}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-field-muted hover:bg-field-cream disabled:opacity-25"
                aria-label={`Move ${row.name} down`}
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeRow(row.player_id)}
                className="ml-1 flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-field-clay hover:bg-field-clay/10"
                aria-label={`Remove ${row.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        {empty && (
          <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-6 text-center text-sm text-field-muted">
            No players yet. Add someone below to start the lineup.
          </p>
        )}
      </section>

      {/* ---- Add players (no-print) ---- */}
      <section className="no-print space-y-4 rounded-lg border border-field-line bg-field-paper p-4">
        {/* Add an existing roster player — the common case. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-field-muted">Add player</span>
            <select
              value={addPlayerId}
              onChange={(e) => setAddPlayerId(e.target.value)}
              className="h-11 w-full rounded-md border border-field-line-strong bg-white px-2"
            >
              <option value="">Select…</option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_regular ? '' : ' (ringer)'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!addPlayerId}
            onClick={() => addRow(addPlayerId)}
            className="h-11 rounded-md border border-field-grass px-4 font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-50 sm:w-auto"
          >
            Add
          </button>
        </div>

        {/* Create a brand-new player. */}
        <div className="space-y-2 border-t border-field-line pt-3">
          <label className="block text-sm">
            <span className="mb-1 block text-field-muted">New player</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="h-11 w-full rounded-md border border-field-line-strong bg-white px-3 sm:w-64"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-field-line-strong" role="group" aria-label="Player type">
              <button
                type="button"
                onClick={() => setNewRegular(true)}
                className={`h-11 px-4 text-sm font-medium ${newRegular ? 'bg-field-grass text-white' : 'bg-white text-field-muted'}`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => setNewRegular(false)}
                className={`h-11 px-4 text-sm font-medium ${!newRegular ? 'bg-field-grass text-white' : 'bg-white text-field-muted'}`}
              >
                Ringer
              </button>
            </div>
            <button
              type="button"
              disabled={!newName.trim()}
              onClick={handleCreatePlayer}
              className="h-11 rounded-md border border-field-grass px-4 font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-50"
            >
              Create &amp; add
            </button>
          </div>
        </div>
      </section>

      {error && <p className="no-print text-sm text-field-clay">{error}</p>}

      {/* ---- Preview (no-print, collapsed by default) ---- */}
      <section className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((o) => !o)}
            disabled={empty}
            className="text-sm font-medium text-field-grass hover:underline disabled:opacity-50"
          >
            {previewOpen ? 'Hide preview' : 'Show preview'}
          </button>
          {previewOpen && (
            <div className="inline-flex overflow-hidden rounded-md border border-field-line-strong" role="group" aria-label="Preview sheet">
              <button
                type="button"
                onClick={() => setTarget('lineup')}
                className={`h-9 px-3 text-sm font-medium ${target === 'lineup' ? 'bg-field-grass text-white' : 'bg-white text-field-muted'}`}
              >
                Lineup card
              </button>
              <button
                type="button"
                onClick={() => setTarget('scorecard')}
                className={`h-9 px-3 text-sm font-medium ${target === 'scorecard' ? 'bg-field-grass text-white' : 'bg-white text-field-muted'}`}
              >
                Scorecard
              </button>
            </div>
          )}
        </div>
        {previewOpen && !empty && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-field-line bg-field-paper p-4">
            {target === 'lineup' ? (
              <BattingLineupCard title={title} rows={lineupRows} />
            ) : (
              <PrintableCard title={title} opponent={opponent || null} rows={scorecardRows} />
            )}
          </div>
        )}
      </section>

      {/* ---- Printables. Active one is print:block; the other never prints. ---- */}
      <div className={`hidden ${target === 'lineup' ? 'print:block' : 'print:hidden'}`} aria-hidden>
        <BattingLineupCard title={title} rows={lineupRows} />
      </div>
      <div className={`hidden ${target === 'scorecard' ? 'print:block' : 'print:hidden'}`} aria-hidden>
        <PrintableCard title={title} opponent={opponent || null} rows={scorecardRows} />
      </div>

      {/* ---- Sticky print bar (no-print) ---- */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-field-line bg-field-cream/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-field-cream/80">
        <div className="mx-auto max-w-6xl space-y-2">
          {!empty && (
            <p className="text-center text-xs text-field-muted">
              {summary.batters} batter{summary.batters === 1 ? '' : 's'}
              {summary.unset > 0 && <> · {summary.unset} position{summary.unset === 1 ? '' : 's'} unset</>}
              {summary.dupes.length > 0 && (
                <span className="text-field-clay"> · {summary.dupes.join(', ')} assigned twice</span>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={empty}
              onClick={() => print('lineup')}
              className="flex-1 rounded-md bg-field-grass px-3 py-2.5 text-center font-medium leading-tight text-white hover:bg-field-grass/90 disabled:opacity-50"
            >
              Print lineup card
              <span className="block text-[11px] font-normal text-white/80">Batting order &amp; positions</span>
            </button>
            <button
              type="button"
              disabled={empty}
              onClick={() => print('scorecard')}
              className="flex-1 rounded-md border border-field-grass px-3 py-2.5 text-center font-medium leading-tight text-field-grass hover:bg-field-grass/5 disabled:opacity-50"
            >
              Print blank scorecard
              <span className="block text-[11px] font-normal text-field-muted">7-inning grid to fill in</span>
            </button>
          </div>
          <div className="text-center">
            <Link href="/games" className="text-xs text-field-muted hover:text-field-ink">
              Back to games
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
