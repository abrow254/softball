import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/app/auth/actions'

export async function NavBar() {
  const current = await getCurrentUser()
  const isAdmin = current?.role === 'admin'

  return (
    <header className="no-print border-b-4 border-field-gold bg-field-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/stats"
          className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-field-ink"
        >
          <span aria-hidden>🥎</span>
          <span>
            The <span className="text-field-grass">Softball</span> Team
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/stats" className="text-field-muted hover:text-field-ink">
            Stats
          </Link>
          <Link href="/players" className="text-field-muted hover:text-field-ink">
            All-Time
          </Link>
          {isAdmin && (
            <Link href="/games" className="text-field-muted hover:text-field-ink">
              Games
            </Link>
          )}
          {current ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="rounded-full bg-field-grass/10 px-2 py-0.5 text-xs font-medium text-field-grass">
                  admin
                </span>
              )}
              <form action={signOut}>
                <button type="submit" className="text-field-muted hover:text-field-ink">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-field-grass px-3 py-1.5 font-medium text-white hover:bg-field-grass/90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
