import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/app/auth/actions'

export async function NavBar() {
  const current = await getCurrentUser()
  const isAdmin = current?.role === 'admin'

  return (
    <header className="no-print border-b-4 border-field-gold bg-field-grass text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/stats"
          className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"
        >
          <Image src="/favicon-96x96.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span>
            The <span className="text-field-gold">Softball</span> Team
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/stats" className="text-white/85 hover:text-white">
            Stats
          </Link>
          <Link href="/players" className="text-white/85 hover:text-white">
            All-Time
          </Link>
          <Link href="/standings" className="text-white/85 hover:text-white">
            Standings
          </Link>
          {isAdmin && (
            <>
              <Link href="/lineup" className="text-white/85 hover:text-white">
                Lineup
              </Link>
              <Link href="/games" className="text-white/85 hover:text-white">
                Games
              </Link>
            </>
          )}
          {current ? (
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
      </div>
    </header>
  )
}
