// Gender inference helpers for backfilling players.gender column.
// Two approaches: simple heuristic (fast, ~75% accurate) and Claude API (robust, slower).

// ---- Option 1: Simple heuristic (common name patterns) ----

const FEMALE_NAMES = new Set([
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan', 'jessica',
  'sarah', 'karen', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly',
  'emily', 'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie',
  'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley',
  'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine',
  'christine', 'debra', 'rachel', 'catherine', 'carolyn', 'janet', 'ruth', 'maria',
  'heather', 'diane', 'virginia', 'julie', 'joyce', 'victoria', 'kelly', 'christina',
  'lauren', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea', 'hannah',
  'jacqueline', 'martha', 'madison', 'teresa', 'gloria', 'sara', 'gail', 'sophia',
  'alice', 'phyllis', 'lois', 'kim', 'betty', 'margaret', 'margaret', 'marie',
  'kayla', 'alexis', 'lori',
])

const MALE_NAMES = new Set([
  'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas',
  'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven',
  'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward',
  'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas',
  'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin',
  'samuel', 'frank', 'gregory', 'raymond', 'patrick', 'jack', 'dennis', 'jerry',
  'tyler', 'aaron', 'jose', 'adam', 'henry', 'douglas', 'zachary', 'peter',
  'kyle', 'walter', 'harold', 'keith', 'christian', 'terry', 'sean', 'austin',
  'gerald', 'carl', 'roger', 'arthur', 'ryan', 'billy', 'bruce', 'louis',
  'joe', 'john', 'phillip', 'johnny', 'ernest', 'martin', 'randy', 'howard',
])

export function inferGenderHeuristic(name: string): 'M' | 'F' | null {
  if (!name) return null
  const lower = name.toLowerCase().trim().split(/\s+/)[0] // first word only
  if (FEMALE_NAMES.has(lower)) return 'F'
  if (MALE_NAMES.has(lower)) return 'M'
  return null
}

// ---- Option 2: Claude API classifier ----

// Requires ANTHROPIC_API_KEY in environment (server-side only).
// More accurate; returns M, F, or ? (ambiguous).

export async function inferGenderClaude(name: string): Promise<'M' | 'F' | '?'> {
  if (!name) return '?'

  const anthropic = await import('@anthropic-ai/sdk').then((m) => m.default)
  const client = new anthropic.default()

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Infer the likely gender of a person with this name (from a softball roster): "${name}". Reply with ONLY one character: M (male), F (female), or ? (ambiguous/unknown). No explanation.`,
        },
      ],
    })

    const text = (response.content[0] as { type: 'text'; text: string }).text.trim()
    if (text === 'M' || text === 'F' || text === '?') return text
    return '?'
  } catch (err) {
    console.error(`Claude inference failed for "${name}":`, err)
    return '?'
  }
}

// ---- Batch backfill helper ----

// Usage:
//   const guesses = await inferGenderBatch(players, 'claude')
//   Review { name, inferred, confident } array
//   Apply via Supabase update with manual review of low-confidence ones

export interface GenderGuess {
  player_id: string
  name: string
  inferred: 'M' | 'F' | null | '?'
  confident: boolean
}

export async function inferGenderBatch(
  players: Array<{ id: string; name: string }>,
  method: 'heuristic' | 'claude' = 'heuristic',
): Promise<GenderGuess[]> {
  const results: GenderGuess[] = []

  if (method === 'heuristic') {
    for (const p of players) {
      const inferred = inferGenderHeuristic(p.name)
      results.push({
        player_id: p.id,
        name: p.name,
        inferred,
        confident: inferred !== null, // true if we matched a common name
      })
    }
  } else {
    // Claude API: rate-limit to ~1 per second to avoid quota issues
    for (const p of players) {
      const inferred = await inferGenderClaude(p.name)
      results.push({
        player_id: p.id,
        name: p.name,
        inferred: inferred === '?' ? null : inferred,
        confident: inferred !== '?',
      })
      // Naive rate limit
      await new Promise((resolve) => setTimeout(resolve, 1100))
    }
  }

  return results
}
