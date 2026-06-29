'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface TeamPhotoHeroProps {
  photos: string[]
  title: string
  subtitle?: string | null
}

// Full-width hero. Rotates through team photos with a slow crossfade; falls
// back to a grass-gradient wordmark block when no photos are configured yet
// (drop files in /public/team and list them in TEAM_PHOTOS on the dashboard).
export function TeamPhotoHero({ photos, title, subtitle }: TeamPhotoHeroProps) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 5000)
    return () => clearInterval(t)
  }, [photos.length])

  const hasPhotos = photos.length > 0

  return (
    <section className="relative h-48 overflow-hidden rounded-xl sm:h-64">
      {hasPhotos ? (
        photos.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 768px) 100vw, 1152px"
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
      {photos.length > 1 && (
        <div className="absolute right-3 top-3 flex gap-1.5">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </section>
  )
}
