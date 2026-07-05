import type { SeasonReview } from '@/lib/db/seasonReview'
import { fmt3 } from '@/lib/formulas'
import { isChampionSeason } from '@/lib/seasonRecords'

// A self-contained, screenshot-friendly season-in-review card for one player.
// Fixed to the light "paper" palette so it reads the same wherever it's shared.

function shortDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2 text-center ring-1 ring-field-line">
      <div className={`tabular font-bold text-field-ink ${big ? 'text-2xl' : 'text-lg'}`}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-field-muted">{label}</div>
    </div>
  )
}

export function SeasonReviewCard({ review }: { review: SeasonReview }) {
  const { line } = review
  const champion = isChampionSeason(review.year, review.term)
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-field-cream to-field-paper shadow-lg ring-1 ring-field-line-strong">
      {/* Header band */}
      <div className="bg-field-grass px-5 py-4 text-white">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-white/80">
          <span>Season in Review</span>
          <span>🥎 The Softball Team</span>
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <h1 className="text-2xl font-extrabold leading-tight">{review.playerName}</h1>
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-semibold">
            {review.seasonLabel}
          </span>
        </div>
        {champion && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-field-gold px-2.5 py-0.5 text-xs font-bold text-field-ink">
            🏆 League Champions
          </div>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Slash line */}
        <div className="grid grid-cols-4 gap-2">
          <Stat label="AVG" value={fmt3(line.avg)} big />
          <Stat label="OBP" value={fmt3(line.obp)} big />
          <Stat label="SLG" value={fmt3(line.slg)} big />
          <Stat label="OPS" value={fmt3(line.ops)} big />
        </div>

        {/* Counting stats */}
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Games" value={String(review.gp || '—')} />
          <Stat label="Hits" value={String(line.hits)} />
          <Stat label="HR" value={String(line.hr)} />
          <Stat label="RBI" value={String(line.rbi)} />
          <Stat label="Runs" value={String(line.runs)} />
          <Stat label="2B" value={String(line.doubles)} />
          <Stat label="3B" value={String(line.triples)} />
          <Stat label="TB" value={String(line.tb)} />
        </div>

        {/* Highlights */}
        {review.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {review.highlights.map((h) => (
              <span
                key={h}
                className="rounded-full border border-field-gold/50 bg-field-gold/20 px-2.5 py-1 text-xs font-semibold text-field-ink"
              >
                {h.includes('Player of the Game') ? '⭐ ' : '🔥 '}
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Best game */}
        {review.bestGame && (
          <div className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-field-line">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-field-muted">Best game</div>
            <div className="mt-0.5 text-sm font-medium text-field-ink">
              {review.bestGame.hits}-for-{review.bestGame.ab}
              {review.bestGame.hr > 0 ? `, ${review.bestGame.hr} HR` : ''}
              {review.bestGame.rbi > 0 ? `, ${review.bestGame.rbi} RBI` : ''}
              {review.bestGame.opponent ? ` vs ${review.bestGame.opponent}` : ''}
              {review.bestGame.date ? ` · ${shortDate(review.bestGame.date)}` : ''}
            </div>
          </div>
        )}

        {/* Team footer */}
        {review.teamRecord && (
          <div className="flex items-center justify-between border-t border-field-line pt-3 text-xs text-field-muted">
            <span>
              Team went{' '}
              <span className="font-semibold text-field-ink">
                {review.teamRecord.w}-{review.teamRecord.l}
                {review.teamRecord.d > 0 ? `-${review.teamRecord.d}` : ''}
              </span>
            </span>
            <span className="font-semibold text-field-grass">{review.teamRecord.finished}</span>
          </div>
        )}
      </div>
    </div>
  )
}
