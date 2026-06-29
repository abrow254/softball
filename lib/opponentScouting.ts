import type { Standings } from '@/lib/standings'

// Opponent scouting derived from the league standings: are they good at batting
// (runs scored vs league avg), defence (runs allowed vs league avg), or both.
// Pure + serializable so it can be computed on the server and passed to client
// components. (The Standings import is type-only and erased at build.)

export type Strength = 'strong' | 'average' | 'weak'

export interface OppAnalysis {
  diff: number
  rpgFor: number
  rpgAgainst: number
  batting: Strength
  defence: Strength
  read: string
}

const normOpp = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()

export function analyzeOpponent(standings: Standings, teamName: string): OppAnalysis | null {
  const rows = standings.pools.flatMap((p) => p.rows).map((r) => ({ ...r, gp: r.w + r.l + r.d }))
  const opp = rows.find((r) => normOpp(r.team) === normOpp(teamName))
  if (!opp || opp.gp === 0) return null

  const played = rows.filter((r) => r.gp > 0)
  const avgFor = played.reduce((s, r) => s + r.pf / r.gp, 0) / played.length
  const avgAgainst = played.reduce((s, r) => s + r.pa / r.gp, 0) / played.length

  const rpgFor = opp.pf / opp.gp
  const rpgAgainst = opp.pa / opp.gp
  const HI = 1.08
  const LO = 0.92

  const batting: Strength = rpgFor > avgFor * HI ? 'strong' : rpgFor < avgFor * LO ? 'weak' : 'average'
  // Defence: fewer runs allowed is better.
  const defence: Strength =
    rpgAgainst < avgAgainst * LO ? 'strong' : rpgAgainst > avgAgainst * HI ? 'weak' : 'average'

  let read: string
  if (batting === 'strong' && defence === 'strong') read = 'Complete team — bring your best.'
  else if (batting === 'strong' && defence === 'weak') read = 'Big bats but leaky — win the shootout.'
  else if (batting === 'weak' && defence === 'strong') read = 'Stingy defence, light bats — small ball wins.'
  else if (batting === 'weak' && defence === 'weak') read = 'Beatable on both sides — take care of business.'
  else if (batting === 'strong') read = 'Watch the bats — they can put up runs.'
  else if (defence === 'strong') read = 'Tough defence — scratch runs across.'
  else if (batting === 'weak') read = 'Light-hitting — keep them quiet.'
  else if (defence === 'weak') read = 'Leaky defence — pour it on.'
  else read = 'Middle of the pack — even matchup.'

  return { diff: opp.diff, rpgFor, rpgAgainst, batting, defence, read }
}
