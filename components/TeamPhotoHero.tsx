'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface TeamPhotoHeroProps {
  photos: string[]
  subtitle?: string | null
}

// A short, red-led editorial hero. The newest team photo shows first and
// existing historical photos continue rotating, without delaying page content.
export function TeamPhotoHero({ photos, subtitle }: TeamPhotoHeroProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const visible = useMemo(() => [...photos].reverse().filter((src) => !failed.has(src)), [photos, failed])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (visible.length < 2) return
    const timer = setInterval(() => setIdx((i) => (i + 1) % visible.length), 6500)
    return () => clearInterval(timer)
  }, [visible.length])

  useEffect(() => {
    if (idx >= visible.length) setIdx(0)
  }, [idx, visible.length])

  const markFailed = (src: string) =>
    setFailed((previous) => {
      const next = new Set(previous)
      next.add(src)
      return next
    })

  return (
    <section className="softball-hero relative isolate flex min-h-[260px] items-center overflow-hidden rounded-[22px] bg-field-grass text-white sm:min-h-[278px]">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {visible.map((src, i) => (
          <div
            key={src}
            className={['absolute inset-0 transition-opacity duration-1000 sm:left-auto sm:w-[59%]', i === idx ? 'opacity-100' : 'opacity-0'].join(' ')}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0}
              sizes="(max-width: 640px) 100vw, 700px"
              className="object-contain object-right sm:object-contain"
              onError={() => markFailed(src)}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#C41E3A] via-[#C41E3A]/85 to-[#C41E3A]/25 sm:via-[#C41E3A]/90 sm:to-[#C41E3A]/10" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0px, transparent 8px, white 9px, transparent 10px)' }} />
      </div>

      <div className="relative z-10 w-full px-5 py-7 sm:px-9 sm:py-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80 sm:text-xs">
          Forest City Slo-Pitch <span className="mx-2 text-field-gold">/</span> Since 2022
        </p>
        <h1 className="max-w-2xl font-display text-[clamp(2.95rem,10.4vw,5.5rem)] font-bold uppercase leading-[0.91] tracking-[-0.035em]">
          <span className="block">The Softball</span>
          <span className="block">Team<span className="text-field-gold">.</span></span>
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/stats" className="inline-flex min-h-10 items-center rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-field-grass transition-colors hover:bg-field-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">
            Explore stats <span className="ml-2" aria-hidden>↗</span>
          </Link>
          <Link href="/schedule" className="inline-flex min-h-10 items-center rounded-full border border-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">
            Schedule
          </Link>
        </div>
        {subtitle && <p className="mt-3 text-xs font-medium text-white/75">{subtitle}</p>}
      </div>

      {visible.length > 1 && (
        <div className="absolute bottom-4 right-5 z-10 hidden gap-1.5 sm:flex" aria-hidden>
          {visible.map((src, i) => (
            <span key={src} className={['h-1 w-4 rounded-full transition-colors', i === idx ? 'bg-field-gold' : 'bg-white/40'].join(' ')} />
          ))}
        </div>
      )}
    </section>
  )
}
