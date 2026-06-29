'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'
import { FIELDING_POSITIONS } from '@/lib/positions'
import { createPlayerAction, updatePlayerAction } from '@/app/admin/roster/actions'

function PositionChips({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (pos: string) => void
}) {
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

function PlayerRow({ player }: { player: Player }) {
  const router = useRouter()
  const [gender, setGender] = useState<'M' | 'F' | ''>(player.gender ?? '')
  const [active, setActive] = useState(player.active)
  const [positions, setPositions] = useState<string[]>(player.positions ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty =
    (gender || null) !== (player.gender ?? null) ||
    active !== player.active ||
    positions.slice().sort().join(',') !== (player.positions ?? []).slice().sort().join(',')

  function togglePos(pos: string) {
    setPositions((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await updatePlayerAction(player.id, {
        gender: gender || null,
        active,
        positions,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-field-line bg-field-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-field-ink">{player.name}</span>

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

        <label className="flex items-center gap-1 text-xs text-field-muted">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>

        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-md bg-field-grass px-3 py-1.5 text-xs font-medium text-white hover:bg-field-grass/90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="mt-2">
        <PositionChips selected={positions} onToggle={togglePos} />
      </div>
    </div>
  )
}

function AddPlayer() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | ''>('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createPlayerAction({ name: name.trim(), gender: gender || null })
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

export function RosterEditor({ players }: { players: Player[] }) {
  const active = players.filter((p) => p.active)
  const inactive = players.filter((p) => !p.active)

  return (
    <div className="space-y-4">
      <AddPlayer />

      <div className="space-y-1.5">
        {active.map((p) => (
          <PlayerRow key={p.id} player={p} />
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="space-y-1.5">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-field-muted">
            Inactive · {inactive.length}
          </summary>
          <div className="mt-2 space-y-1.5">
            {inactive.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
