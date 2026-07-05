'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GamePhoto } from '@/lib/db/gamePhotos'
import { uploadScorecardAction, deleteScorecardAction } from '@/app/games/actions'

// Scorecard photo gallery for a game. Admins can snap/upload the paper
// scorecard from their phone (camera capture on mobile) and delete photos;
// everyone signed in can view them full-size.
export function ScorecardPhotos({
  gameId,
  photos,
  isAdmin,
}: {
  gameId: string
  photos: GamePhoto[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.set('file', file)
    startTransition(async () => {
      try {
        await uploadScorecardAction(gameId, fd)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
    })
  }

  function onDelete(photoId: string) {
    if (!confirm('Delete this scorecard photo?')) return
    startTransition(async () => {
      try {
        await deleteScorecardAction(photoId, gameId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  if (photos.length === 0 && !isAdmin) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Scorecard</h2>
        {isAdmin && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="rounded-md border border-field-line-strong px-3 py-1.5 text-sm font-medium text-field-ink hover:bg-field-cream disabled:opacity-40"
            >
              {pending ? 'Uploading…' : '📷 Add photo'}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-field-clay">⚠️ {error}</p>}

      {photos.length === 0 ? (
        isAdmin && (
          <p className="rounded-lg border border-dashed border-field-line bg-field-paper px-4 py-6 text-center text-sm text-field-muted">
            No scorecard photo yet. Snap the paper scorecard to keep it with the game.
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-lg border border-field-line">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Scorecard" className="h-40 w-full object-cover" loading="lazy" />
              </a>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  disabled={pending}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
