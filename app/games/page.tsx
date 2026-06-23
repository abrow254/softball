import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listSeasons, getCurrentSeason, listGames } from '@/lib/db'
import { SeasonSelector } from '@/components/SeasonSelector'
import { gameResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function GamesPage({ searchParams }: { searchParams: { season?: string } }) {
  const current = await getCurrentUser()
  if (!current) redirect('/login')
  if (current.role !== 'admin') redirect('/stats')

  const seasons = await listSeasons()
  const fallback = (await getCurrentSeason())?.id ?? seasons[0]?.id
  const selectedId =
    searchParams.season && seasons.some((s) => s.id === searchParams.season) ? searchParams.season : fallback

  const games = selectedId ? await listGames(selectedId) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Games</h1>
        <div className="flex items-center gap-3">
          {seasons.length > 0 && selectedId && (
            <SeasonSelector seasons={seasons} selectedId={selectedId} basePath="/games" />
          )}
          <Link
            href="/games/new"
            className="rounded-md bg-field-grass px-3 py-1.5 text-sm font-medium text-white hover:bg-field-grass/90"
          >
            New game
          </Link>
        </div>
      </div>

      {games.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No games for this season yet. Create one, or print a blank card to score by hand.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-field-line">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-field-cream/70 text-field-muted">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Opponent</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-center font-medium">Result</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const r = gameResult(g.our_runs, g.opp_runs)
                return (
                  <tr key={g.id} className="border-t border-field-line even:bg-field-cream/30">
                    <td className="whitespace-nowrap px-3 py-2 text-field-ink">{g.game_date ?? '—'}</td>
                    <td className="px-3 py-2 text-field-ink">{g.opponent ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-field-ink">
                      {g.our_runs != null && g.opp_runs != null ? `${g.our_runs}–${g.opp_runs}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r && (
                        <span
                          className={
                            r === 'W'
                              ? 'font-semibold text-field-grass'
                              : r === 'L'
                                ? 'font-semibold text-field-muted'
                                : 'text-field-muted'
                          }
                        >
                          {r}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Link href={`/games/${g.id}/edit`} className="text-field-grass hover:underline">
                        Edit
                      </Link>
                      <span className="px-1 text-field-line-strong">·</span>
                      <Link href={`/games/${g.id}/card`} className="text-field-grass hover:underline">
                        Card
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
