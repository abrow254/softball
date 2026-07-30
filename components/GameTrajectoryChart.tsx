import type { TrajectoryGame } from '@/lib/db/seasonInsights'

// Per-game run differential as a baseline bar chart across one season — green
// bars above the line are wins, clay below are losses (forfeits show a hollow
// tick). Reads left-to-right in date order.
export function GameTrajectoryChart({ games }: { games: TrajectoryGame[] }) {
  if (games.length === 0) return null
  const maxAbs = Math.max(...games.map((g) => Math.abs(g.diff)), 1)

  const W = 640
  const H = 180
  const PAD = { top: 16, right: 12, bottom: 24, left: 12 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const baselineY = PAD.top + chartH / 2
  const slot = chartW / games.length
  const barW = Math.min(30, slot * 0.62)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[34rem]" aria-label="Run differential by game">
        <line x1={PAD.left} y1={baselineY} x2={PAD.left + chartW} y2={baselineY} stroke="currentColor" strokeOpacity={0.2} />
        {games.map((g, i) => {
          const cx = PAD.left + slot * i + slot / 2
          const h = (Math.abs(g.diff) / maxAbs) * (chartH / 2)
          const win = g.result === 'W'
          const fill = win ? '#2f7d4f' : g.result === 'L' ? '#b04a3a' : '#9ca3af'
          const y = g.diff >= 0 ? baselineY - h : baselineY
          return (
            <g key={i}>
              {g.forfeit ? (
                <rect
                  x={cx - barW / 2}
                  y={win ? baselineY - 8 : baselineY}
                  width={barW}
                  height={8}
                  rx={2}
                  fill="none"
                  stroke={fill}
                  strokeDasharray="2 2"
                />
              ) : (
                <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(h, 1)} rx={2} fill={fill} opacity={0.85} />
              )}
              <text
                x={cx}
                y={g.diff >= 0 ? y - 4 : y + Math.max(h, 1) + 11}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill={fill}
              >
                {g.forfeit ? 'FF' : g.diff > 0 ? `+${g.diff}` : g.diff}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
