'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Player, Season } from '@/lib/types'
import { computeStats, fmt3, type CountingLine } from '@/lib/formulas'
import { emptyStatLine, SIT, type EditorRow, type SaveGameInput, type StatLine } from '@/lib/entry'
import { gameResult } from '@/lib/types'
import { saveGame, createPlayerAction } from '@/app/games/actions'
import { aggregateCodes, type AtBatCode } from '@/lib/codes'
import { matchName } from '@/lib/name-match'
import type { ExtractedCard } from '@/lib/scorecard'
import { PhotoUpload } from '@/components/PhotoUpload'

interface UnmatchedEntry {
  tempId: string
  name: string
  batting_order: number | null
  starting_pos: string
  stats: StatLine
  atBats: { inning: number | null; code: AtBatCode }[]
}

type PhotoAtBats = Record<string, { inning: number | null; code: AtBatCode }[]>

const STAT_FIELDS: { key: keyof CountingLine; label: string }[] = [
  { key: 'ab', label: 'AB' },
  { key: 'singles', label: '1B' },
  { key: 'doubles', label: '2B' },
  { key: 'triples', label: '3B' },
  { key: 'hr', label: 'HR' },
  { key: 'fc', label: 'FC' },
  { key: 'bb', label: 'BB' },
  { key: 'hbp', label: 'HBP' },
  { key: 'roe', label: 'ROE' },
  { key: 'runs', label: 'R' },
  { key: 'rbi', label: 'RBI' },
  { key: 'k', label: 'K' },
]

export interface GameEditorProps {
  mode: 'new' | 'edit'
  seasons: Season[]
  players: Player[]
  initialGame: {
    id?: string
    season_id: string
    game_date: string
    opponent: string
    our_runs: number | null
    opp_runs: number | null
  }
  initialRows: EditorRow[]
}

function numOrNull(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function GameEditor({ mode, seasons, players: initialPlayers, initialGame, initialRows }: GameEditorProps) {
  const router = useRouter()

  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [seasonId, setSeasonId] = useState(initialGame.season_id || seasons[0]?.id || '')
  const [gameDate, setGameDate] = useState(initialGame.game_date)
  const [opponent, setOpponent] = useState(initialGame.opponent)
  const [ourRuns, setOurRuns] = useState(initialGame.our_runs?.toString() ?? '')
  const [oppRuns, setOppRuns] = useState(initialGame.opp_runs?.toString() ?? '')

  const [rows, setRows] = useState<EditorRow[]>(initialRows)
  const [addPlayerId, setAddPlayerId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRegular, setNewRegular] = useState(true)

  // Photo intake: at-bat detail per matched player, and names the model
  // couldn't match to the roster (admin maps or creates them).
  const [photoAtBats, setPhotoAtBats] = useState<PhotoAtBats>({})
  const [unmatched, setUnmatched] = useState<UnmatchedEntry[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = gameResult(numOrNull(ourRuns), numOrNull(oppRuns))
  const availablePlayers = useMemo(
    () => players.filter((p) => !rows.some((r) => r.player_id === p.id)),
    [players, rows],
  )

  function updateRow(playerId: string, patch: Partial<EditorRow>) {
    setRows((rs) => rs.map((r) => (r.player_id === playerId ? { ...r, ...patch } : r)))
  }

  function updateStat(playerId: string, key: keyof CountingLine, value: string) {
    const n = Math.max(0, Math.floor(Number(value) || 0))
    setRows((rs) =>
      rs.map((r) => (r.player_id === playerId ? { ...r, stats: { ...r.stats, [key]: n } } : r)),
    )
  }

  function addRow(playerId: string) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    setRows((rs) => [
      ...rs,
      {
        player_id: player.id,
        name: player.name,
        batting_order: rs.length + 1,
        starting_pos: '',
        stats: emptyStatLine(),
      },
    ])
    setAddPlayerId('')
  }

  function removeRow(playerId: string) {
    setRows((rs) => rs.filter((r) => r.player_id !== playerId))
  }

  async function handleCreatePlayer() {
    const name = newName.trim()
    if (!name) return
    try {
      const player = await createPlayerAction({ name, is_regular: newRegular })
      setPlayers((ps) => [...ps, player].sort((a, b) => a.name.localeCompare(b.name)))
      addRow(player.id)
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create player')
    }
  }

  // ---- Photo intake ----
  // Pre-fill the grid from an extracted card. Aggregation runs client-side
  // (lib/codes), names are matched to the roster, and anything unmatched lands
  // in the banner for the admin to resolve. Nothing is written until Save.
  function applyExtraction(card: ExtractedCard) {
    setError(null)
    if (card.game.opponent) setOpponent(card.game.opponent)
    if (card.game.our_runs != null) setOurRuns(String(card.game.our_runs))
    if (card.game.opp_runs != null) setOppRuns(String(card.game.opp_runs))

    const matchedRows: EditorRow[] = []
    const matchedAtBats: PhotoAtBats = {}
    const stillUnmatched: UnmatchedEntry[] = []

    for (const p of card.players) {
      const name = p.name.trim()
      if (!name) continue
      const stats: StatLine = aggregateCodes(p.at_bats.map((a) => a.code))
      const m = matchName(name, players)
      if (m.playerId) {
        const player = players.find((pl) => pl.id === m.playerId)
        matchedRows.push({
          player_id: m.playerId,
          name: player?.name ?? name,
          batting_order: p.batting_order,
          starting_pos: p.starting_pos ?? '',
          stats,
        })
        matchedAtBats[m.playerId] = p.at_bats
      } else {
        stillUnmatched.push({
          tempId:
            typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${name}-${Math.random()}`,
          name,
          batting_order: p.batting_order,
          starting_pos: p.starting_pos ?? '',
          stats,
          atBats: p.at_bats,
        })
      }
    }

    // Upsert matched rows by player_id (photo wins over an existing blank row).
    setRows((rs) => {
      const byId = new Map(rs.map((r) => [r.player_id, r]))
      for (const r of matchedRows) byId.set(r.player_id, r)
      return [...byId.values()]
    })
    setPhotoAtBats((prev) => ({ ...prev, ...matchedAtBats }))
    setUnmatched(stillUnmatched)
  }

  function placeUnmatched(entry: UnmatchedEntry, playerId: string, playerName: string) {
    setRows((rs) => {
      const others = rs.filter((r) => r.player_id !== playerId)
      return [
        ...others,
        {
          player_id: playerId,
          name: playerName,
          batting_order: entry.batting_order,
          starting_pos: entry.starting_pos,
          stats: entry.stats,
        },
      ]
    })
    setPhotoAtBats((prev) => ({ ...prev, [playerId]: entry.atBats }))
    setUnmatched((u) => u.filter((e) => e.tempId !== entry.tempId))
  }

  async function createForUnmatched(entry: UnmatchedEntry, isRegular: boolean) {
    try {
      const player = await createPlayerAction({ name: entry.name, is_regular: isRegular })
      setPlayers((ps) => [...ps, player].sort((a, b) => a.name.localeCompare(b.name)))
      placeUnmatched(entry, player.id, player.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create player')
    }
  }

  async function handleSave() {
    setError(null)
    if (!seasonId) {
      setError('Pick a season first.')
      return
    }
    if (rows.length === 0) {
      setError('Add at least one player.')
      return
    }
    if (unmatched.length > 0) {
      setError('Resolve the unmatched names from the photo first (map or create each one).')
      return
    }
    setSaving(true)

    // Only write at-bat detail for players still in the grid that came from a photo.
    const atBats = rows
      .filter((r) => photoAtBats[r.player_id]?.length)
      .flatMap((r) =>
        photoAtBats[r.player_id].map((ab) => ({ player_id: r.player_id, inning: ab.inning, code: ab.code })),
      )

    const payload: SaveGameInput = {
      game: {
        id: initialGame.id,
        season_id: seasonId,
        game_date: gameDate || null,
        opponent: opponent.trim() || null,
        our_runs: numOrNull(ourRuns),
        opp_runs: numOrNull(oppRuns),
      },
      rows,
      atBats: atBats.length > 0 ? atBats : undefined,
    }
    try {
      const { gameId } = await saveGame(payload)
      router.push(`/games/${gameId}/edit`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Game header ---- */}
      <section className="rounded-lg border border-field-line bg-field-paper p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Season</span>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
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
          <label className="col-span-2 text-sm sm:col-span-1">
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
            <span className="mb-1 block text-field-muted">Our runs</span>
            <input
              type="number"
              inputMode="numeric"
              value={ourRuns}
              onChange={(e) => setOurRuns(e.target.value)}
              className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-field-muted">Opp runs</span>
            <input
              type="number"
              inputMode="numeric"
              value={oppRuns}
              onChange={(e) => setOppRuns(e.target.value)}
              className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5"
            />
          </label>
        </div>
        {result && (
          <p className="mt-3 text-sm font-medium text-field-ink">
            Result:{' '}
            <span
              className={
                result === 'W' ? 'text-field-grass' : 'text-field-muted'
              }
            >
              {result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
            </span>
          </p>
        )}
      </section>

      {/* ---- Photo intake ---- */}
      <PhotoUpload onExtracted={applyExtraction} />

      {/* ---- Unmatched names from the photo ---- */}
      {unmatched.length > 0 && (
        <section className="rounded-lg border border-field-clay/40 bg-field-clay/5 p-4">
          <h2 className="mb-2 text-sm font-semibold text-field-clay">
            {unmatched.length} name{unmatched.length === 1 ? '' : 's'} from the photo need matching
          </h2>
          <ul className="space-y-3">
            {unmatched.map((entry) => (
              <li key={entry.tempId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-field-ink">“{entry.name}”</span>
                <span className="text-field-muted">
                  ({entry.stats.ab} AB, {entry.stats.singles + entry.stats.doubles + entry.stats.triples + entry.stats.hr} H)
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const player = players.find((p) => p.id === e.target.value)
                    if (player) placeUnmatched(entry, player.id, player.name)
                  }}
                  className="rounded-md border border-field-line-strong bg-white px-2 py-1"
                >
                  <option value="">Map to existing…</option>
                  {players
                    .filter((p) => !rows.some((r) => r.player_id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => createForUnmatched(entry, true)}
                  className="rounded-md border border-field-grass px-2.5 py-1 font-medium text-field-grass hover:bg-field-grass/5"
                >
                  Create as regular
                </button>
                <button
                  type="button"
                  onClick={() => createForUnmatched(entry, false)}
                  className="rounded-md border border-field-line-strong px-2.5 py-1 font-medium text-field-muted hover:bg-field-cream"
                >
                  Create as ringer
                </button>
                <button
                  type="button"
                  onClick={() => setUnmatched((u) => u.filter((x) => x.tempId !== entry.tempId))}
                  className="text-field-muted hover:text-field-clay"
                  aria-label={`Discard ${entry.name}`}
                >
                  Skip
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Per-player grid ---- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">Lineup &amp; stats</h2>
        <div className="overflow-x-auto rounded-lg border border-field-line">
          <table className="tabular min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-field-cream/70 text-field-muted">
                <th className="sticky left-0 z-10 bg-field-cream/95 px-2 py-2 text-left font-medium">#</th>
                <th className="px-2 py-2 text-left font-medium">Player</th>
                <th className="px-2 py-2 text-left font-medium">Pos</th>
                {STAT_FIELDS.map((f) => (
                  <th key={f.key} className="px-1.5 py-2 text-right font-medium">
                    {f.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium" title="Hits / AVG / OPS (live, house formulas)">
                  H · AVG · OPS
                </th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const d = computeStats(row.stats)
                const sitting = row.starting_pos.trim().toLowerCase() === SIT.toLowerCase()
                return (
                  <tr key={row.player_id} className="border-t border-field-line">
                    <td className="sticky left-0 z-10 bg-field-paper px-2 py-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.batting_order ?? ''}
                        onChange={(e) =>
                          updateRow(row.player_id, { batting_order: numOrNull(e.target.value) })
                        }
                        className="w-12 rounded border border-field-line-strong bg-white px-1 py-1 text-right"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 font-medium text-field-ink">{row.name}</td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={row.starting_pos}
                        onChange={(e) => updateRow(row.player_id, { starting_pos: e.target.value })}
                        placeholder="RF"
                        list="pos-options"
                        className="w-16 rounded border border-field-line-strong bg-white px-1.5 py-1"
                      />
                    </td>
                    {STAT_FIELDS.map((f) => (
                      <td key={f.key} className="px-1 py-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={row.stats[f.key]}
                          disabled={sitting}
                          onChange={(e) => updateStat(row.player_id, f.key, e.target.value)}
                          className="w-12 rounded border border-field-line-strong bg-white px-1 py-1 text-right disabled:bg-field-cream disabled:text-field-muted"
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-1 text-right text-field-muted">
                      {sitting ? 'sat' : `${d.hits} · ${fmt3(d.avg)} · ${fmt3(d.ops)}`}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.player_id)}
                        className="text-field-clay hover:underline"
                        aria-label={`Remove ${row.name}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={STAT_FIELDS.length + 5} className="px-3 py-6 text-center text-field-muted">
                    No players yet. Add someone below, or use a card photo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <datalist id="pos-options">
          {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Rover', SIT].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-field-muted">
          Set position to <strong>{SIT}</strong> for a player who didn&apos;t bat — they stay on the lineup card but
          get no game played.
        </p>
      </section>

      {/* ---- Add players ---- */}
      <section className="flex flex-wrap items-end gap-4 rounded-lg border border-field-line bg-field-paper p-4">
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

      {error && <p className="text-sm text-field-clay">{error}</p>}

      {/* ---- Actions ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-field-grass px-4 py-2 font-medium text-white hover:bg-field-grass/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : mode === 'new' ? 'Create game' : 'Save changes'}
        </button>
        {initialGame.id && (
          <Link
            href={`/games/${initialGame.id}/card`}
            className="rounded-md border border-field-line-strong px-4 py-2 font-medium text-field-ink hover:bg-field-cream"
          >
            Printable card
          </Link>
        )}
        <Link href="/games" className="text-sm text-field-muted hover:text-field-ink">
          Back to games
        </Link>
      </div>
    </div>
  )
}
