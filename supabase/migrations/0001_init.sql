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
