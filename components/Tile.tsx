// Small stat tile: big value over a muted uppercase label. Shared by the
// dashboard, season stats, player profile, and records pages.
export function Tile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-lg border border-field-line bg-field-paper px-3 py-2 text-center" title={title}>
      <div className="tabular text-xl font-semibold text-field-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}
