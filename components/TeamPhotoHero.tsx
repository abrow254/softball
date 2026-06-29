'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

interface TeamPhotoHeroProps {
  photos: string[]
  subtitle?: string | null
}

// Full-width hero. Rotates through team photos with a slow crossfade; any photo
// whose file is missing (404) is skipped, and if none load it falls back to a
// grass-gradient wordmark block. So it's safe to list photos in the registry
// before their files are committed.
export function TeamPhotoHero({ photos, subtitle }: TeamPhotoHeroProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const visible = useMemo(() => photos.filter((p) => !failed.has(p)), [photos, failed])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (visible.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % visible.length), 5000)
    return () => clearInterval(t)
  }, [visible.length])

  // Keep the active index in range if the visible set shrinks.
  useEffect(() => {
    if (idx >= visible.length) setIdx(0)
  }, [idx, visible.length])

  const markFailed = (src: string) =>
    setFailed((f) => {
      const next = new Set(f)
      next.add(src)
      return next
    })

  const hasPhotos = visible.length > 0

  return (
    <section className="relative h-48 overflow-hidden rounded-xl sm:h-64">
      {hasPhotos ? (
        visible.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 768px) 100vw, 1152px"
            onError={() => markFailed(src)}
            className={`object-cover transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-field-grass to-field-clay" aria-hidden />
      )}

      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" aria-hidden />

      {/* Wordmark */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white drop-shadow sm:text-4xl">
          The <span className="text-field-gold">Softball</span> Team
        </h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-white/90 drop-shadow">{subtitle}</p>}
      </div>

      {/* Rotation dots */}
      {visible.length > 1 && (
        <div className="absolute right-3 top-3 flex gap-1.5">
          {visible.map((src, i) => (
            <span
              key={src}
              className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </section>
  )
}
