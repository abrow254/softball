import type { CareerStatRow } from '@/lib/types'

// Career achievement badges shown on the player profile. Declarative config so
// thresholds are easy to tune. Each milestone reads one number off the career
// line (plus PotG count, passed in separately).

export interface Badge {
  label: string // earned badge text, e.g. "100 Hits"
  emoji: string
}

export interface NextMilestone {
  label: string // e.g. "250 Hits"
  current: number
  target: number
}

interface MilestoneConfig {
  emoji: string
  noun: string // "Hits", "HR", ...
  tiers: number[]
  value: (c: CareerStatRow, potg: number) => number
}

const MILESTONES: MilestoneConfig[] = [
  { emoji: '🏏', noun: 'Hits', tiers: [50, 100, 250, 500], value: (c) => c.hits },
  { emoji: '💣', noun: 'HR', tiers: [10, 25, 50, 100], value: (c) => c.hr },
  { emoji: '🧱', noun: 'TB', tiers: [100, 250, 500, 1000], value: (c) => c.tb },
  { emoji: '🎮', noun: 'Games', tiers: [25, 50, 100, 150], value: (c) => c.gp },
  { emoji: '🏆', noun: 'RBI', tiers: [50, 100, 250], value: (c) => c.rbi },
  { emoji: '🐦', noun: 'PotG', tiers: [1, 5, 10, 25], value: (_c, potg) => potg },
]

// Earned badges (highest tier reached per category) + the next target per
// category for a progress hint.
export function getPlayerBadges(
  career: CareerStatRow,
  potgCount: number,
): { earned: Badge[]; next: NextMilestone[] } {
  const earned: Badge[] = []
  const next: NextMilestone[] = []

  for (const m of MILESTONES) {
    const v = m.value(career, potgCount)
    const reached = m.tiers.filter((t) => v >= t)
    if (reached.length > 0) {
      const top = reached[reached.length - 1]
      earned.push({ label: `${top} ${m.noun}`, emoji: m.emoji })
    }
    const upcoming = m.tiers.find((t) => v < t)
    if (upcoming !== undefined) {
      next.push({ label: `${upcoming} ${m.noun}`, current: v, target: upcoming })
    }
  }

  return { earned, next }
}
