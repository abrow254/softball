import 'server-only'

// SERVER ONLY. Scrapes our team's games from the FCSSC league schedule page
// (static HTML, no auth). Same approach as lib/standings: plain fetch, cached
// hourly, fails soft to null. The page is a date/field/time grid for the whole
// league; we pull just the cells involving our team.

const SCHEDULE_URL = 'https://www.forestcityssc.ca/league/99619/schedule'
const OUR_TEAM = 'The Softball Team'

export interface ScheduleGame {
  date: string // ISO "2026-06-28"
  time: string | null // "3:00 PM"
  opponent: string
  isHome: boolean
  ourScore: number | null
  oppScore: number | null
  played: boolean
}

export async function getSchedule(): Promise<ScheduleGame[] | null> {
  try {
    const res = await fetch(SCHEDULE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; softball.beer schedule)' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return parseSchedule(await res.text())
  } catch {
    return null
  }
}

// ---- parsing -------------------------------------------------------------

function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// "16-30-00" -> "4:30 PM"
function formatTime(raw: string): string | null {
  const m = raw.match(/^(\d{1,2})-(\d{2})/)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${min} ${ampm}`
}

export function parseSchedule(html: string): ScheduleGame[] {
  const cells = html.match(/<td[^>]*data-teamoneid[^>]*>[\s\S]*?<\/td>/g) ?? []
  const games: ScheduleGame[] = []

  for (const td of cells) {
    const t1 = td.match(/gameCellTeamOne"[^>]*>([\s\S]*?)<\/a>/)
    const t2 = td.match(/gameCellTeamTwo"[^>]*>([\s\S]*?)<\/a>/)
    if (!t1 || !t2) continue
    const team1 = clean(t1[1])
    const team2 = clean(t2[1])
    const usIsOne = team1 === OUR_TEAM
    const usIsTwo = team2 === OUR_TEAM
    if (!usIsOne && !usIsTwo) continue

    const date = td.match(/data-gamedate="([^"]*)"/)?.[1]
    if (!date) continue
    const time = formatTime(td.match(/data-gametime="([^"]*)"/)?.[1] ?? '')

    // Two scoreDisplay spans, in team1/team2 order; empty for unplayed games.
    const scores = [...td.matchAll(/scoreDisplay">\[?(\d*)\]?<\/span>/g)].map((m) => m[1])
    const s1 = scores[0] !== undefined && scores[0] !== '' ? Number(scores[0]) : null
    const s2 = scores[1] !== undefined && scores[1] !== '' ? Number(scores[1]) : null

    const opponent = usIsOne ? team2 : team1
    const ourScore = usIsOne ? s1 : s2
    const oppScore = usIsOne ? s2 : s1

    games.push({
      date,
      time,
      opponent,
      isHome: usIsOne,
      ourScore,
      oppScore,
      played: ourScore != null && oppScore != null,
    })
  }

  games.sort((a, b) => a.date.localeCompare(b.date))
  return games
}
