import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason } from '@/lib/db'
import { SeasonsAdmin } from '@/components/SeasonsAdmin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Seasons — The Softball Team' }

export default async function SeasonsAdminPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const [seasons, currentSeason] = await Promise.all([listSeasons(), getCurrentSeason()])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Seasons</h1>
        <p className="mt-1 text-sm text-field-muted">
          Set which season is live. <strong>Mark complete</strong> ends the current season (it stops showing as
          &ldquo;in progress&rdquo;); its final placement is recorded separately in the records registry.
        </p>
      </div>

      {seasons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No seasons yet.
        </p>
      ) : (
        <SeasonsAdmin seasons={seasons} currentId={currentSeason?.id ?? null} />
      )}
    </div>
  )
}
