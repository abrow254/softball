'use client'

import { useRef, useState } from 'react'
import type { ExtractedCard } from '@/lib/scorecard'

export function PhotoUpload({ onExtracted }: { onExtracted: (card: ExtractedCard) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setLoading(true)
    try {
      const body = new FormData()
      body.append('image', file)
      const res = await fetch('/api/extract', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Extraction failed.')
      onExtracted(data as ExtractedCard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the photo.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-field-line-strong bg-field-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-field-ink">Fill from a card photo</h2>
          <p className="text-xs text-field-muted">
            Snap the filled paper card; the totals below pre-fill for you to review. Nothing saves until you press
            Save.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-field-grass px-3 py-1.5 text-sm font-medium text-field-grass hover:bg-field-grass/5 disabled:opacity-60"
        >
          {loading ? 'Reading photo…' : 'Upload card photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-field-clay">{error}</p>}
    </section>
  )
}
