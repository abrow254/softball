'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteGameAction } from '@/app/games/actions'

// Small inline delete control for a game row. Confirms first, since deleting a
// game cascades its lineup, stats, at-bats, and photos.
export function DeleteGameButton({ gameId, label }: { gameId: string; label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  function onDelete() {
    if (!confirm(`Delete this game (${label})? This removes its stats and cannot be undone.`)) return
    setError(false)
    startTransition(async () => {
      try {
        await deleteGameAction(gameId)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-field-clay hover:underline disabled:opacity-50"
    >
      {pending ? '…' : error ? 'Retry' : 'Delete'}
    </button>
  )
}
