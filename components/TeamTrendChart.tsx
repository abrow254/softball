import type { SeasonRecord } from '@/lib/seasonRecords'

// Season-by-season run differential, as a baseline bar chart. Tells the "are we
// getting better" story at a glance: green bars above the line are net-positive
// seasons, clay below. Record + finish are labelled under each bar.

const termShort = (t: string) => (t === 'Fall' ? 'Fa' : 'Su')
const seasonKey = (r: SeasonRecord) => `${r.year}-${r.term}`
const termRank = (t: string) => (t === 'Fall' ? 1 : 0)

export function TeamTrendChart({ records }: { records: SeasonRecord[] }) {
  const data = [...records].sort((a, b) => a.year - b.year || termRank(a.term) - termRank(b.term))
  if (data.length < 2) return null

  const maxAbs = Math.max(...data.map((r) => Math.abs(r.runDiff)), 1)

  const W = 640
  const H = 220
  const PAD = { top: 22, right: 14, bottom: 44, left: 14 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const baselineY = PAD.top + chartH / 2
  const slot = chartW / data.length
  const barW = Math.min(46, slot * 0.6)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[34rem]" aria-label="Run differential by season">
        {/* zero baseline */}
        <line
          x1={PAD.left}
          y1={baselineY}
          x2={PAD.left + chartW}
          y2={baselineY}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        {data.map((r, i) => {
          const cx = PAD.left + slot * i + slot / 2
          const h = (Math.abs(r.runDiff) / maxAbs) * (chartH / 2)
          const positive = r.runDiff >= 0
          const y = positive ? baselineY - h : baselineY
          const color = positive ? 'var(--field-grass, #2f7d4f)' : 'var(--field-clay, #b04a3a)'
          const fill = positive ? '#2f7d4f' : '#b04a3a'
          return (
            <g key={seasonKey(r)}>
              <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(h, 1)} rx={2} fill={fill} opacity={0.85} />
              {/* run-diff value */}
              <text
                x={cx}
                y={positive ? y - 5 : y + h + 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={fill}
              >
                {r.runDiff > 0 ? `+${r.runDiff}` : r.runDiff}
              </text>
              {/* season label */}
              <text x={cx} y={H - 26} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.65}>
                &rsquo;{String(r.year).slice(2)} {termShort(r.term)}
              </text>
              {/* record + finish */}
              <text x={cx} y={H - 13} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.5}>
                {r.w}-{r.l}{r.d > 0 ? `-${r.d}` : ''} · {r.finished}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
