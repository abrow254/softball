-- ============================================================
-- setup.sql — run ONCE in the Supabase SQL Editor for a new project.
-- Combines: 0001 schema, 0002 auth+RLS, 0003 season_stats view, seed.
-- ============================================================

-- ============================================================================
-- 0001_init.sql — core schema (six tables, §3 of the build spec, verbatim)
-- ============================================================================
-- per-game totals (game_player_stats) are the SOURCE OF TRUTH for all stats.
-- at_bats is OPTIONAL detail, populated only by the photo-intake feature.
-- Result (W/L/D) is DERIVED from our_runs vs opp_runs, never stored.

-- players ---------------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_regular boolean not null default true,   -- false = ringer/sub
  active boolean not null default true,
  created_at timestamptz default now()
);

-- seasons ---------------------------------------------------------------------
create table seasons (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  term text not null check (term in ('Summer','Fall')),
  label text not null,                         -- e.g. "2025 Summer"
  is_current boolean not null default false,
  created_at timestamptz default now()
);

-- games -----------------------------------------------------------------------
create table games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  game_date date,
  opponent text,
  our_runs int,
  opp_runs int,
  created_at timestamptz default now()
);

-- lineups (drives the printable card) -----------------------------------------
create table lineups (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id),
  batting_order int,
  starting_pos text,                           -- "RF", "SS/3B", "Sit", etc.
  unique (game_id, player_id)
);

-- game_player_stats: the per-game counting line. SOURCE OF TRUTH. -------------
create table game_player_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id),
  singles int not null default 0,
  doubles int not null default 0,
  triples int not null default 0,
  hr int not null default 0,
  ab int not null default 0,
  fc int not null default 0,
  bb int not null default 0,
  hbp int not null default 0,
  roe int not null default 0,
  rbi int not null default 0,
  runs int not null default 0,
  k int not null default 0,
  unique (game_id, player_id)
);

-- at_bats: OPTIONAL detail, populated by photo intake only. Not required. -----
create table at_bats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id),
  inning int,
  code text check (code in ('H1','H2','H3','H4','FC','FO','PO','GO','K'))
);

-- Helpful indexes for the per-season aggregation the stats grid runs.
create index on games (season_id);
create index on game_player_stats (game_id);
create index on game_player_stats (player_id);
create index on lineups (game_id);
create index on at_bats (game_id);


-- ============================================================================
-- 0002_auth_rls.sql — roles + Row Level Security
-- ============================================================================
-- Access model: any AUTHENTICATED user can READ everything; only ADMINS can
-- write. Aaron is the first admin (see the note at the bottom of this file).

-- profiles: one row per auth user, carrying the role -------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

-- New auth users automatically get a 'viewer' profile.
-- SECURITY DEFINER so the trigger can insert past RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin(): true when the current user's profile role is 'admin'.
-- SECURITY DEFINER + STABLE so it runs as the function owner (bypassing RLS on
-- profiles, which avoids any recursive policy evaluation).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- Enable RLS on everything ----------------------------------------------
alter table players            enable row level security;
alter table seasons            enable row level security;
alter table games              enable row level security;
alter table lineups            enable row level security;
alter table game_player_stats  enable row level security;
alter table at_bats            enable row level security;
alter table profiles           enable row level security;

-- ---- Read: any authenticated user ------------------------------------------
create policy "read for authenticated" on players           for select to authenticated using (true);
create policy "read for authenticated" on seasons           for select to authenticated using (true);
create policy "read for authenticated" on games             for select to authenticated using (true);
create policy "read for authenticated" on lineups           for select to authenticated using (true);
create policy "read for authenticated" on game_player_stats for select to authenticated using (true);
create policy "read for authenticated" on at_bats           for select to authenticated using (true);

-- ---- Write: admins only (insert / update / delete) -------------------------
-- One policy per table per command, gated on is_admin().
create policy "admin write" on players           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on seasons           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on games             for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on lineups           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on game_player_stats for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on at_bats           for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Note: a `for all` policy also governs SELECT, so the explicit read policies
-- above (using true) are what actually let non-admins read; PostgreSQL ORs
-- permissive policies together, so authenticated users can always read, and
-- admins additionally satisfy the write policy.

-- ---- profiles: users read their own row; admins read/manage all ------------
create policy "read own or admin" on profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin manage profiles" on profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- FIRST ADMIN — run once after Aaron has signed up (replace the email):
--
--   update public.profiles set role = 'admin'
--   where email = 'aaron.scott.brown@outlook.com';
-- ============================================================================


-- ============================================================================
-- 0003_season_stats_view.sql — the season_stats view
-- ============================================================================
-- Aggregates game_player_stats by player within a season and applies the
-- team's HOUSE FORMULAS. Two of them are deliberately non-standard (see the
-- HOUSE RULE comments). DO NOT "fix" them to textbook baseball — historical
-- numbers depend on them.
--
-- Structure is two-level on purpose:
--   * `agg`         — raw per-player-per-season sums + games played
--   * `season_games`— total games in each season (for games_missed)
--   * outer SELECT  — derives the rate stats. Postgres can't reference a
--                     SELECT alias (e.g. `hits`) elsewhere in the same SELECT
--                     list, so the hit/TB expressions are inlined, and every
--                     division is guarded exactly once with COALESCE(.. / NULLIF).
--
-- security_invoker = on  → RLS of the querying user applies through the view
-- (Postgres 15+ / Supabase). Reads are allowed for any authenticated user.

create or replace view season_stats
with (security_invoker = on)
as
with season_games as (
  select season_id, count(*)::int as total_games
  from games
  group by season_id
),
agg as (
  select
    g.season_id,
    gps.player_id,
    count(distinct gps.game_id)::int as gp,
    sum(gps.singles)::int            as singles,
    sum(gps.doubles)::int            as doubles,
    sum(gps.triples)::int            as triples,
    sum(gps.hr)::int                 as hr,
    sum(gps.ab)::int                 as ab,
    sum(gps.fc)::int                 as fc,
    sum(gps.bb)::int                 as bb,
    sum(gps.hbp)::int                as hbp,
    sum(gps.roe)::int                as roe,
    sum(gps.rbi)::int                as rbi,
    sum(gps.runs)::int               as runs,
    sum(gps.k)::int                  as k
  from game_player_stats gps
  join games g on g.id = gps.game_id
  group by g.season_id, gps.player_id
)
select
  a.season_id,
  a.player_id,
  p.name,
  p.is_regular,
  a.gp,
  greatest(sg.total_games - a.gp, 0)                                       as games_missed,
  a.singles, a.doubles, a.triples, a.hr,
  a.ab, a.fc, a.bb, a.hbp, a.roe, a.rbi, a.runs, a.k,

  -- hits = singles + doubles + triples + hr
  (a.singles + a.doubles + a.triples + a.hr)                               as hits,
  -- tb = singles + 2*doubles + 3*triples + 4*hr
  (a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)                   as tb,
  -- pa = runs + hits + bb + hbp + roe   -- HOUSE RULE (preserved from sheet)
  (a.runs + (a.singles + a.doubles + a.triples + a.hr) + a.bb + a.hbp + a.roe) as pa,

  -- avg = hits / ab
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric
           / nullif(a.ab, 0), 0)                                          as avg,
  -- obp = (hits + fc) / ab   -- HOUSE RULE (counts FC, divides by AB not PA)
  coalesce(((a.singles + a.doubles + a.triples + a.hr) + a.fc)::numeric
           / nullif(a.ab, 0), 0)                                          as obp,
  -- slg = tb / ab
  coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric
           / nullif(a.ab, 0), 0)                                          as slg,
  -- ops = avg + slg   -- HOUSE RULE (AVG + SLG, not OBP + SLG)
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0)
    + coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0)
                                                                          as ops,
  -- iso = slg - avg
  coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0)
    - coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0)
                                                                          as iso,
  -- xbh_pct = (doubles + triples + hr) / hits
  coalesce((a.doubles + a.triples + a.hr)::numeric
           / nullif((a.singles + a.doubles + a.triples + a.hr), 0), 0)    as xbh_pct
from agg a
join players p       on p.id = a.player_id
join season_games sg on sg.season_id = a.season_id;


-- ============================================================================
-- seed.sql — minimal data so the stats grid renders verifiable numbers
-- ============================================================================
-- Fixed UUIDs so the QA worked-example test can reference rows directly.
-- Aaron Brown's line is the §4 worked example: 2×1B, 1×2B, 1×HR, AB 5.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

-- players ---------------------------------------------------------------------
insert into players (id, name, is_regular, active) values
  ('a0000000-0000-0000-0000-000000000001', 'Aaron Brown', true,  true),
  ('a0000000-0000-0000-0000-000000000002', 'Mike Carter', true,  true),
  ('a0000000-0000-0000-0000-000000000003', 'Dave Singh',  true,  true),
  ('a0000000-0000-0000-0000-000000000004', 'Chris Day',   true,  true),
  ('b0000000-0000-0000-0000-000000000001', 'Sam Ringer',  false, true)
on conflict (id) do nothing;

-- season ----------------------------------------------------------------------
insert into seasons (id, year, term, label, is_current) values
  ('c0000000-0000-0000-0000-000000000001', 2025, 'Summer', '2025 Summer', true)
on conflict (id) do nothing;

-- game ------------------------------------------------------------------------
insert into games (id, season_id, game_date, opponent, our_runs, opp_runs) values
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   '2025-06-05', 'Sharks', 14, 9)
on conflict (id) do nothing;

-- lineup (drives the printable card for this game) ----------------------------
insert into lineups (game_id, player_id, batting_order, starting_pos) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'SS'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, 'CF'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 3, '3B'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 4, 'C'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 5, 'RF')
on conflict (game_id, player_id) do nothing;

-- per-game counting lines (SOURCE OF TRUTH) ----------------------------------
-- Aaron = §4 worked example: singles 2, doubles 1, hr 1, ab 5, rest 0.
insert into game_player_stats
  (game_id, player_id, singles, doubles, triples, hr, ab, fc, bb, hbp, roe, rbi, runs, k) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2, 1, 0, 1, 5, 0, 0, 0, 0, 3, 2, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 3, 0, 0, 0, 4, 0, 0, 0, 0, 1, 1, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, 1, 1, 0, 5, 0, 0, 0, 0, 2, 1, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 2),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 0, 0, 1, 3, 0, 0, 0, 0, 2, 2, 0)
on conflict (game_id, player_id) do nothing;
