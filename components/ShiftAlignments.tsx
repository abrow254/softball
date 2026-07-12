'use client'

import { useEffect, useRef, useState } from 'react'

// Normalized (0..1) default spot for each fielding position, matching the
// static FieldDiagram layout: home plate bottom-center, outfield across the top.
const SPOT_N: Record<string, { x: number; y: number }> = {
  C: { x: 0.5, y: 0.9 },
  '1B': { x: 0.72, y: 0.65 },
  '2B': { x: 0.61, y: 0.5 },
  SS: { x: 0.39, y: 0.5 },
  '3B': { x: 0.28, y: 0.65 },
  Rover: { x: 0.5, y: 0.4 },
  LF: { x: 0.22, y: 0.26 },
  CF: { x: 0.5, y: 0.17 },
  RF: { x: 0.78, y: 0.26 },
}

export interface Fielder {
  id: string
  name: string
  pos: string // assigned fielding position ('' if none)
}

const firstName = (n: string) => n.split(' ')[0]

// Seed a fresh arrangement from each fielder's assigned position; players with
// no position get spread along the bottom so they can be dragged into place.
function seed(fielders: Fielder[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {}
  let bench = 0
  const benchCount = fielders.filter((f) => !SPOT_N[f.pos]).length
  for (const f of fielders) {
    const spot = SPOT_N[f.pos]
    if (spot) {
      out[f.id] = { ...spot }
    } else {
      const span = benchCount > 1 ? bench / (benchCount - 1) : 0.5
      out[f.id] = { x: 0.15 + span * 0.7, y: 0.985 }
      bench++
    }
  }
  return out
}

function Field({ title, sideKey, fielders, dateKey }: { title: string; sideKey: string; fielders: Fielder[]; dateKey: string }) {
  const storageKey = `shift:${dateKey}:${sideKey}`
  const fieldRef = useRef<HTMLDivElement>(null)
  const dragId = useRef<string | null>(null)
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() => seed(fielders))

  // Load any saved arrangement for this date/side; keep only current fielders,
  // and seed any newcomers. Runs when the roster of fielders or the date changes.
  useEffect(() => {
    let saved: Record<string, { x: number; y: number }> = {}
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
      if (raw) saved = JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const fresh = seed(fielders)
    const merged: Record<string, { x: number; y: number }> = {}
    for (const f of fielders) merged[f.id] = saved[f.id] ?? fresh[f.id]
    setPos(merged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, fielders.map((f) => `${f.id}:${f.pos}`).join(',')])

  function persist(next: Record<string, { x: number; y: number }>) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  function onDown(e: React.PointerEvent, id: string) {
    dragId.current = id
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onMove(e: React.PointerEvent) {
    if (dragId.current == null || !fieldRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    setPos((prev) => ({ ...prev, [dragId.current as string]: { x, y } }))
  }
  function onUp() {
    if (dragId.current == null) return
    dragId.current = null
    setPos((prev) => {
      persist(prev)
      return prev
    })
  }
  function reset() {
    const fresh = seed(fielders)
    setPos(fresh)
    persist(fresh)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-field-muted">{title}</h4>
        <button type="button" onClick={reset} className="text-[11px] text-field-grass hover:underline">
          Reset
        </button>
      </div>
      <div
        ref={fieldRef}
        className="relative aspect-[32/30] w-full touch-none select-none overflow-hidden rounded-lg border border-field-line bg-field-paper"
      >
        {/* field graphics */}
        <svg viewBox="0 0 320 300" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M160 270 L20 110 A 200 200 0 0 1 300 110 Z" fill="#3f7d4f" fillOpacity={0.12} />
          <path d="M160 270 L96 196 L160 124 L224 196 Z" fill="#c2843f" fillOpacity={0.18} />
          <path d="M160 270 L96 196 L160 124 L224 196 Z" fill="none" stroke="#6b7280" strokeOpacity={0.4} strokeWidth={1.5} />
        </svg>
        {/* draggable fielders */}
        {fielders.map((f) => {
          const p = pos[f.id] ?? { x: 0.5, y: 0.5 }
          return (
            <button
              key={f.id}
              type="button"
              onPointerDown={(e) => onDown(e, f.id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border border-field-grass bg-white px-1.5 py-0.5 text-[10px] font-semibold text-field-ink shadow-sm active:cursor-grabbing"
              title={`${f.name}${f.pos ? ` · ${f.pos}` : ''} — drag to reposition`}
            >
              {firstName(f.name)}
              {f.pos ? <span className="ml-0.5 text-field-muted">{f.pos}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Two side-by-side drag-and-drop defensive alignments — one to use against a
// right-handed batter, one against a lefty — seeded from the current alignment.
// Arrangements are saved per game date in the browser (localStorage).
export function ShiftAlignments({ fielders, dateKey }: { fielders: Fielder[]; dateKey: string }) {
  if (fielders.length === 0) return null
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-field-ink">Defensive shifts</h3>
        <p className="text-xs text-field-muted">
          Drag fielders to shade for the batter at the plate. Saved on this device per game.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field title="vs Right-handed batter" sideKey="RHB" fielders={fielders} dateKey={dateKey} />
        <Field title="vs Left-handed batter" sideKey="LHB" fielders={fielders} dateKey={dateKey} />
      </div>
    </div>
  )
}
