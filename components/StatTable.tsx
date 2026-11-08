'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { fmt3, fmtPct } from '@/lib/formulas'

export type ColKind = 'text' | 'int' | 'rate' | 'pct' | 'war'

export interface Col<T> {
  key: keyof T
  label: string
  kind: ColKind
  title?: string
  hideOnMobile?: boolean // lower-priority column: hidden on phones, shown ≥ sm
}

interface BaseRow {
  player_id: string
  name: string
  is_regular: boolean
  ab: number
}

// Columns that should never get a "leader" crown (lower is better, or noise).
const NO_LEADER = new Set(['name', 'k', 'gp', 'seasons_played', 'season_label'])

// Rate/pct leaders only count players with enough at-bats; counting stats don't.
function leaderValues<T extends BaseRow>(
  rows: T[],
  cols: Col<T>[],
  rateMinAb: number,
): Partial<Record<keyof T, number>> {
  const out: Partial<Record<keyof T, number>> = {}
  for (const col of cols) {
    if (col.kind === 'text' || NO_LEADER.has(String(col.key))) continue
    const qualified = col.kind === 'int' ? rows : rows.filter((r) => r.ab >= rateMinAb)
    let max = 0
    for (const r of qualified) {
      const n = Number(r[col.key])
      if (Number.isFinite(n)) max = Math.max(max, n)
    }
    if (max > 0) out[col.key] = max // >0 guard avoids crowning all-zero columns
  }
  return out
}

function formatCell<T>(row: T, col: Col<T>): string {
  const v = row[col.key]
  switch (col.kind) {
    case 'rate':
      return fmt3(Number(v))
    case 'pct':
      return fmtPct(Number(v))
    case 'war':
      return v == null ? '—' : Number(v).toFixed(1)
    default:
      return String(v)
  }
}

function sortRows<T>(rows: T[], key: keyof T, dir: 'asc' | 'desc'): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key] as unknown
    const bv = b[key] as unknown
    if (typeof av === 'string' || typeof bv === 'string') {
      return sign * String(av).localeCompare(String(bv))
    }
    return sign * (Number(av) - Number(bv))
  })
}

function Table<T extends BaseRow>({
  rows,
  cols,
  sortKey,
  dir,
  onSort,
  linkBase,
  rowKey,
  leaders,
  dimmed,
}: {
  rows: T[]
  cols: Col<T>[]
  sortKey: keyof T
  dir: 'asc' | 'desc'
  onSort: (key: keyof T) => void
  linkBase?: string
  rowKey: (row: T) => string
  leaders?: Partial<Record<keyof T, number>>
  dimmed?: (row: T) => boolean
}) {
  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-field-line bg-white shadow-sm" role="region" aria-label="Sortable player statistics" tabIndex={0}>
      <table className="stats-table tabular min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-field-cream text-field-muted">
            {cols.map((col, i) => {
              const active = col.key === sortKey
              return (
                <th
                  key={String(col.key)}
                  title={col.title}
                  scope="col"
                  aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={[
                    'select-none whitespace-nowrap border-b border-field-line px-3 py-3 text-[11px] font-bold uppercase tracking-[0.07em]',
                    i === 0 ? 'sticky left-0 z-10 bg-field-cream text-left' : 'text-right',
                    active ? 'text-field-grass' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex min-h-6 items-center gap-1 hover:text-field-grass focus-visible:rounded"
                    title={col.title ?? `Sort by ${col.label}`}
                  >
                    {col.label}
                    {active && <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={[
                'border-b border-field-line/70 even:bg-field-cream/70 transition-colors',
                dimmed?.(row) ? 'opacity-45' : '',
              ].join(' ')}
            >
              {cols.map((col, i) => {
                const isLeader =
                  leaders != null &&
                  col.key in leaders &&
                  Number(row[col.key]) === leaders[col.key] &&
                  (col.kind === 'int' || row.ab > 0)
                const content =
                  i === 0 && linkBase ? (
                    <Link href={`${linkBase}/${row.player_id}`} className="hover:text-field-grass hover:underline">
                      {formatCell(row, col)}
                    </Link>
                  ) : (
                    formatCell(row, col)
                  )
                return (
                  <td
                    key={String(col.key)}
                    title={isLeader ? `Team leader · ${col.label}` : undefined}
                    className={[
                      'whitespace-nowrap px-3 py-2.5',
                      i === 0
                        ? 'sticky left-0 z-10 bg-field-paper text-left font-medium text-field-ink'
                        : 'text-right text-field-ink',
                      isLeader ? 'bg-field-gold/20 font-bold text-field-ink' : '',
                    ].join(' ')}
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

    </div>
  )
}

// Generic sortable stat table. `split` renders Regulars/Ringers sections;
// otherwise a single table. `linkBase` turns the first column into a link to
// `${linkBase}/${player_id}`.
export function StatTable<T extends BaseRow>({
  rows,
  cols,
  defaultSortKey,
  defaultDir = 'desc',
  split = false,
  sections,
  linkBase,
  rowKeyField = 'player_id' as keyof T,
  highlightLeaders = false,
  qualifyMinAb = 15,
  emptyMessage = 'Nothing to show yet.',
}: {
  rows: T[]
  cols: Col<T>[]
  defaultSortKey: keyof T
  defaultDir?: 'asc' | 'desc'
  split?: boolean
  // Custom labeled sections, rendered in order (overrides `split`). Kept
  // serializable (field + value, not a function) so server components can
  // pass it across the RSC boundary.
  sections?: { label: string; field: keyof T; equals: string | number | boolean }[]
  linkBase?: string
  rowKeyField?: keyof T
  highlightLeaders?: boolean
  qualifyMinAb?: number
  emptyMessage?: string
}) {
  const rowKey = (row: T) => String(row[rowKeyField])
  const [sortKey, setSortKey] = useState<keyof T>(defaultSortKey)
  const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir)
  const [view, setView] = useState<'standard' | 'expanded'>('standard')
  // The same underlying rows, values, sorting and leader rules in both views.
  // 'Standard' trims secondary rate/split columns, 'Expanded' exposes all.
  const visibleCols = useMemo(
    () => view === 'expanded' ? cols : cols.filter((col) => !col.hideOnMobile),
    [cols, view],
  )
  const chooseView = (next: 'standard' | 'expanded') => {
    setView(next)
    if (next === 'standard' && cols.some((col) => col.key === sortKey && col.hideOnMobile)) {
      setSortKey(defaultSortKey)
      setDir(defaultDir)
    }
  }

  function onSort(key: keyof T) {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  // When sorting by a rate stat, players below the AB qualifier drop to the
  // bottom (and render dimmed) so small samples never top a rate leaderboard.
  const activeKind = useMemo(() => cols.find((c) => c.key === sortKey)?.kind, [cols, sortKey])
  const isRateSort = activeKind === 'rate' || activeKind === 'pct' || activeKind === 'war'
  const qualifies = (r: T) => r.ab >= qualifyMinAb

  const sorted = useMemo(() => {
    const s = sortRows(rows, sortKey, dir)
    if (highlightLeaders && isRateSort) {
      return [...s.filter(qualifies), ...s.filter((r) => !qualifies(r))]
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, dir, highlightLeaders, isRateSort, qualifyMinAb])

  const leaders = useMemo(
    () => (highlightLeaders ? leaderValues(rows, cols, qualifyMinAb) : undefined),
    [rows, cols, highlightLeaders, qualifyMinAb],
  )
  const dimmed = highlightLeaders && isRateSort ? (r: T) => !qualifies(r) : undefined

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-field-line-strong bg-field-paper px-4 py-8 text-center text-field-muted">
        {emptyMessage}
      </p>
    )
  }

  // Resolve sections to {label, filter}. Explicit `sections` (field+value) wins;
  // else `split` → Regulars/Ringers. Filter functions are built here (client
  // side), never received as props.
  const sectionList: { label: string; filter: (row: T) => boolean }[] | null = sections
    ? sections.map((s) => ({ label: s.label, filter: (r: T) => r[s.field] === s.equals }))
    : split
      ? [
          { label: 'Regulars', filter: (r: T) => r.is_regular },
          { label: 'Ringers', filter: (r: T) => !r.is_regular },
        ]
      : null


  const viewToggle = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-field-muted">
        {rows.length} players · Tap a heading to sort
      </p>
      <div className="inline-flex rounded-full border border-field-line bg-field-cream p-1" role="group" aria-label="Choose table columns">
        {(['standard', 'expanded'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => chooseView(option)}
            className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors ${view === option ? 'bg-field-grass text-white shadow-sm' : 'text-field-muted hover:text-field-ink'}`}
          >
            {option === 'standard' ? 'Standard' : 'Expanded'}
          </button>
        ))}
      </div>
    </div>
  )

  if (!sectionList) {
    return (
      <div>
        {viewToggle}
        <Table rows={sorted} cols={visibleCols} sortKey={sortKey} dir={dir} onSort={onSort} linkBase={linkBase} rowKey={rowKey} leaders={leaders} dimmed={dimmed} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {viewToggle}
      {sectionList.map(({ label, filter }) => {
        const sectionRows = sorted.filter(filter)
        if (sectionRows.length === 0) return null
        return (
          <section key={label}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-field-muted">{label}</h2>
            <Table rows={sectionRows} cols={visibleCols} sortKey={sortKey} dir={dir} onSort={onSort} linkBase={linkBase} rowKey={rowKey} leaders={leaders} dimmed={dimmed} />
          </section>
        )
      })}
    </div>
  )
}
