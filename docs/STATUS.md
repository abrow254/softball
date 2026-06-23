# The Softball Team — Stats App: Status & Handoff

_Last updated: 2026-06-23_

## What it is
A Next.js + Supabase web app that replaces the team's Google Sheets workbook
for a rec slo-pitch team. Public can **view** stats; **admins** enter games.

- **Live domain:** softball.beer (DNS via Namecheap → Vercel; apex A record `76.76.21.21`)
- **Vercel URL:** softball-grld-git-main-glue-guy-s-projects.vercel.app
- **Repo:** github.com/abrow254/softball (local: `~/softball-stats`)
- **Branding:** Cardinals red `#C41E3A` + yellow `#FEDB00` on white; Oswald display font;
  red nav bar with yellow "bat stripe"; cockatiel/cardinal mascot favicon.

## Stack
- Next.js 14 App Router (TS, React 18, Tailwind 3.4)
- Supabase (Postgres + Auth). RLS is the real gate: anon can SELECT; admins (profiles.role='admin') write.
- Anthropic API (server-only) for reading handwritten scorecard photos → structured stats.
- No service-role key in app code.

## House formulas (DELIBERATELY non-standard — never "fix")
- hits = 1B+2B+3B+HR; tb = 1B+2·2B+3·3B+4·HR
- avg = hits/ab; slg = tb/ab
- **obp = (hits + fc) / ab**  ← HOUSE RULE (FC counts, divides by AB not PA)
- **ops = avg + slg**         ← HOUSE RULE (not obp+slg)
- iso = slg − avg; xbh% = (2B+3B+HR)/hits
- pa = runs+hits+bb+hbp+roe (house; unreliable on imported seasons — runs/walks weren't recorded)

## Data model
6 tables: players, seasons, games, lineups, game_player_stats (source of truth), at_bats (optional, photo only).
- `game_player_stats.gp` defaults 1 → season view SUMS gp, so GP auto-accumulates for app-entered games.
- Views (security_invoker=on, anon+authenticated SELECT):
  - **season_stats** — per player per season; Regular/Ringer = AB ≥ 40% of that season's AB leader.
  - **career_stats** — all-time per player; **tier** by career AB vs all-time leader:
    core ≥40%, regular 15–40%, ringer <15%.

## Imported history
6 seasons (2023 Summer → 2026 Summer), 31 players, parsed from the Excel workbook via
`scripts/parse_history.py` → `scripts/gen_import_sql.py` → `supabase/import_history.sql`.
Each historical season = one synthetic "Imported season totals" game holding per-player totals.
GP is 0 for 2025/2026 (the sheet didn't track per-player games those years).

## Surfaces built
- **/stats** — season grid (public), season selector, Regulars/Ringers, name→career links,
  gold = season category leader (rate stats need 10+ AB), sortable.
- **/players** — all-time leaderboard, 3 tiers (Core/Regulars/Ringers), gold leaders (30+ AB qual).
- **/players/[id]** — career page: stat tiles + season-by-season.
- **/games**, **/games/new**, **/games/[id]/edit** — admin: game entry + photo intake (PhotoUpload → /api/extract).
- **/games/[id]/card** — printable lineup card.
- Columns shown: GM, AB, R, H, 1B, 2B, 3B, HR, TB, AVG, OBP, SLG, ISO, XBH%.
  (Removed per team pref: GP, PA, K, RBI, BB, OPS. Default sort = AVG.)

## ⚠️ Confirm these SQL migrations ran on the live DB (Supabase SQL Editor)
- 0006_ab_based_regular.sql (AB-based regular/ringer in season_stats + career_stats)
- 0007_career_tiers.sql (adds `tier` to career_stats) ← needed for the 3-tier All-Time board

## Known gotchas / decisions
- **2026 double-count risk:** 2026 currently holds the imported "season totals" game. If you start
  entering 2026 games individually, DELETE that imported game first or stats double.
- Tier cutoffs (40%/15%) and leader qualifiers (10/15/30 AB) are easy one-number tweaks.
- ANTHROPIC_API_KEY must be set in Vercel for photo intake to work.

## Likely next builds (from prior discussion)
- Team record & standings (W/L per season, finishes) — workbook had this; not built yet.
- Per-game entry polish + true GP going forward (architecture already supports it).
- Captain's game sheet pending → enter recent 2026 games.
