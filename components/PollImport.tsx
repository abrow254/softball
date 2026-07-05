'use client'

import { useMemo, useState } from 'react'
import { parsePoll, type RosterName, type PollAssignment } from '@/lib/pollImport'
import type { AvailabilityStatus } from '@/lib/types'

const STATUS_STYLE: Record<AvailabilityStatus, string> = {
  in: 'bg-field-grass/15 text-field-grass',
  maybe: 'bg-field-gold/20 text-field-ink',
  out: 'bg-field-clay/15 text-field-clay',
}

// Paste weekly poll / group-chat text; preview the name matches; apply them to
// availability in one click. Names that don't match are flagged so nobody is
// silently dropped.
export function PollImport({
  roster,
  onApply,
  onClose,
}: {
  roster: RosterName[]
  onApply: (assignments: PollAssignment[]) => Promise<void> | void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [applying, setApplying] = useState(false)

  const result = useMemo(() => parsePoll(text, roster), [text, roster])
  const { assignments, unmatched, ambiguous } = result
  const counts = {
    in: assignments.filter((a) => a.status === 'in').length,
    maybe: assignments.filter((a) => a.status === 'maybe').length,
    out: assignments.filter((a) => a.status === 'out').length,
  }

  async function apply() {
    if (assignments.length === 0) return
    setApplying(true)
    try {
      await onApply(assignments)
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-field-line-strong bg-field-cream/40 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-field-ink">Paste from poll</h4>
        <button type="button" onClick={onClose} className="text-xs text-field-muted hover:text-field-ink">
          Close
        </button>
      </div>
      <p className="text-xs text-field-muted">
        Copy the weekly poll (or a &ldquo;who&rsquo;s in&rdquo; list) and paste below. Use{' '}
        <strong>In</strong> / <strong>Out</strong> / <strong>Maybe</strong> headings, or mark a line like
        &ldquo;Dave - out&rdquo;. Everything before the first heading is treated as In.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={'In\nAaron\nMike\nAl B\n\nOut\nErin'}
        className="w-full rounded-md border border-field-line bg-white p-2 font-mono text-sm text-field-ink"
      />

      {text.trim() && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded px-2 py-0.5 bg-field-grass/15 text-field-grass">{counts.in} in</span>
            <span className="rounded px-2 py-0.5 bg-field-gold/20 text-field-ink">{counts.maybe} maybe</span>
            <span className="rounded px-2 py-0.5 bg-field-clay/15 text-field-clay">{counts.out} out</span>
          </div>

          {assignments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {assignments.map((a) => (
                <li
                  key={a.player_id}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}
                  title={`matched from "${a.matchedFrom}"`}
                >
                  {a.name}
                </li>
              ))}
            </ul>
          )}

          {(unmatched.length > 0 || ambiguous.length > 0) && (
            <div className="rounded-md border border-field-clay/40 bg-field-clay/10 px-2 py-1.5 text-xs text-field-ink">
              {unmatched.length > 0 && (
                <div>
                  ⚠️ No roster match: <span className="font-medium">{unmatched.join(', ')}</span>
                </div>
              )}
              {ambiguous.length > 0 && (
                <div>
                  ⚠️ Matches more than one player: <span className="font-medium">{ambiguous.join(', ')}</span>
                </div>
              )}
              <div className="mt-0.5 text-field-muted">Set these by hand below after applying.</div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={apply}
        disabled={applying || assignments.length === 0}
        className="rounded-md bg-field-grass px-3 py-1.5 text-sm font-medium text-white hover:bg-field-grass/90 disabled:opacity-40"
      >
        {applying ? 'Applying…' : `Apply to ${assignments.length} player${assignments.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
