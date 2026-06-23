'use client'

import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import type { Player } from '@/lib/types'
import { SIT } from '@/lib/entry'
import { createPlayerAction } from '@/app/games/actions'
import { BattingLineupCard, type LineupCardRow } from '@/components/BattingLineupCard'
import { PrintableCard, type PrintableCardRow } from '@/components/PrintableCard'

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Rover', SIT]

interface BuilderRow {
  player_id: string
  name: string
  starting_pos: string
}

type PrintTarget = 'lineup' | 'scorecard'

export interface LineupBuilderProps {
  players: Player[]
  defaultRows?: BuilderRow[]
}

export function LineupBuilder({ players: initialPlayers, defaultRows = [] }: LineupBuilderProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [rows, setRows] = useState<BuilderRow[]>(defaultRows)
  const [opponent, setOpponent] = useState('')
  const [gameDate, setGameDate] = useState('')

  const [addPlayerId, setAddPlayerId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRegular, setNewRegular] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Which printable carries the `print-card` class when the print dialog opens.
  // Only one prints at a time (globals.css hides everything else).
  const [printTarget, setPrintTarget] = useState<PrintTarget>('lineup')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const availablePlayers = useMemo(
    () => players.filter((p) => !rows.some((r) => r.player_id === p.id)),
    [players, rows],
  )

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

  // Desktop drag-and-drop. Touch falls back to the up/down buttons.
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

  // flushSync so the chosen printable has `print-card` in the DOM *before* the
  // synchronous print dialog opens.
  function print(target: PrintTarget) {
    flushSync(() => setPrintTarget(target))
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

  return (
    <div className="space-y-6">
      {/* ---- Game header (no-print) ---- */}
      <section className="no-print rounded-lg border border-field-line bg-field-paper p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Opponent</span>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Sharks"
              className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Date</span>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            />
          </label>
        </div>
      </section>

      {/* ---- Batting order (no-print) ---- */}
      <section className="no-print">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">Batting order</h2>
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={row.player_id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className={[
                'flex items-center gap-2 rounded-lg border border-field-line bg-field-paper px-2.5 py-2',
                dragIndex === i ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span className="hidden w-5 cursor-grab select-none text-field-muted sm:block" aria-hidden>
                ⠿
              </span>
              <span className="w-6 text-right font-semibold tabular text-field-grass">{i + 1}</span>
              <span className="flex-1 truncate font-medium text-field-ink">{row.name}</span>
              <select
                value={row.starting_pos}
                onChange={(e) => setPos(row.player_id, e.target.value)}
                className="rounded-md border border-field-line-strong bg-white px-1.5 py-1 text-sm"
                aria-label={`Position for ${row.name}`}
              >
                <option value="">Pos</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1 leading-none text-field-muted hover:text-field-ink disabled:opacity-30"
                  aria-label={`Move ${row.name} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="px-1 leading-none text-field-muted hover:text-field-ink disabled:opacity-30"
                  aria-label={`Move ${row.name} down`}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.player_id)}
                className="px-1 text-field-clay hover:underline"
                aria-label={`Remove ${row.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-6 text-center text-sm text-field-muted">
            No players yet. Add someone below to start the lineup.
          </p>
        )}
        <p className="mt-2 text-xs text-field-muted">
          Drag to reorder on desktop, or use ▲▼ on mobile. Set <strong>{SIT}</strong> for anyone who isn&apos;t batting.
        </p>
      </section>

      {/* ---- Add players (no-print) ---- */}
      <section className="no-print flex flex-wrap items-end gap-4 rounded-lg border border-field-line bg-field-paper p-4">
        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Add player</span>
            <select
              value={addPlayerId}
              onChange={(e) => setAddPlayerId(e.target.value)}
              className="rounded-md border border-field-line-strong bg-white px-2 py-1.5"
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
            className="rounded-md border border-field-grass px-3 py-1.5 text-sm font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">New player</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-field-muted">
            <input type="checkbox" checked={newRegular} onChange={(e) => setNewRegular(e.target.checked)} />
            Regular
          </label>
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={handleCreatePlayer}
            className="rounded-md border border-field-grass px-3 py-1.5 text-sm font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-50"
          >
            Create &amp; add
          </button>
        </div>
      </section>

      {error && <p className="no-print text-sm text-field-clay">{error}</p>}

      {/* ---- Print actions (no-print) ---- */}
      <div className="no-print flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => print('lineup')}
          className="rounded-md bg-field-grass px-4 py-2 font-medium text-white hover:bg-field-grass/90 disabled:opacity-50"
        >
          Print lineup card
        </button>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => print('scorecard')}
          className="rounded-md border border-field-grass px-4 py-2 font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-50"
        >
          Print blank scorecard
        </button>
        <Link href="/games" className="text-sm text-field-muted hover:text-field-ink">
          Back to games
        </Link>
      </div>

      {/* ---- Printables. Only the active one carries `print-card`. ---- */}
      <div className={printTarget === 'lineup' ? '' : 'hidden'}>
        <BattingLineupCard opponent={opponent || null} gameDate={gameDate || null} rows={lineupRows} />
      </div>
      <div className={printTarget === 'scorecard' ? '' : 'hidden'}>
        <PrintableCard opponent={opponent || null} gameDate={gameDate || null} rows={scorecardRows} />
      </div>
    </div>
  )
}
