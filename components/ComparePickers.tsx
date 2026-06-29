'use client'

import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'

// Two player dropdowns that drive /compare?a=&b= via the URL.
export function ComparePickers({
  players,
  a,
  b,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  a: string
  b: string
}) {
  const router = useRouter()
  const go = (na: string, nb: string) => router.push(`/compare?a=${na}&b=${nb}`)

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">
        <span className="mb-1 block text-field-muted">Player A</span>
        <select
          value={a}
          onChange={(e) => go(e.target.value, b)}
          className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5 text-field-ink"
        >
          <option value="">Choose…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-field-muted">Player B</span>
        <select
          value={b}
          onChange={(e) => go(a, e.target.value)}
          className="w-full rounded-md border border-field-line-strong bg-white px-2 py-1.5 text-field-ink"
        >
          <option value="">Choose…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
