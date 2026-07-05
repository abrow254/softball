import type { AvailabilityStatus } from '@/lib/types'

// Parse pasted poll / group-chat text into availability assignments by matching
// names against the season roster. Built for Facebook Messenger polls (no API),
// but tolerant of freeform "who's in" lists too.
//
// Recognizes section headers (In / Out / Maybe and common synonyms), inline
// status markers ("Aaron - out", "Mike ✅"), and strips vote counts / bullets /
// emojis. Anything before the first header defaults to "in".

export interface RosterName {
  player_id: string
  name: string
}

export interface PollAssignment {
  player_id: string
  name: string
  status: AvailabilityStatus
  matchedFrom: string // the raw token we matched
}

export interface PollParseResult {
  assignments: PollAssignment[]
  unmatched: string[] // names we couldn't match to the roster
  ambiguous: string[] // names that matched more than one player
}

const strip = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ') // punctuation / emoji -> space
    .replace(/\s+/g, ' ')
    .trim()

type Bucket = AvailabilityStatus

// A header line (optionally followed by a count) toggles the current bucket.
function headerBucket(clean: string): Bucket | null {
  if (/^(in|yes|playing|available|going|here)$/.test(clean)) return 'in'
  if (/^(out|no|not playing|cant|cannot|unavailable|nope|away)$/.test(clean)) return 'out'
  if (/^(maybe|unsure|tbd|possibly|probably|ifneeded|if needed)$/.test(clean)) return 'maybe'
  return null
}

// An inline trailing status marker, e.g. "Aaron out", "Mike - maybe".
function inlineStatus(clean: string): { name: string; status: Bucket } | null {
  const m = clean.match(/^(.+?)\s+(in|out|maybe|yes|no)$/)
  if (!m) return null
  const status = m[2] === 'yes' ? 'in' : m[2] === 'no' ? 'out' : (m[2] as Bucket)
  return { name: m[1].trim(), status }
}

// Remove leading bullets/numbers and trailing vote counts before parsing.
function cleanLine(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^[\s\-*•\d.)\]]+/, '') // leading bullets / numbering
  s = s.replace(/\(\s*\d+\s*\)\s*$/, '') // trailing "(3)"
  s = s.replace(/[·•|-]\s*\d+\s*(votes?|voted)?\s*$/i, '') // trailing "· 3 votes"
  return s.trim()
}

interface Indexed extends RosterName {
  full: string
  first: string
  lastInitial: string
}

// Match a cleaned token to at most one roster player. Returns the player,
// 'ambiguous', or null (no match).
function matchOne(token: string, roster: Indexed[]): Indexed | 'ambiguous' | null {
  const norm = strip(token)
  if (!norm) return null
  const uniq = (rows: Indexed[]) => (rows.length === 1 ? rows[0] : rows.length > 1 ? 'ambiguous' : null)

  const full = roster.filter((r) => r.full === norm)
  if (full.length) return uniq(full)

  const tokens = norm.split(' ')
  const first = tokens[0]

  // "Aaron B" style: first name + last initial.
  if (tokens.length >= 2) {
    const li = tokens[1][0]
    const fli = roster.filter((r) => r.first === first && r.lastInitial === li)
    if (fli.length) return uniq(fli)
  }

  const firstExact = roster.filter((r) => r.first === first)
  if (firstExact.length) return uniq(firstExact)

  // Prefix match on first name or full name (handles "Mich" -> "Michelle").
  const prefix = roster.filter((r) => r.first.startsWith(norm) || r.full.startsWith(norm))
  if (prefix.length) return uniq(prefix)

  return null
}

export function parsePoll(text: string, roster: RosterName[]): PollParseResult {
  const indexed: Indexed[] = roster.map((r) => {
    const full = strip(r.name)
    const parts = full.split(' ')
    return { ...r, full, first: parts[0] ?? full, lastInitial: parts[1]?.[0] ?? '' }
  })

  const assignments: PollAssignment[] = []
  const unmatched: string[] = []
  const ambiguous: string[] = []
  const seen = new Set<string>() // player_id already assigned (first wins)

  let bucket: Bucket = 'in'

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine)
    if (!line) continue

    const clean = strip(line)
    const hb = headerBucket(clean)
    if (hb) {
      bucket = hb
      continue
    }

    // Inline status overrides the current bucket for this one name.
    let name = line
    let status = bucket
    const inline = inlineStatus(clean)
    if (inline) {
      name = inline.name
      status = inline.status
    }

    const match = matchOne(name, indexed)
    if (match === 'ambiguous') {
      ambiguous.push(name)
    } else if (match) {
      if (seen.has(match.player_id)) continue
      seen.add(match.player_id)
      assignments.push({ player_id: match.player_id, name: match.name, status, matchedFrom: name })
    } else {
      unmatched.push(name)
    }
  }

  return { assignments, unmatched, ambiguous }
}
