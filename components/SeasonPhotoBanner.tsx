'use client'

import { useState } from 'react'

// Season team photo on the stats page. Shows the whole image uncropped in a
// small frame (height-capped, natural aspect) so nobody gets cropped out.
// Renders nothing if the file is missing.
export function SeasonPhotoBanner({ src, caption }: { src: string; caption?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <figure className="w-fit max-w-full overflow-hidden rounded-lg border border-field-line bg-field-paper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption ?? 'Team photo'}
        onError={() => setFailed(true)}
        className="max-h-64 w-auto max-w-full object-contain"
      />
      {caption && (
        <figcaption className="px-3 py-1.5 text-xs font-medium text-field-muted">📸 {caption}</figcaption>
      )}
    </figure>
  )
}
