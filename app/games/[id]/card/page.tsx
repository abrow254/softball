import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getGame, getBoxScore } from '@/lib/db'
import { BoxScore } from '@/components/BoxScore'

export const dynamic = 'force-dynamic'

export default async function GameCardPage({ params }: { params: { id: string } }) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')

  const game = await getGame(params.id)
  if (!game) notFound()

  const boxScore = await getBoxScore(game.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-field-ink">
            {game.opponent ? `vs ${game.opponent}` : 'Game card'}
          </h1>
          {game.game_date && (
            <p className="mt-1 text-sm text-field-muted">{game.game_date}</p>
          )}
        </div>
        {current.role === 'admin' && (
          <Link
            href={`/games/${game.id}/edit`}
            className="rounded-md border border-field-line-strong px-4 py-2 font-medium text-field-ink hover:bg-field-cream"
          >
            Edit game
          </Link>
        )}
      </div>

      {boxScore && boxScore.length > 0 ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Box Score</h2>
            <BoxScore rows={boxScore} opponent={game.opponent} />
          </section>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-field-line bg-field-paper px-4 py-8 text-center text-sm text-field-muted">
          No stats recorded yet.{' '}
          {current.role === 'admin' && (
            <Link href={`/games/${game.id}/edit`} className="text-field-grass hover:underline">
              Add stats
            </Link>
          )}
        </p>
      )}
    </div>
  )
}
