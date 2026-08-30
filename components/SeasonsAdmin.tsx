'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Season } from '@/lib/types'
import { setCurrentSeasonAction } from '@/app/admin/seasons/actions'

// Admin control for which season is "current" (live). Setting a season current
// makes it the app-wide default; marking the current one complete clears the
// flag so it's treated as a finished season.
export function SeasonsAdmin({ seasons, currentId }: { seasons: Season[]; currentId: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(seasonId: string | null, key: string) {
    setError(null)
    setBusyId(key)
    startTransition(async () => {
      try {
        await setCurrentSeasonAction(seasonId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-field-clay">⚠️ {error}</p>}
      <ul className="divide-y divide-field-line overflow-hidden rounded-lg border border-field-line">
        {seasons.map((s) => {
          const isCurrent = s.id === currentId
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 bg-field-paper px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-field-ink">{s.label}</span>
                {isCurrent && (
                  <span className="rounded-full bg-field-grass/15 px-2 py-0.5 text-xs font-semibold text-field-grass">
                    Current
                  </span>
                )}
              </div>
              {isCurrent ? (
                <button
                  type="button"
                  onClick={() => run(null, `complete-${s.id}`)}
                  disabled={pending}
                  className="rounded-md border border-field-line-strong px-3 py-1.5 text-sm font-medium text-field-ink hover:bg-field-cream disabled:opacity-50"
                >
                  {busyId === `complete-${s.id}` ? 'Saving…' : 'Mark complete'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => run(s.id, `set-${s.id}`)}
                  disabled={pending}
                  className="rounded-md bg-field-grass px-3 py-1.5 text-sm font-medium text-white hover:bg-field-grass/90 disabled:opacity-50"
                >
                  {busyId === `set-${s.id}` ? 'Saving…' : 'Set as current'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {!currentId && (
        <p className="text-xs text-field-muted">
          No current season — the app defaults to the newest season. Set one current when the next season starts.
        </p>
      )}
    </div>
  )
}
