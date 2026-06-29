'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'
import { FIELDING_POSITIONS } from '@/lib/positions'
import { createPlayerAction, updatePlayerAction, setSeasonRosterAction } from '@/app/admin/roster/actions'

function PositionChips({ selected, onToggle }: { selected: string[]; onToggle: (pos: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {FIELDING_POSITIONS.map((pos) => {
        const on = selected.includes(pos)
        return (
          <button
            key={pos}
            type="button"
            onClick={() => onToggle(pos)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              on
                ? 'bg-field-grass text-white'
                : 'border border-field-line bg-field-paper text-field-muted hover:border-field-grass'
            }`}
          >
            {pos}
          </button>
        )
      })}
    </div>
  )
}

function PlayerRow({
  player,
  seasonId,
  onRoster,
}: {
  player: Player
  seasonId: string
  onRoster: boolean
}) {
  const router = useRouter()
  const [playing, setPlaying] = useState(onRoster)
  const [gender, setGender] = useState<'M' | 'F' | ''>(player.gender ?? '')
  const [positions, setPositions] = useState<string[]>(player.positions ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const detailsDirty =
    (gender || null) !== (player.gender ?? null) ||
    positions.slice().sort().join(',') !== (player.positions ?? []).slice().sort().join(',')

  function togglePos(pos: string) {
    setPositions((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]))
  }

  async function togglePlaying() {
    const next = !playing
    setPlaying(next)
    await setSeasonRosterAction(seasonId, player.id, next)
    router.refresh()
  }

  async function saveDetails() {
    setSaving(true)
    setSaved(false)
    try {
      await updatePlayerAction(player.id, { gender: gender || null, positions })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-lg border p-3 ${playing ? 'border-field-line bg-field-paper' : 'border-field-line bg-field-cream/30'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={playing} onChange={togglePlaying} />
          <span className={playing ? 'font-medium text-field-ink' : 'text-field-muted'}>{player.name}</span>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F' | '')}
            className="rounded border border-field-line px-2 py-1 text-xs"
            aria-label={`Gender for ${player.name}`}
          >
            <option value="">— gender</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
          <button
            type="button"
            onClick={saveDetails}
            disabled={!detailsDirty || saving}
            className="rounded-md bg-field-grass px-3 py-1.5 text-xs font-medium text-white hover:bg-field-grass/90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <PositionChips selected={positions} onToggle={togglePos} />
        {positions.length > 0 && (
          <p className="text-[11px] text-field-muted">
            Depth chart (primary → backup): <span className="font-medium text-field-ink">{positions.join(' → ')}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function AddPlayer({ seasonId }: { seasonId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | ''>('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const player = await createPlayerAction({ name: name.trim(), gender: gender || null })
      // New players join the selected season's roster by default.
      await setSeasonRosterAction(seasonId, player.id, true)
      setName('')
      setGender('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-field-line-strong bg-field-paper p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New player name"
        className="min-w-0 flex-1 rounded border border-field-line px-3 py-1.5 text-sm"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value as 'M' | 'F' | '')}
        className="rounded border border-field-line px-2 py-1.5 text-xs"
      >
        <option value="">— gender</option>
        <option value="M">M</option>
        <option value="F">F</option>
      </select>
      <button
        type="button"
        onClick={add}
        disabled={!name.trim() || busy}
        className="rounded-md border border-field-grass px-3 py-1.5 text-xs font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-40"
      >
        + Add player
      </button>
    </div>
  )
}

export function RosterEditor({
  players,
  seasonId,
  seasonLabel,
  rosterIds,
}: {
  players: Player[]
  seasonId: string
  seasonLabel: string
  rosterIds: string[]
}) {
  const rosterSet = new Set(rosterIds)
  const onRoster = players.filter((p) => rosterSet.has(p.id))
  const others = players.filter((p) => !rosterSet.has(p.id))

  return (
    <div className="space-y-4">
      <AddPlayer seasonId={seasonId} />

      <section className="space-y-1.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">
          Playing {seasonLabel} · {onRoster.length}
        </h2>
        {onRoster.length === 0 && (
          <p className="text-sm text-field-muted">No one on the roster yet — check players below.</p>
        )}
        {onRoster.map((p) => (
          <PlayerRow key={p.id} player={p} seasonId={seasonId} onRoster />
        ))}
      </section>

      {others.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-field-muted">
            Not playing {seasonLabel} · {others.length}
          </summary>
          <div className="mt-2 space-y-1.5">
            {others.map((p) => (
              <PlayerRow key={p.id} player={p} seasonId={seasonId} onRoster={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
