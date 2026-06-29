'use client'

import { useState } from 'react'
import Image from 'next/image'

// Season team photo shown on the stats page. Renders nothing if the file is
// missing, so it's safe to reference photos before their files are committed.
export function SeasonPhotoBanner({ src, caption }: { src: string; caption?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <figure className="overflow-hidden rounded-xl border border-field-line bg-field-paper">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <Image
          src={src}
          alt={caption ?? 'Team photo'}
          fill
          sizes="(max-width: 768px) 100vw, 1152px"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      </div>
      {caption && (
        <figcaption className="px-3 py-2 text-xs font-medium text-field-muted">📸 {caption}</figcaption>
      )}
    </figure>
  )
}
