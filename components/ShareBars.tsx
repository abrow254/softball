import Link from 'next/link'

export interface ShareRow {
  player_id: string
  name: string
  value: number // share numerator (e.g. this player's runs)
  display: string // formatted raw value, e.g. "34"
}

// Horizontal proportion bars: each player's share of a team total. Rows should
// be pre-sorted desc; widths are relative to the largest share.
export function ShareBars({ rows, tone = '#2f7d4f' }: { rows: ShareRow[]; tone?: string }) {
  const total = rows.reduce((a, r) => a + Math.max(0, r.value), 0)
  const top = Math.max(...rows.map((r) => r.value), 1)
  if (total <= 0) return <p className="text-sm text-field-muted">—</p>
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const pct = total > 0 ? (r.value / total) * 100 : 0
        const w = Math.max(2, (r.value / top) * 100)
        return (
          <li key={r.player_id} className="flex items-center gap-2 text-sm">
            <Link href={`/players/${r.player_id}`} className="w-24 shrink-0 truncate text-field-ink hover:underline">
              {r.name}
            </Link>
            <div className="relative h-4 flex-1 overflow-hidden rounded bg-field-cream">
              <div className="h-full rounded" style={{ width: `${w}%`, background: tone, opacity: 0.85 }} />
            </div>
            <span className="tabular w-10 shrink-0 text-right text-field-muted">{r.display}</span>
            <span className="tabular w-9 shrink-0 text-right text-[11px] text-field-muted">{pct.toFixed(0)}%</span>
          </li>
        )
      })}
    </ul>
  )
}
