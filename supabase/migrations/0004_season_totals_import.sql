-- ============================================================================
-- 0004_season_totals_import.sql — support imported season-aggregate history
-- ============================================================================
-- The team's history (pre-app seasons) exists only as SEASON TOTALS per player,
-- not per-game. To store that without a separate code path, each historical
-- season is imported as ONE synthetic "season totals" game holding one row per
-- player. Two columns make the aggregation honest:
--
--   gp          games played that season. Live per-game entry leaves this at
--               the default 1 (one row = one game), so sum(gp) = games played
--               in BOTH modes. Imported rows carry the real season GP.
--   is_regular  per-SEASON Regular/Ringer status (a player can be a regular one
--               season and a ringer another, e.g. Ivana). Nullable; the view
--               falls back to players.is_regular when not set.

alter table game_player_stats
  add column if not exists gp int not null default 1,
  add column if not exists is_regular boolean;

-- Recreate the view: gp is now SUMMED (not a distinct-game count), and
-- games_missed is measured against the most-available player that season
-- (the peak GP), which is how the source spreadsheet implied it.
create or replace view season_stats
with (security_invoker = on)
as
with agg as (
  select
    g.season_id,
    gps.player_id,
    sum(gps.gp)::int                                  as gp,
    coalesce(bool_or(gps.is_regular), p.is_regular)   as is_regular,
    sum(gps.singles)::int as singles,
    sum(gps.doubles)::int as doubles,
    sum(gps.triples)::int as triples,
    sum(gps.hr)::int      as hr,
    sum(gps.ab)::int      as ab,
    sum(gps.fc)::int      as fc,
    sum(gps.bb)::int      as bb,
    sum(gps.hbp)::int     as hbp,
    sum(gps.roe)::int     as roe,
    sum(gps.rbi)::int     as rbi,
    sum(gps.runs)::int    as runs,
    sum(gps.k)::int       as k
  from game_player_stats gps
  join games g   on g.id = gps.game_id
  join players p on p.id = gps.player_id
  group by g.season_id, gps.player_id, p.is_regular
),
season_peak as (
  select season_id, max(gp) as peak from agg group by season_id
)
select
  a.season_id,
  a.player_id,
  p.name,
  a.is_regular,
  a.gp,
  greatest(sp.peak - a.gp, 0)                                              as games_missed,
  a.singles, a.doubles, a.triples, a.hr,
  a.ab, a.fc, a.bb, a.hbp, a.roe, a.rbi, a.runs, a.k,

  (a.singles + a.doubles + a.triples + a.hr)                               as hits,
  (a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)                   as tb,
  (a.runs + (a.singles + a.doubles + a.triples + a.hr) + a.bb + a.hbp + a.roe) as pa,

  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric
           / nullif(a.ab, 0), 0)                                          as avg,
  -- HOUSE RULE: obp counts FC and divides by AB (not PA)
  coalesce(((a.singles + a.doubles + a.triples + a.hr) + a.fc)::numeric
           / nullif(a.ab, 0), 0)                                          as obp,
  coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric
           / nullif(a.ab, 0), 0)                                          as slg,
  -- HOUSE RULE: ops = avg + slg (not obp + slg)
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0)
    + coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0)
                                                                          as ops,
  coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0)
    - coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0)
                                                                          as iso,
  coalesce((a.doubles + a.triples + a.hr)::numeric
           / nullif((a.singles + a.doubles + a.triples + a.hr), 0), 0)    as xbh_pct
from agg a
join players p     on p.id = a.player_id
join season_peak sp on sp.season_id = a.season_id;
