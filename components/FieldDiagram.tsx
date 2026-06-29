import { FIELDING_POSITIONS } from '@/lib/positions'

// x,y coordinates (viewBox 0 0 320 300) for each fielding position. Home plate
// at the bottom center; outfield across the top.
const SPOT: Record<string, { x: number; y: number }> = {
  C: { x: 160, y: 268 },
  '1B': { x: 232, y: 196 },
  '2B': { x: 196, y: 150 },
  SS: { x: 124, y: 150 },
  '3B': { x: 88, y: 196 },
  Rover: { x: 160, y: 120 },
  LF: { x: 72, y: 78 },
  CF: { x: 160, y: 52 },
  RF: { x: 248, y: 78 },
}

// Visual defensive alignment: the field with each assigned player's name at
// their position. Empty positions show as open; duplicates are flagged red.
export function FieldDiagram({ assignments }: { assignments: Record<string, string[]> }) {
  return (
    <svg viewBox="0 0 320 300" className="w-full max-w-md" aria-label="Defensive alignment">
      {/* Outfield grass */}
      <path d="M160 270 L20 110 A 200 200 0 0 1 300 110 Z" fill="#3f7d4f" fillOpacity={0.12} />
      {/* Infield dirt */}
      <path d="M160 270 L96 196 L160 124 L224 196 Z" fill="#c2843f" fillOpacity={0.18} />
      {/* Base lines */}
      <path
        d="M160 270 L96 196 L160 124 L224 196 Z"
        fill="none"
        stroke="#6b7280"
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />

      {FIELDING_POSITIONS.map((pos) => {
        const at = SPOT[pos]
        if (!at) return null
        const names = assignments[pos] ?? []
        const empty = names.length === 0
        const dup = names.length > 1
        const stroke = dup ? '#C2410C' : empty ? '#9ca3af' : '#2F6B4A'
        return (
          <g key={pos}>
            <circle
              cx={at.x}
              cy={at.y}
              r={15}
              fill={empty ? '#ffffff' : '#ffffff'}
              stroke={stroke}
              strokeWidth={dup ? 2.5 : 1.5}
              strokeDasharray={empty ? '3 3' : undefined}
            />
            <text x={at.x} y={at.y + 3} textAnchor="middle" fontSize={9} fontWeight="700" fill={stroke}>
              {pos}
            </text>
            <text
              x={at.x}
              y={at.y + 27}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              fillOpacity={empty ? 0.4 : 0.85}
            >
              {empty ? '—' : names.join(' / ')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
