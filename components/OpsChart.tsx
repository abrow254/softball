import { fmt3 } from '@/lib/formulas'
import type { PlayerSeasonRow } from '@/lib/types'

export interface OpsSeries {
  label: string
  color: string
  seasons: PlayerSeasonRow[]
}

const termRank = (t: string) => (t === 'Fall' ? 1 : 0)

// OPS-by-season line chart. Accepts one or more players' season rows and plots
// each on a shared x-axis (union of seasons, chronological) and y-scale.
export function OpsChart({ series }: { series: OpsSeries[] }) {
  // Union of seasons across all series, chronological.
  const keyOf = (s: PlayerSeasonRow) => `${s.year}-${s.term}`
  const axisMap = new Map<string, { label: string; year: number; term: string }>()
  for (const ser of series) {
    for (const s of ser.seasons) {
      axisMap.set(keyOf(s), { label: s.season_label, year: s.year, term: s.term })
    }
  }
  const axis = [...axisMap.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => a.year - b.year || termRank(a.term) - termRank(b.term))

  if (axis.length < 2) return null

  const allOps = series.flatMap((s) => s.seasons.map((r) => Number(r.ops)))
  const minOps = Math.max(0, Math.min(...allOps) - 0.1)
  const maxOps = Math.max(...allOps) + 0.05
  const range = maxOps - minOps || 0.01

  const W = 600
  const H = 140
  const PAD = { top: 16, right: 20, bottom: 40, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const xAt = (key: string) => {
    const i = axis.findIndex((a) => a.key === key)
    return PAD.left + (axis.length === 1 ? chartW / 2 : (i / (axis.length - 1)) * chartW)
  }
  const yAt = (ops: number) => PAD.top + chartH - ((ops - minOps) / range) * chartH

  return (
    <div className="space-y-1 overflow-x-auto">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl" aria-label="OPS by season">
        {[0, 0.5, 1].map((t) => {
          const y = PAD.top + chartH - t * chartH
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="currentColor" strokeOpacity={0.1} />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.5}>
                {fmt3(minOps + t * range)}
              </text>
            </g>
          )
        })}

        {axis.map((a) => (
          <text
            key={a.key}
            x={xAt(a.key)}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="currentColor"
            fillOpacity={0.55}
          >
            {a.label}
          </text>
        ))}

        {series.map((ser) => {
          const pts = [...ser.seasons]
            .sort((a, b) => a.year - b.year || termRank(a.term) - termRank(b.term))
            .map((s) => ({ x: xAt(keyOf(s)), y: yAt(Number(s.ops)), ops: Number(s.ops) }))
          return (
            <g key={ser.label}>
              {pts.length > 1 && (
                <polyline
                  points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={ser.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              )}
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={4} fill={ser.color} />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill={ser.color} fontWeight="600">
                    {fmt3(p.ops)}
                  </text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
