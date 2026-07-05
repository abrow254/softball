import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOpponentDetail } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { name: string } }) {
  const detail = await getOpponentDetail(decodeURIComponent(params.name))
  return { title: detail ? `vs ${detail.record.name} — The Softball Team` : 'Rival — The Softball Team' }
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center">
      <div className={`tabular text-xl font-semibold ${tone ?? 'text-field-ink'}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const RESULT_CLASS: Record<'W' | 'L' | 'D', string> = {
  W: 'text-field-grass',
  L: 'text-field-clay',
  D: 'text-field-muted',
}

export default async function OpponentDetailPage({ params }: { params: { name: string } }) {
  const detail = await getOpponentDetail(decodeURIComponent(params.name))
  if (!detail) notFound()

  const { record, games } = detail
  const diffTone = record.diff > 0 ? 'text-field-grass' : record.diff < 0 ? 'text-field-clay' : 'text-field-ink'
  const rsPerG = record.gp > 0 ? (record.rf / record.gp).toFixed(1) : '—'
  const raPerG = record.gp > 0 ? (record.ra / record.gp).toFixed(1) : '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/opponents" className="text-xs font-medium text-field-grass hover:underline">
            ← All rivals
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-field-ink">vs {record.name}</h1>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile label="Record" value={`${record.w}-${record.l}${record.d > 0 ? `-${record.d}` : ''}`} />
        <Tile label="Run Diff" value={record.diff > 0 ? `+${record.diff}` : String(record.diff)} tone={diffTone} />
        <Tile label="Games" value={String(record.gp)} />
        <Tile label="RS/game" value={rsPerG} />
        <Tile label="RA/game" value={raPerG} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-field-muted">Meetings</h2>
        <div className="overflow-x-auto rounded-lg border border-field-line">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-field-line bg-field-cream text-left text-xs uppercase tracking-wide text-field-muted">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-2 py-2 font-semibold">Season</th>
                <th className="px-2 py-2 text-center font-semibold">Score</th>
                <th className="px-2 py-2 text-center font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.game_id} className="border-b border-field-line last:border-0">
                  <td className="px-3 py-2 text-field-ink">
                    <Link href={`/games/${g.game_id}/card`} className="hover:text-field-grass hover:underline">
                      {shortDate(g.game_date)}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-field-muted">{g.season_label}</td>
                  <td className="px-2 py-2 text-center tabular font-semibold text-field-ink">
                    {g.our_runs}–{g.opp_runs}
                  </td>
                  <td className={`px-2 py-2 text-center font-bold ${RESULT_CLASS[g.result]}`}>{g.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
