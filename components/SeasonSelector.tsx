'use client'

import { useRouter } from 'next/navigation'
import type { Season } from '@/lib/types'

export function SeasonSelector({
  seasons,
  selectedId,
  basePath = '/stats',
}: {
  seasons: Season[]
  selectedId: string
  basePath?: string
}) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-field-muted">Season</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`${basePath}?season=${e.target.value}`)}
        className="rounded-md border border-field-line-strong bg-white px-2 py-1.5 text-field-ink outline-none focus:border-field-grass"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
            {s.is_current ? ' · current' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
