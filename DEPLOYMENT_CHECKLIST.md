# Lineup Lab Deployment Checklist

**Status**: Code complete, all 41 tests pass ✓, committed to `claude/lineup-lab-optimizer-g73lho`

---

## Phase 1: Code Deployment

- [x] All code committed (3 commits, 1,300+ lines)
- [x] Tests passing (13 new optimizer tests + 28 pre-existing)
- [x] NavMenu updated with `/lineup-lab` link
- [ ] Create PR from `claude/lineup-lab-optimizer-g73lho` → `main`
- [ ] Code review (if required)
- [ ] Merge to main
- [ ] Deploy Next.js app to hosting (Vercel / other)

---

## Phase 2: Database Schema Migration

**File**: `supabase/migrations/0008_lineup_lab.sql`

Run this migration on your live Supabase database:

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Manual via Supabase Studio
# 1. Go to https://app.supabase.com → your project
# 2. SQL Editor → New Query
# 3. Copy contents of supabase/migrations/0008_lineup_lab.sql
# 4. Run
```

**What it does:**
```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('M','F'));
CREATE OR REPLACE VIEW player_game_log AS ...;
```

**Risk**: Very low (adds nullable column, view is read-only)

---

## Phase 3: Backfill Gender Column

**Required before Lineup Lab is usable.**

### Quick approach (< 5 min)

```typescript
// 1. Connect to your live app (or run locally against live DB)
// 2. Run the heuristic backfill
import { backfillGenders } from '@/app/admin/actions'

const result = await backfillGenders('heuristic')
console.log(`Updated: ${result.updated}, Skipped: ${result.skipped}`)
// Expected: ~70–80% of players get a gender
```

### Review uncertain cases

```typescript
const uncertain = result.results.filter(r => !r.confident || !r.inferred)
// Manually update these in Supabase Studio or ask the team
```

### Remaining edge cases (optional: use Claude)

```typescript
// For the 3–5 truly ambiguous names
const result = await backfillGenders('claude')
// Costs ~$0.01 in API tokens, more accurate
```

---

## Phase 4: Smoke Test

Once deployed and gender backfill complete:

1. **Sign in as admin**
   - Navigate to `/lineup-lab`
   - Should see season selector + player list

2. **Test with current season**
   - If season has < 1 game: "No season stats yet" message ✓
   - If season has games: roster loads with stats + form sparklines ✓

3. **Test optimizer**
   - Click "Auto-optimize"
   - Should see updated order + cockatiel flash ✓
   - Score should match the mathematical calculation

4. **Test MMF constraint**
   - Manually arrange 3 men in a row (slots 1, 2, 3)
   - Left rail should turn RED on those 3 slots ✓
   - Legality chip should show "✕ Illegal MMF" ✓

5. **Test infeasibility guard**
   - Manually add a season with 6M / 2F
   - Reload page (or if testing locally, adjust roster)
   - "No legal order" message should appear ✓
   - Auto-optimize button should be disabled ✓

6. **Test bench interactions (mobile)**
   - Tap a bench player → gold ring highlight + banner ✓
   - Tap a lineup slot → swap them in ✓
   - Tap the same bench player again → deselect ✓

---

## Phase 5: Final Checklist

- [ ] Schema migration applied to live Supabase
- [ ] Gender backfill complete (all players have M/F/null)
- [ ] `/lineup-lab` page loads and is admin-only
- [ ] Season selector works
- [ ] Auto-optimize produces legal orders
- [ ] MMF violations flagged correctly
- [ ] Infeasibility guard works (6M/2F case)
- [ ] Mobile tap-to-swap UX works
- [ ] "The Read" insights display correctly
- [ ] Sparklines render (6 recent games visible)
- [ ] Hot/cold badges match last-3 OPS vs season OPS

---

## Rollback Plan (if issues arise)

1. **Schema**: Cannot easily roll back. Column is nullable; view can be dropped.
   ```sql
   DROP VIEW IF EXISTS player_game_log CASCADE;
   ALTER TABLE players DROP COLUMN IF EXISTS gender;
   ```

2. **Code**: Revert PR, redeploy previous version.

3. **Gender data**: If backfill is wrong, manually fix in Supabase Studio or re-run with `'claude'` method.

---

## Support

- **Questions about optimizer**: See `LINEUP_LAB_SUMMARY.txt` (Section 3–4)
- **Gender backfill help**: See `GENDER_BACKFILL.md`
- **Test cases**: See `__tests__/optimizer.test.ts`

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Code | ✓ Ready | Pushed to `claude/lineup-lab-optimizer-g73lho` |
| Tests | ✓ All pass | 41/41 (13 new + 28 pre-existing) |
| Schema | ⏳ Pending | Run migration on live Supabase |
| Backfill | ⏳ Pending | Use `backfillGenders()` after schema applied |
| Deployment | ⏳ Pending | Merge PR, deploy app, complete smoke tests |
