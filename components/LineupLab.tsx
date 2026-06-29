'use client'

import { useEffect, useMemo, useState } from 'react'
import { SeasonSelector } from '@/components/SeasonSelector'
import type { LineupLabPlayer, Season } from '@/lib/types'
import {
  optimize,
  checkMMFViolations,
  calcLineupScore,
  getSlotConfigs,
  isFeasible,
} from '@/lib/optimizer'
import { fmt3 } from '@/lib/formulas'

// ---- Constants ---------------------------------------------------------------

const HOT_RATIO = 1.06
const COLD_RATIO = 0.94

// ---- Placeholder helpers -------------------------------------------------------

const PH_PREFIX = '__placeholder__'
const isPlaceholder = (id: string) => id.startsWith(PH_PREFIX)

function neededPlaceholders(males: number, nonMales: number): number {
  return Math.max(0, Math.ceil(males / 2) - nonMales)
}

function makePlaceholderInputs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    player_id: `${PH_PREFIX}${i}`,
    gender: 'F' as const,
    obp: 0,
    slg: 0,
    ops: 0,
  }))
}

// ---- Small sub-components ----------------------------------------------------

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <span className="inline-block h-5 w-14 text-center text-xs leading-5 text-field-muted">
        —
      </span>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.001
  const W = 56
  const H = 20
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (W - 4) + 2
      const y = H - 2 - ((v - min) / range) * (H - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const trend = values[values.length - 1] - values[0]
  const stroke = trend > 0.005 ? '#22c55e' : trend < -0.005 ? '#ef4444' : '#9ca3af'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

type FormTag = 'Hot' | 'Cold' | 'Steady'

function getFormTag(recentForm: number, seasonOps: number): FormTag {
  if (seasonOps === 0) return 'Steady'
  if (recentForm > seasonOps * HOT_RATIO) return 'Hot'
  if (recentForm < seasonOps * COLD_RATIO) return 'Cold'
  return 'Steady'
}

function FormBadge({ tag }: { tag: FormTag }) {
  const cls =
    tag === 'Hot'
      ? 'bg-orange-100 text-orange-700'
      : tag === 'Cold'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-gray-100 text-gray-500'
  const icon = tag === 'Hot' ? '▲' : tag === 'Cold' ? '▼' : '~'
  return (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-tight ${cls}`}>
      {icon} {tag}
    </span>
  )
}

function GenderMark({ gender }: { gender: 'M' | 'F' | null }) {
  if (!gender) return <span className="w-4 shrink-0 text-center text-xs text-gray-300">?</span>
  return (
    <span
      className={`w-4 shrink-0 text-center text-xs font-semibold ${gender === 'M' ? 'text-sky-500' : 'text-pink-500'}`}
    >
      {gender}
    </span>
  )
}

// ---- Slot-value bar chart ----------------------------------------------------

function SlotChart({ n }: { n: number }) {
  const slots = getSlotConfigs(Math.max(n, 8))
  const display = slots.slice(0, 8)
  const maxW = Math.max(...display.map((s) => s.w))

  return (
    <div className="space-y-1.5">
      {display.map((slot, i) => {
        const pct = (slot.w / maxW) * 100
        const highlight = i === 1 || i === 3
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-right text-field-muted">{slot.role}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-field-line">
              <div
                className={`h-2 rounded-full transition-all ${highlight ? 'bg-field-gold' : 'bg-field-grass/50'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-field-muted">{slot.w.toFixed(2)}</span>
          </div>
        )
      })}
      <p className="pt-1 text-[11px] text-field-muted">
        Slots 2 and 4 carry the most weight — put your best bats there.
      </p>
    </div>
  )
}

// ---- "The Read" insight panel -------------------------------------------------

function TheRead({
  order,
  playerMap,
  violations,
  males,
  nonMales,
}: {
  order: string[]
  playerMap: Map<string, LineupLabPlayer>
  violations: number[]
  males: number
  nonMales: number
}) {
  const sentences: string[] = []

  if (!isFeasible(males, nonMales)) {
    sentences.push(
      `No legal order exists — ${males}M vs ${nonMales}F means you need to add a woman or take an auto-out.`,
    )
  } else if (violations.length > 0) {
    const slots = violations.map((v) => v + 1).join(', ')
    sentences.push(
      `Illegal: slots ${slots} run three men in a row. Move a woman between them to fix it.`,
    )
  }

  const leadoff = order[0] ? playerMap.get(order[0]) : null
  const twoHole = order[1] ? playerMap.get(order[1]) : null
  const cleanup = order[3] ? playerMap.get(order[3]) : null

  if (leadoff && twoHole && cleanup) {
    sentences.push(
      `${leadoff.name} leads off at ${fmt3(leadoff.obp)} OBP. ` +
        `${twoHole.name} hits second (${fmt3(twoHole.ops)} OPS). ` +
        `${cleanup.name} cleans up, ${fmt3(cleanup.slg)} SLG.`,
    )
  }

  // Heating up
  for (const id of order) {
    const p = playerMap.get(id)
    if (!p || p.form.length < 3) continue
    if (p.recentForm - p.ops > 0.04) {
      sentences.push(
        `${p.name} is heating up — last-3 OPS ${fmt3(p.recentForm)} vs ${fmt3(p.ops)} season average.`,
      )
      break
    }
  }

  // Cooling off
  for (const id of order) {
    const p = playerMap.get(id)
    if (!p || p.form.length < 3) continue
    if (p.ops - p.recentForm > 0.04) {
      sentences.push(
        `${p.name} has cooled off (${fmt3(p.recentForm)} recent vs ${fmt3(p.ops)} season) — consider dropping a spot.`,
      )
      break
    }
  }

  if (sentences.length === 0) return null

  const isWarning = !isFeasible(males, nonMales)
  return (
    <section className="rounded-lg border border-field-line bg-field-paper p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">
        The read
      </h2>
      <div className={`space-y-1.5 text-sm ${isWarning ? 'text-field-clay' : 'text-field-ink'}`}>
        {sentences.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
    </section>
  )
}

// ---- Stat cell ---------------------------------------------------------------

function StatRow({ player }: { player: LineupLabPlayer }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="font-mono tabular-nums text-field-muted">
        <span className="mr-0.5 text-field-ink/70">{fmt3(player.avg)}</span>
        <span className="mr-2 text-field-muted/60"> AVG</span>
        <span className="mr-0.5 text-field-ink/70">{fmt3(player.obp)}</span>
        <span className="mr-2 text-field-muted/60"> OBP</span>
        <span className="mr-0.5 text-field-ink/70">{fmt3(player.slg)}</span>
        <span className="mr-2 text-field-muted/60"> SLG</span>
        <span className="mr-0.5 font-semibold text-field-ink">{fmt3(player.ops)}</span>
        <span className="text-field-muted/60"> OPS</span>
      </span>
      <Sparkline values={player.form} />
    </div>
  )
}

// ---- Main component ----------------------------------------------------------

interface LineupLabProps {
  players: LineupLabPlayer[]
  seasons: Season[]
  selectedSeasonId: string
  onOrderChange?: (order: string[]) => void
}

function initialState(players: LineupLabPlayer[]) {
  const sorted = [...players].sort((a, b) => b.ops - a.ops)
  const topN = Math.min(8, sorted.length)
  const initialOrderPlayers = sorted.slice(0, topN)
  const initialBenchIds = sorted.slice(topN).map((p) => p.player_id)

  const males = initialOrderPlayers.filter((p) => p.gender === 'M').length
  const nonMales = initialOrderPlayers.length - males
  const ph = makePlaceholderInputs(neededPlaceholders(males, nonMales))

  const inputs = [
    ...initialOrderPlayers.map((p) => ({
      player_id: p.player_id,
      gender: p.gender,
      obp: p.obp,
      slg: p.slg,
      ops: p.ops,
    })),
    ...ph,
  ]

  const result = optimize(inputs)
  const orderIds = result.feasible ? result.order : inputs.map((p) => p.player_id)

  return { order: orderIds, bench: initialBenchIds }
}

export function LineupLab({ players, seasons, selectedSeasonId, onOrderChange }: LineupLabProps) {
  const [{ order, bench }, setState] = useState(() => initialState(players))
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [optimizeFlash, setOptimizeFlash] = useState(false)

  // Notify parent when order changes
  useEffect(() => {
    const nonPlaceholders = order.filter((id) => !isPlaceholder(id))
    onOrderChange?.(nonPlaceholders)
  }, [order, onOrderChange])

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.player_id, p])),
    [players],
  )

  const slots = useMemo(() => getSlotConfigs(order.length), [order.length])

  const violations = useMemo(
    () =>
      checkMMFViolations(
        order.map((id) => (isPlaceholder(id) ? 'F' : (playerMap.get(id)?.gender ?? null))),
      ),
    [order, playerMap],
  )

  const score = useMemo(
    () =>
      calcLineupScore(
        order.map((id) => ({
          obp: isPlaceholder(id) ? 0 : (playerMap.get(id)?.obp ?? 0),
          slg: isPlaceholder(id) ? 0 : (playerMap.get(id)?.slg ?? 0),
        })),
        slots,
      ),
    [order, playerMap, slots],
  )

  const males = useMemo(
    () => order.filter((id) => !isPlaceholder(id) && playerMap.get(id)?.gender === 'M').length,
    [order, playerMap],
  )
  const nonMales = order.length - males
  const feasible = isFeasible(males, nonMales)
  const isLegal = feasible && violations.length === 0

  // For TheRead and other panels that only care about real players.
  const orderedPlayers = useMemo(
    () => order.map((id) => playerMap.get(id)).filter(Boolean) as LineupLabPlayer[],
    [order, playerMap],
  )

  // ---- Interactions -----------------------------------------------------------

  function handleOptimize() {
    const realIds = order.filter((id) => !isPlaceholder(id))
    const realMales = realIds.filter((id) => playerMap.get(id)?.gender === 'M').length
    const realNonMales = realIds.length - realMales
    const ph = makePlaceholderInputs(neededPlaceholders(realMales, realNonMales))

    const inputs = [
      ...realIds.map((id) => {
        const p = playerMap.get(id)!
        return { player_id: id, gender: p.gender, obp: p.obp, slg: p.slg, ops: p.ops }
      }),
      ...ph,
    ]
    const result = optimize(inputs)
    if (result.feasible) {
      setState((s) => ({ ...s, order: result.order }))
      setSelectedBenchId(null)
      setOptimizeFlash(true)
      setTimeout(() => setOptimizeFlash(false), 1800)
    }
  }

  function handleReset() {
    setState(initialState(players))
    setSelectedBenchId(null)
  }

  function handleNudge(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= order.length) return
    setState((s) => {
      const copy = [...s.order]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return { ...s, order: copy }
    })
    setSelectedBenchId(null)
  }

  function handleSendToBench(idx: number) {
    const playerId = order[idx]
    if (isPlaceholder(playerId)) {
      setState((s) => ({ ...s, order: s.order.filter((_, i) => i !== idx) }))
    } else {
      setState((s) => ({
        order: s.order.filter((_, i) => i !== idx),
        bench: [...s.bench, playerId],
      }))
    }
    setSelectedBenchId(null)
  }

  function handleTapBench(playerId: string) {
    setSelectedBenchId((prev) => (prev === playerId ? null : playerId))
  }

  function handleTapSlot(slotIdx: number) {
    if (!selectedBenchId) return
    const displaced = order[slotIdx]
    setState((s) => {
      const newOrder = [...s.order]
      newOrder[slotIdx] = selectedBenchId
      const newBench = s.bench.filter((id) => id !== selectedBenchId)
      newBench.push(displaced)
      return { order: newOrder, bench: newBench }
    })
    setSelectedBenchId(null)
  }

  function handleAddFromBench(playerId: string) {
    setState((s) => ({
      order: [...s.order, playerId],
      bench: s.bench.filter((id) => id !== playerId),
    }))
    setSelectedBenchId(null)
  }

  // ---- Render -----------------------------------------------------------------

  const isSelecting = selectedBenchId !== null
  const allMales = players.filter((p) => p.gender === 'M').length
  const allNonMales = players.length - allMales

  return (
    <div className="space-y-5 pb-8">
      {/* Season selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-field-ink">
          Lineup Lab
        </h1>
        <SeasonSelector seasons={seasons} selectedId={selectedSeasonId} basePath="/lineup-lab" />
      </div>

      {players.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-sm text-field-muted">
          No season stats yet. Enter at least one game to start building orders.
        </p>
      ) : (
        <>
          {/* Status chips + action row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* MMF legality chip */}
            {!feasible ? (
              <span className="rounded-full bg-field-clay/10 px-3 py-1 text-sm font-semibold text-field-clay">
                ✕ No legal order
              </span>
            ) : violations.length > 0 ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                ✕ Illegal MMF
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                ✓ Legal
              </span>
            )}
            {/* Lineup score */}
            <span className="rounded-full bg-field-cream px-3 py-1 text-sm font-mono text-field-ink">
              Score {score.toFixed(3)}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={!feasible}
                onClick={handleOptimize}
                className="rounded-md bg-field-grass px-4 py-2 text-sm font-medium text-white hover:bg-field-clay active:scale-95 disabled:opacity-40"
              >
                Auto-optimize
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md border border-field-line-strong px-4 py-2 text-sm font-medium text-field-muted hover:bg-field-cream"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Optimize success flash */}
          {optimizeFlash && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              🦜 Order optimized — {score.toFixed(3)} lineup score.
            </div>
          )}

          {/* Infeasibility warning */}
          {!feasible && (
            <div className="rounded-lg border border-field-clay/30 bg-field-clay/5 px-4 py-3 text-sm text-field-clay">
              <strong>No legal order possible.</strong> {allMales}M vs {allNonMales}F — add a woman to the
              active roster or take an auto-out (add her as a player with no stats).
            </div>
          )}

          {isSelecting && (
            <p className="rounded-md bg-field-gold/20 px-3 py-2 text-sm font-medium text-field-ink">
              Tap a slot to swap{' '}
              <strong>{playerMap.get(selectedBenchId!)?.name}</strong> in, or tap
              the player again to cancel.
            </p>
          )}

          {/* ---- Batting order card ---- */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">
              Batting order · {order.length} batters
            </h2>
            <ol className="space-y-1.5">
              {order.map((playerId, slotIdx) => {
                const slot = slots[slotIdx]
                const isViolated = violations.includes(slotIdx)
                const canSwap = isSelecting && selectedBenchId !== null

                // ---- Placeholder slot ----
                if (isPlaceholder(playerId)) {
                  return (
                    <li
                      key={playerId}
                      onClick={() => canSwap && handleTapSlot(slotIdx)}
                      className={[
                        'flex overflow-hidden rounded-lg border border-dashed bg-field-paper transition-colors',
                        isViolated ? 'border-red-400' : 'border-field-line-strong',
                        canSwap ? 'cursor-pointer hover:border-field-gold hover:bg-field-gold/5' : '',
                      ].join(' ')}
                    >
                      <div className={`w-1 shrink-0 ${isViolated ? 'bg-red-500' : 'bg-transparent'}`} aria-hidden />
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-3 py-2">
                        <span className="w-5 shrink-0 text-right font-display text-sm font-semibold text-field-grass">
                          {slotIdx + 1}
                        </span>
                        <span className="w-16 shrink-0 text-xs text-field-muted">{slot.role}</span>
                        <span className="min-w-0 flex-1 truncate text-sm italic text-field-muted">
                          Girl cycles in
                        </span>
                        <span className="w-4 shrink-0 text-center text-xs font-semibold text-pink-500">F</span>
                        <div
                          className="ml-1 flex shrink-0 items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleNudge(slotIdx, -1)}
                            disabled={slotIdx === 0}
                            aria-label="Move placeholder up"
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-muted hover:bg-field-cream disabled:opacity-25"
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => handleNudge(slotIdx, 1)}
                            disabled={slotIdx === order.length - 1}
                            aria-label="Move placeholder down"
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-muted hover:bg-field-cream disabled:opacity-25"
                          >▼</button>
                          <button
                            type="button"
                            onClick={() => handleSendToBench(slotIdx)}
                            aria-label="Remove placeholder"
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-clay hover:bg-field-clay/10"
                            title="Remove"
                          >✕</button>
                        </div>
                      </div>
                    </li>
                  )
                }

                // ---- Real player slot ----
                const player = playerMap.get(playerId)
                if (!player) return null
                const tag = getFormTag(player.recentForm, player.ops)

                return (
                  <li
                    key={playerId}
                    onClick={() => canSwap && handleTapSlot(slotIdx)}
                    className={[
                      'flex overflow-hidden rounded-lg border bg-field-paper transition-colors',
                      isViolated ? 'border-red-400' : 'border-field-line',
                      canSwap
                        ? 'cursor-pointer hover:border-field-gold hover:bg-field-gold/5'
                        : '',
                    ].join(' ')}
                  >
                    {/* Left rail — red on MMF violation */}
                    <div
                      className={`w-1 shrink-0 ${isViolated ? 'bg-red-500' : 'bg-transparent'}`}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1 px-3 py-2">
                      {/* Top row: slot number, role, name, gender, badge, actions */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 shrink-0 text-right font-display text-sm font-semibold text-field-grass">
                          {slotIdx + 1}
                        </span>
                        <span className="w-16 shrink-0 text-xs text-field-muted">
                          {slot.role}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-field-ink">
                          {player.name}
                        </span>
                        <GenderMark gender={player.gender} />
                        <FormBadge tag={tag} />
                        <div
                          className="ml-1 flex shrink-0 items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleNudge(slotIdx, -1)}
                            disabled={slotIdx === 0}
                            aria-label={`Move ${player.name} up`}
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-muted hover:bg-field-cream disabled:opacity-25"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNudge(slotIdx, 1)}
                            disabled={slotIdx === order.length - 1}
                            aria-label={`Move ${player.name} down`}
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-muted hover:bg-field-cream disabled:opacity-25"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendToBench(slotIdx)}
                            aria-label={`Send ${player.name} to bench`}
                            className="flex h-9 w-9 items-center justify-center rounded text-xs text-field-clay hover:bg-field-clay/10"
                            title="Send to bench"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {/* Bottom row: stats + sparkline */}
                      <div className="mt-1 pl-7">
                        <StatRow player={player} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* ---- Bench ---- */}
          {bench.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">
                Bench · {bench.length}
              </h2>
              <ul className="space-y-1.5">
                {bench.map((playerId) => {
                  const player = playerMap.get(playerId)
                  if (!player) return null
                  const tag = getFormTag(player.recentForm, player.ops)
                  const isSelected = selectedBenchId === playerId

                  return (
                    <li
                      key={playerId}
                      onClick={() => handleTapBench(playerId)}
                      className={[
                        'flex cursor-pointer items-start overflow-hidden rounded-lg border bg-field-paper px-3 py-2 transition-colors',
                        isSelected
                          ? 'border-field-gold bg-field-gold/10 ring-2 ring-field-gold/40'
                          : 'border-field-line hover:border-field-line-strong',
                      ].join(' ')}
                    >
                      <div className="min-w-0 flex-1">
                        {/* Top row */}
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-field-ink">
                            {player.name}
                          </span>
                          <GenderMark gender={player.gender} />
                          <FormBadge tag={tag} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddFromBench(playerId)
                            }}
                            aria-label={`Add ${player.name} to batting order`}
                            className="ml-1 flex h-9 shrink-0 items-center justify-center rounded border border-field-grass px-2 text-xs text-field-grass hover:bg-field-grass/5"
                          >
                            + Add
                          </button>
                        </div>
                        {/* Stats row */}
                        <div className="mt-1">
                          <StatRow player={player} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {isSelecting && (
                <p className="mt-2 text-xs text-field-muted">
                  Tap a slot in the order above to swap{' '}
                  <strong>{playerMap.get(selectedBenchId!)?.name}</strong> in.
                </p>
              )}
            </section>
          )}

          {/* ---- The Read ---- */}
          <TheRead
            order={order}
            playerMap={playerMap}
            violations={violations}
            males={males}
            nonMales={nonMales}
          />

          {/* ---- Slot-value explainer ---- */}
          <section className="rounded-lg border border-field-line bg-field-paper p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-field-muted">
              Slot importance
            </h2>
            <SlotChart n={order.length} />
          </section>

          {/* Roster summary */}
          <p className="text-xs text-field-muted">
            {players.length} players with season stats · {allMales}M {allNonMales}F
            {players.some((p) => p.gender === null) && (
              <span className="ml-1 text-field-clay">
                · {players.filter((p) => p.gender === null).length} without gender set
              </span>
            )}
          </p>
        </>
      )}
    </div>
  )
}
