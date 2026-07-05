import Link from 'next/link'
import { getOpponentRecords } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Rivals — The Softball Team' }

function diffClass(diff: number): string {
  if (diff > 0) return 'text-field-grass'
  if (diff < 0) return 'text-field-clay'
  return 'text-field-muted'
}

function StreakBadge({ streak }: { streak: { type: 'W' | 'L' | 'D'; n: number } | null }) {
  if (!streak || streak.n < 2) return null
  const cls =
    streak.type === 'W'
      ? 'bg-field-grass/10 text-field-grass'
      : streak.type === 'L'
        ? 'bg-field-clay/10 text-field-clay'
        : 'bg-field-cream text-field-muted'
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{streak.type}{streak.n}</span>
}

export default async function OpponentsPage() {
  const records = await getOpponentRecords()

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-field-ink">Rivals</h1>
        <p className="text-sm text-field-muted">
          All-time head-to-head, most-played first. Records are from games with a recorded score.
        </p>
      </div>

      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
          No opponent history yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-field-line">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-field-line bg-field-cream text-left text-xs uppercase tracking-wide text-field-muted">
                <th className="px-3 py-2 font-semibold">Opponent</th>
                <th className="px-2 py-2 text-center font-semibold">GP</th>
                <th className="px-2 py-2 text-center font-semibold">Record</th>
                <th className="px-2 py-2 text-center font-semibold">Run Diff</th>
                <th className="px-2 py-2 text-center font-semibold">RS/RA</th>
                <th className="px-2 py-2 text-center font-semibold">Streak</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.key} className="border-b border-field-line last:border-0 hover:bg-field-cream/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/opponents/${encodeURIComponent(r.key)}`}
                      className="font-medium text-field-ink hover:text-field-grass hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-center tabular text-field-muted">{r.gp}</td>
                  <td className="px-2 py-2 text-center tabular font-semibold text-field-ink">
                    {r.w}-{r.l}{r.d > 0 ? `-${r.d}` : ''}
                  </td>
                  <td className={`px-2 py-2 text-center tabular font-semibold ${diffClass(r.diff)}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                  <td className="px-2 py-2 text-center tabular text-field-muted">
                    {r.rf}/{r.ra}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <StreakBadge streak={r.curStreak} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
