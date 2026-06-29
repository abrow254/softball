'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLink {
  href: string
  label: string
}

const PUBLIC_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/standings', label: 'Standings' },
  { href: '/stats', label: 'Stats' },
  { href: '/awards', label: 'Awards' },
  { href: '/records', label: 'Records' },
  { href: '/players', label: 'All-Time' },
  { href: '/compare', label: 'Compare' },
]

const ADMIN_LINKS: NavLink[] = [
  { href: '/lineup', label: 'Lineup' },
  { href: '/games', label: 'Games' },
  { href: '/admin/roster', label: 'Roster' },
]

export function NavMenu({
  isAdmin,
  signedIn,
  signOut,
}: {
  isAdmin: boolean
  signedIn: boolean
  signOut: () => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden items-center gap-4 text-sm sm:flex">
        {PUBLIC_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(l.href) ? 'font-medium text-white' : 'text-white/85 hover:text-white'}
          >
            {l.label}
          </Link>
        ))}
        {isAdmin && (
          <>
            <span className="h-4 w-px bg-white/30" aria-hidden />
            {ADMIN_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  isActive(l.href) ? 'font-medium text-field-gold' : 'text-field-gold/80 hover:text-field-gold'
                }
              >
                {l.label}
              </Link>
            ))}
          </>
        )}
        {signedIn ? (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">admin</span>
            )}
            <form action={signOut}>
              <button type="submit" className="text-white/85 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-field-gold px-3 py-1.5 font-medium text-field-ink hover:bg-field-gold/90"
          >
            Sign in
          </Link>
        )}
      </nav>

      {/* Mobile: hamburger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="-mr-2 flex h-11 w-11 items-center justify-center text-white sm:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <>
              <path d="M3 6h18" strokeLinecap="round" />
              <path d="M3 12h18" strokeLinecap="round" />
              <path d="M3 18h18" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile: tap-away backdrop */}
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-14 z-20 cursor-default sm:hidden"
        />
      )}

      {/* Mobile: drawer panel */}
      {open && (
        <div className="absolute inset-x-0 top-full z-30 border-t border-white/15 bg-field-grass shadow-lg sm:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  'flex min-h-[44px] items-center rounded-md px-2 text-base',
                  isActive(l.href) ? 'bg-white/10 font-medium text-white' : 'text-white/90',
                ].join(' ')}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="mt-2 border-t border-white/15 pt-2">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-field-gold/80">
                    Admin
                  </p>
                </div>
                {ADMIN_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={[
                      'flex min-h-[44px] items-center rounded-md px-2 text-base',
                      isActive(l.href) ? 'bg-white/10 font-medium text-field-gold' : 'text-field-gold/90',
                    ].join(' ')}
                  >
                    {l.label}
                  </Link>
                ))}
              </>
            )}
            <div className="mt-2 border-t border-white/15 pt-2">
              {signedIn ? (
                <div className="flex items-center justify-between">
                  {isAdmin && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">admin</span>
                  )}
                  <form action={signOut} className="ml-auto">
                    <button
                      type="submit"
                      className="flex min-h-[44px] items-center px-2 text-base text-white/90"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex min-h-[44px] items-center justify-center rounded-md bg-field-gold px-3 font-medium text-field-ink"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
