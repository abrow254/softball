// Registry of team photos. Single source of truth for both the dashboard hero
// (rotates through all of them) and the per-season banner on the stats page
// (matched by year + term).
//
// To add photos: commit the image files to /public/team (e.g. team-1.jpg),
// then add an entry below with the season it was taken in. Entries with files
// that don't exist will 404, so only list photos once their file is committed.

export type Term = 'Summer' | 'Fall'

export interface TeamPhoto {
  src: string
  year: number
  term: Term
  caption?: string
}

// Listed oldest-first so the hero rotates as a timeline. Commit image files to
// /public/team using lowercase-hyphen names; any whose file is missing is
// skipped gracefully (hero + banner fall back).
export const TEAM_PHOTOS: TeamPhoto[] = [
  { src: '/team/summer-2022.jpg', year: 2022, term: 'Summer', caption: 'Summer 2022' },
  { src: '/team/summer-2023.jpg', year: 2023, term: 'Summer', caption: 'Summer 2023' },
  { src: '/team/fall-2023.jpg', year: 2023, term: 'Fall', caption: 'Fall 2023' },
  { src: '/team/summer-2024.jpg', year: 2024, term: 'Summer', caption: 'Summer 2024' },
  { src: '/team/fall-2024.jpg', year: 2024, term: 'Fall', caption: 'Fall 2024' },
  { src: '/team/summer-2025.jpg', year: 2025, term: 'Summer', caption: 'Summer 2025' },
]

// Photo for a given season, if one exists.
export function photoForSeason(year: number, term: string): TeamPhoto | undefined {
  return TEAM_PHOTOS.find((p) => p.year === year && p.term === term)
}

// All photo sources, for the rotating hero.
export function allPhotoSrcs(): string[] {
  return TEAM_PHOTOS.map((p) => p.src)
}
