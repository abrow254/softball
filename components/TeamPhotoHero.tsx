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
    <section className="softball-hero relative isolate overflow-hidden rounded-[22px] bg-[#C41E3A] text-white sm:min-h-[320px]">
      {/* On phones, keep the team photo separate from the copy so faces stay visible. */}
      <div className="relative h-[230px] w-full overflow-hidden bg-[#7e182c] sm:absolute sm:inset-y-0 sm:right-0 sm:h-full sm:w-[59%]" aria-label="Team photo">
        {visible.map((src, i) => (
          <div key={src} className={['absolute inset-0 transition-opacity duration-1000', i === idx ? 'opacity-100' : 'opacity-0'].join(' ')}>
            <Image src={src} alt="The Softball Team" fill priority={i === 0}
              sizes="(max-width: 640px) 100vw, 700px"
              className="object-contain object-center"
              onError={() => markFailed(src)} />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#C41E3A] via-[#C41E3A]/40 to-transparent sm:block" />
      </div>
      <div className="relative z-10 px-5 py-7 sm:flex sm:min-h-[320px] sm:w-[63%] sm:flex-col sm:justify-center sm:px-9 sm:py-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.20em] text-white/85 sm:text-xs">
          Forest City Slo-Pitch <span className="mx-2 text-field-gold">/</span> Since 2022
        </p>
        <h1 className="font-display text-[clamp(2.9rem,10vw,5.5rem)] font-bold uppercase leading-[0.91] tracking-[-0.035em]">
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
        {subtitle && <p className="mt-3 text-xs font-medium text-white/80">{subtitle}</p>}
      </div>
    </section>
  )
}
