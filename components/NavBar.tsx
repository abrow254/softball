import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/app/auth/actions'
import { NavMenu } from '@/components/NavMenu'

export async function NavBar() {
  const current = await getCurrentUser()
  const isAdmin = current?.role === 'admin'

  return (
    <header className="no-print relative border-b-4 border-field-gold bg-field-grass text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-white"
        >
          <Image src="/favicon-96x96.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span>
            The <span className="text-field-gold">Softball</span> Team
          </span>
        </Link>

        <NavMenu isAdmin={isAdmin} signedIn={!!current} signOut={signOut} />
      </div>
    </header>
  )
}
