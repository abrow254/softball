'use client'

import { useState } from 'react'

// Season team photo on the stats page. Shows the whole image uncropped, filling
// its container's width (caller controls the column width). Renders nothing if
// the file is missing.
export function SeasonPhotoBanner({ src, caption }: { src: string; caption?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <figure className="w-full overflow-hidden rounded-lg border border-field-line bg-field-paper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption ?? 'Team photo'}
        onError={() => setFailed(true)}
        className="block h-auto w-full"
      />
      {caption && (
        <figcaption className="px-3 py-1.5 text-xs font-medium text-field-muted">📸 {caption}</figcaption>
      )}
    </figure>
  )
}
