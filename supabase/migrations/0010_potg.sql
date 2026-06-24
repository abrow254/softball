-- ============================================================================
-- 0010_potg.sql — Player of the Game columns + aggregate flag + view refresh
-- ============================================================================

-- Flag bulk-imported season-total games so per-game features can exclude them.
alter table games add column if not exists is_aggregate boolean not null default false;

-- Mark every game whose stat rows carry gp > 1 (set during the historical
-- import in 0004) as an aggregate. Real per-game rows always land with gp = 1.
update games
set is_aggregate = true
where id in (
  select distinct game_id from game_player_stats where gp > 1
);

-- Player-of-the-Game columns on games.
-- Co-winner strategy: primary winner stored in potg_player_id; ties resolved
-- at display time by re-scoring from game_player_stats if needed.
alter table games add column if not exists potg_player_id uuid references players(id);
alter table games add column if not exists potg_score   numeric;

-- Recreate player_game_log to:
--   1. Exclude aggregate games (is_aggregate = true).
--   2. Expose the full per-game counting line needed for box scores / game logs.
--   3. Add opponent + is_potg for display convenience.
-- Column ORDER preserved for backward compat; new cols appended at the end.
create or replace view player_game_log
with (security_invoker = on)
as
select
  gps.player_id,
  g.id                                                                            as game_id,
  g.game_date,
  g.season_id,
  (gps.singles + gps.doubles + gps.triples + gps.hr)                             as hits,
  gps.ab,
  case when gps.ab = 0 then 0
       else round(
         (gps.singles + gps.doubles + gps.triples + gps.hr)::numeric / gps.ab, 3)
  end                                                                             as avg,
  case when gps.ab = 0 then 0
       else round(
         (gps.singles + 2*gps.doubles + 3*gps.triples + 4*gps.hr)::numeric / gps.ab, 3)
  end                                                                             as slg,
  case when gps.ab = 0 then 0
       else round(
           (gps.singles + gps.doubles + gps.triples + gps.hr)::numeric / gps.ab
         + (gps.singles + 2*gps.doubles + 3*gps.triples + 4*gps.hr)::numeric / gps.ab, 3)
  end                                                                             as ops,
  -- Additional columns appended below (backward-compat order preserved above).
  gps.singles,
  gps.doubles,
  gps.triples,
  gps.hr,
  (gps.singles + 2*gps.doubles + 3*gps.triples + 4*gps.hr)                      as tb,
  gps.fc,
  gps.bb,
  gps.hbp,
  gps.roe,
  gps.rbi,
  gps.runs,
  gps.k,
  g.opponent,
  (g.potg_player_id = gps.player_id)                                             as is_potg
from game_player_stats gps
join games g on g.id = gps.game_id
where g.is_aggregate = false;

grant select on player_game_log to anon, authenticated;
