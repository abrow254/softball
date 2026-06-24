## Gender Backfill — Quick Start

The Lineup Lab page requires `players.gender` to be set for every active player. Two inference options:

### Option 1: Heuristic (fast, ~75% accurate)

```typescript
import { inferGenderHeuristic, inferGenderBatch } from '@/lib/genderInference'

// Single name
const gender = inferGenderHeuristic('Mary') // → 'F'
const gender = inferGenderHeuristic('John') // → 'M'
const gender = inferGenderHeuristic('Alex') // → null (ambiguous)

// Batch (all players without gender)
const guesses = await inferGenderBatch(players, 'heuristic')
// Returns [{ player_id, name, inferred, confident }, ...]
// confident=true → matched a common name database
// confident=false → ambiguous, needs manual review
```

### Option 2: Claude API (more robust, slower)

```typescript
import { inferGenderClaude, inferGenderBatch } from '@/lib/genderInference'

// Single name (requires ANTHROPIC_API_KEY)
const gender = await inferGenderClaude('Jamie') // → 'F' or 'M' or '?'

// Batch (rate-limited to ~1 per second)
const guesses = await inferGenderBatch(players, 'claude')
// Rate-limits to avoid API quota issues
// Returns same shape as heuristic
```

### Server Action (apply backfill)

```typescript
import { backfillGenders } from '@/app/admin/actions'

// Apply heuristic inference to all players without gender
const result = await backfillGenders('heuristic')
// { updated: 15, skipped: 3, results: [...all guesses...] }

// Or use Claude (slower, costs API tokens)
const result = await backfillGenders('claude')
```

### Recommended workflow

1. Run heuristic batch on all players:
   ```
   const guesses = await inferGenderBatch(players, 'heuristic')
   ```

2. Review the `skipped` (ambiguous) names manually:
   ```
   const uncertain = guesses.filter(g => !g.confident || !g.inferred)
   // → Ask the team or use Claude on these 3–5 edge cases
   ```

3. Apply confident guesses:
   ```
   await backfillGenders('heuristic')
   // Or manually update uncertain ones in the database
   ```

4. For remaining ambiguous names:
   - Use Claude API on those specific names
   - Or update manually via Supabase Studio / a simple form

### Example: mixed approach

```typescript
// Quick heuristic pass
const guesses = await inferGenderBatch(players, 'heuristic')
const confident = guesses.filter(g => g.confident && g.inferred)
const uncertain = guesses.filter(g => !g.confident || !g.inferred)

// Apply confident
await Promise.all(
  confident.map(g =>
    supabase.from('players').update({ gender: g.inferred }).eq('id', g.player_id)
  )
)

// Review uncertain, apply Claude only to those
for (const g of uncertain) {
  const inferred = await inferGenderClaude(g.name)
  if (inferred !== '?') {
    await supabase.from('players').update({ gender: inferred }).eq('id', g.player_id)
  }
}
// Remaining '?' → ask team manually
```

---

**Notes:**
- Heuristic is instant; Claude costs API tokens (~$0.003 per 2–3 names)
- Heuristic ~75% accurate; Claude ~95%+ for English names
- Both handle edge cases gracefully (return `null` / `'?'` for ambiguous)
- The server action only applies confident guesses; review uncertain before commit
