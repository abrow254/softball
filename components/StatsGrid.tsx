'use client'

import { useMemo, useState } from 'react'
import type { SeasonStatRow } from '@/lib/types'
import { fmt3, fmtPct } from '@/lib/formulas'

type Kind = 'text' | 'int' | 'rate' | 'pct'

interface Col {
  key: keyof SeasonStatRow
  label: string
  kind: Kind
  title?: string
}

// Column order mirrors the old spreadsheet: counting stats, then rate stats.
const COLS: Col[] = [
  { key: 'name', label: 'Player', kind: 'text' },
  { key: 'gp', label: 'GP', kind: 'int', title: 'Games played' },
  { key: 'games_missed', label: 'GM', kind: 'int', title: 'Games missed' },
  { key: 'pa', label: 'PA', kind: 'int', title: 'Plate appearances (house rule: runs + hits + bb + hbp + roe)' },
  { key: 'ab', label: 'AB', kind: 'int', title: 'At-bats' },
  { key: 'runs', label: 'R', kind: 'int', title: 'Runs' },
  { key: 'hits', label: 'H', kind: 'int', title: 'Hits' },
  { key: 'singles', label: '1B', kind: 'int' },
  { key: 'doubles', label: '2B', kind: 'int' },
  { key: 'triples', label: '3B', kind: 'int' },
  { key: 'hr', label: 'HR', kind: 'int' },
  { key: 'rbi', label: 'RBI', kind: 'int' },
  { key: 'bb', label: 'BB', kind: 'int' },
  { key: 'k', label: 'K', kind: 'int' },
  { key: 'tb', label: 'TB', kind: 'int', title: 'Total bases' },
  { key: 'avg', label: 'AVG', kind: 'rate', title: 'hits / ab' },
  { key: 'obp', label: 'OBP', kind: 'rate', title: 'House rule: (hits + fc) / ab' },
  { key: 'slg', label: 'SLG', kind: 'rate', title: 'tb / ab' },
  { key: 'ops', label: 'OPS', kind: 'rate', title: 'House rule: AVG + SLG' },
  { key: 'iso', label: 'ISO', kind: 'rate', title: 'slg - avg' },
  { key: 'xbh_pct', label: 'XBH%', kind: 'pct', title: '(2B + 3B + HR) / hits' },
]

function formatCell(row: SeasonStatRow, col: Col): string {
  const v = row[col.key]
  switch (col.kind) {
    case 'text':
      return String(v)
    case 'rate':
      return fmt3(Number(v))
    case 'pct':
      return fmtPct(Number(v))
    default:
      return String(v)
  }
}

function sortRows(rows: SeasonStatRow[], key: keyof SeasonStatRow, dir: 'asc' | 'desc'): SeasonStatRow[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'string' || typeof bv === 'string') {
      return sign * String(av).localeCompare(String(bv))
    }
    return sign * (Number(av) - Number(bv))
  })
}

function Section({
  title,
  rows,
  sortKey,
  dir,
  onSort,
}: {
  title: string
  rows: SeasonStatRow[]
  sortKey: keyof SeasonStatRow
  dir: 'asc' | 'desc'
  onSort: (key: keyof SeasonStatRow) => void
}) {
  if (rows.length === 0) return null

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-field-line">
        <table className="tabular min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-field-cream/70 text-field-muted">
              {COLS.map((col, i) => {
                const active = col.key === sortKey
                return (
                  <th
                    key={col.key as string}
                    title={col.title}
                    onClick={() => onSort(col.key)}
                    className={[
                      'cursor-pointer select-none whitespace-nowrap px-2.5 py-2 font-medium',
                      i === 0
                        ? 'sticky left-0 z-10 bg-field-cream/95 text-left'
                        : 'text-right',
                      active ? 'text-field-ink' : '',
                    ].join(' ')}
                  >
                    {col.label}
                    {active && <span aria-hidden>{dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player_id} className="border-t border-field-line even:bg-field-cream/30">
                {COLS.map((col, i) => (
                  <td
                    key={col.key as string}
                    className={[
                      'whitespace-nowrap px-2.5 py-1.5',
                      i === 0
                        ? 'sticky left-0 z-10 bg-inherit text-left font-medium text-field-ink'
                        : 'text-right text-field-ink',
                    ].join(' ')}
                  >
                    {formatCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function StatsGrid({ rows }: { rows: SeasonStatRow[] }) {
  const [sortKey, setSortKey] = useState<keyof SeasonStatRow>('ops')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  function onSort(key: keyof SeasonStatRow) {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const regulars = useMemo(() => sortRows(rows.filter((r) => r.is_regular), sortKey, dir), [rows, sortKey, dir])
  const ringers = useMemo(() => sortRows(rows.filter((r) => !r.is_regular), sortKey, dir), [rows, sortKey, dir])

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        No games recorded for this season yet.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <Section title="Regulars" rows={regulars} sortKey={sortKey} dir={dir} onSort={onSort} />
      <Section title="Ringers" rows={ringers} sortKey={sortKey} dir={dir} onSort={onSort} />
    </div>
  )
}
