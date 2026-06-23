import 'server-only'

// SERVER ONLY. Scrapes the league standings from Forest City Sport & Social
// Club's public standings page. The page renders the full table as static HTML
// (no auth, no JS), so a plain fetch + parse is enough. Cached for an hour via
// the fetch cache — no DB, no background job. Fails soft: any fetch/parse
// problem returns null and the page shows an "unavailable" state.

const STANDINGS_URL = 'https://www.forestcityssc.ca/league/99619/standings'
export const STANDINGS_SOURCE = 'Forest City Sport & Social Club'
export const STANDINGS_SOURCE_URL = STANDINGS_URL
const OUR_TEAM = 'The Softball Team'

export interface StandingRow {
  rank: number | null
  team: string
  teamId: string | null
  w: number
  l: number
  d: number
  pf: number // points (runs) scored
  pa: number // points (runs) allowed
  diff: number
  rankPts: number
  forfeitsFor: number
  forfeitsAgainst: number
  isUs: boolean
}

export interface StandingsPool {
  name: string // e.g. "Pool B"
  rows: StandingRow[]
}

export interface Standings {
  season: string // e.g. "Summer 2026 Softball Rec - Sunday"
  pools: StandingsPool[]
  ourPool: string | null
}

export async function getStandings(): Promise<Standings | null> {
  try {
    const res = await fetch(STANDINGS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; softball.beer standings)' },
      next: { revalidate: 3600 }, // 1 hour
    })
    if (!res.ok) return null
    return parseStandings(await res.text())
  } catch {
    return null
  }
}

// ---- parsing -------------------------------------------------------------

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ordm;|&deg;/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, ' '))
}

function firstInt(s: string): number {
  const m = s.replace(/&nbsp;/g, ' ').match(/-?\d+/)
  return m ? Number(m[0]) : 0
}

function forfeits(s: string): number {
  const m = s.match(/\((\d+)\)/)
  return m ? Number(m[1]) : 0
}

export function parseStandings(html: string): Standings | null {
  const season =
    stripTags(html.match(/<h\d[^>]*>([^<]*Softball Rec[^<]*-[^<]*)<\/h\d>/i)?.[1] ?? '') || 'League Standings'

  const tableStarts: number[] = []
  const re = /<table class="divisionStandings"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) tableStarts.push(m.index)
  if (tableStarts.length === 0) return null

  const pools: StandingsPool[] = []
  let ourPool: string | null = null

  for (const start of tableStarts) {
    // Pool name from the nearest "Pool X" heading just above the table.
    const before = html.slice(Math.max(0, start - 500), start)
    const poolName = before.match(/Pool\s+([A-Z])/)?.[0] ?? 'Standings'

    const body = html.slice(start, html.indexOf('</table>', start))
    const rowMatches = body.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []
    const rows: StandingRow[] = []

    for (const row of rowMatches) {
      if (!row.includes('teamName')) continue
      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map((c) =>
        c.replace(/^<td[^>]*>/, '').replace(/<\/td>$/, ''),
      )
      if (cells.length < 9) continue

      const team = stripTags(cells[1])
      if (!team) continue
      const teamId = row.match(/\/team\/(\d+)\//)?.[1] ?? null
      const isUs = team.toLowerCase() === OUR_TEAM.toLowerCase()
      if (isUs) ourPool = poolName

      rows.push({
        rank: firstInt(stripTags(cells[0])) || null,
        team,
        teamId,
        w: firstInt(cells[2]),
        l: firstInt(cells[3]),
        d: firstInt(cells[4]),
        pa: firstInt(cells[5]),
        diff: firstInt(cells[6]),
        pf: firstInt(cells[7]),
        rankPts: firstInt(cells[8]),
        forfeitsFor: forfeits(cells[2]),
        forfeitsAgainst: forfeits(cells[3]),
        isUs,
      })
    }

    if (rows.length > 0) pools.push({ name: poolName, rows })
  }

  if (pools.length === 0) return null
  return { season, pools, ourPool }
}
