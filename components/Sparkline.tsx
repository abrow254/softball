// Tiny inline sparkline of a player's recent per-game form values (oldest→newest).
export function Sparkline({ values, color = '#2f7d4f' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const W = 56
  const H = 16
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 2) + 1
    const y = H - 1 - ((v - min) / range) * (H - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r={1.6} fill={color} />
    </svg>
  )
}
