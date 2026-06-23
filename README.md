# The Softball Team — Stats

A shared web app that replaces the team's "The Softball Team - Stats" Google Sheet.
The team logs in, anyone can read season stats, and admins enter games — by hand or
by photographing the paper scorecard and letting the app read it. Built for the
Forest City SSC Thursday slo-pitch league.

**The loop it closes:** print a blank card → score the game by hand → photograph it →
upload → review the auto-filled totals → commit.

---

## Stack

- **Next.js** (App Router, TypeScript, React) — matches the Glue Guy stack
- **Supabase** (Postgres + Supabase Auth) for data and auth
- **Anthropic API** (vision) for reading scorecard photos — server-side only
- **Tailwind CSS**, **Vitest**
- Deploys to **Vercel**

The data layer is isolated behind `lib/db/*` so the storage backend can be swapped
without touching the UI or server actions.

---

## One-time setup

### 1. Create a Supabase project
At [supabase.com](https://supabase.com), create a project. From **Project Settings → API**,
copy the **Project URL** and the **anon public** key.

### 2. Environment variables
Copy the example and fill it in:

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Photo intake (server only — never prefix with NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8   # optional override
```

There is **no service-role key** in app code. The anon key is safe in the browser —
Row Level Security is the real gate.

### 3. Run the migrations + seed
In the Supabase **SQL Editor**, run these files in order (or `psql -f` them against
your database URL):

1. `supabase/migrations/0001_init.sql` — the six tables
2. `supabase/migrations/0002_auth_rls.sql` — profiles, roles, RLS policies
3. `supabase/migrations/0003_season_stats_view.sql` — the `season_stats` view
4. `supabase/seed.sql` — sample players, a season, and one game (the §4 worked example)

### 4. Make yourself an admin
Sign up once in the app (see below), then in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where email = 'you@example.com';
```

Viewers can read everything; admins can write.

### 5. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, promote yourself to admin (step 4),
and you're in.

---

## Verifying the math

```bash
npm test
```

`__tests__/formulas.test.ts` checks the §4 worked example (2×1B, 1×2B, 1×HR, 5 AB →
AVG .800, SLG 1.600, OPS 2.400, ISO .800, OBP .800, XBH% 50%) against the TypeScript
formula module. `supabase/tests/season_stats_worked_example.sql` asserts the **SQL view**
returns the same numbers after the seed runs — proving the view and the app agree.

> **House formulas are intentionally non-standard.** OBP counts FC and divides by AB
> (not PA); OPS is AVG + SLG (not OBP + SLG). These are preserved verbatim from the
> original sheet — do **not** "fix" them. See `lib/formulas.ts` and
> `supabase/migrations/0003_season_stats_view.sql`.

---

## The three surfaces (v1)

1. **Season stats grid** (`/stats`) — live from `season_stats`, regulars and ringers in
   separate sections, sortable columns, season selector.
2. **Entry + review grid** (`/games/new`, `/games/[id]/edit`) — admin-only. Game header,
   per-player counting line, lineup (batting order + position). Also the target the photo
   intake pre-fills.
3. **Printable card** (`/games/[id]/card`) — one-page print layout with blank inning
   columns 1–7, so the printout doubles as the paper scoring sheet.

## Photo intake

`POST /api/extract` (admin-gated, Node runtime) sends the uploaded image to the Anthropic
vision API (`claude-opus-4-8` by default) and forces a structured JSON transcription via
tool use. The result is aggregated to per-game totals client-side (`lib/codes.ts`), names
are matched to the roster (`lib/name-match.ts`), and the review grid is pre-filled.
**Nothing is written until the admin presses Save** — Commit is the only path to the DB.

The `ANTHROPIC_API_KEY` lives in `lib/extraction.ts`, which is marked `server-only`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | Run the formula + aggregation unit tests |
| `npm run lint` | Lint |

## Out of scope for v1 (these are v2)

All-Time Stats, Career Lookup, All-Time Record, League Standings, Leaderboards, charts.
The schema already supports them — v2 adds views and pages, not tables.
