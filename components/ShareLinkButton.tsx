'use client'

import { useState } from 'react'

// Share the current card via the native share sheet where available, else copy
// the link to the clipboard. Screenshotting the card is the primary path; this
// is a convenience for sending someone the live page.
export function ShareLinkButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // fall through to copy on cancel/failure
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="rounded-md border border-field-line-strong px-3 py-1.5 text-sm font-medium text-field-ink hover:bg-field-cream"
    >
      {copied ? 'Link copied ✓' : 'Share'}
    </button>
  )
}
