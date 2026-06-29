-- ============================================================================
-- 0013_batting_order_stats.sql — per-player performance by batting-order spot
-- ============================================================================
-- Joins each game's counting line to the lineup spot the player batted in that
-- game, so we can see how a hitter performs in the leadoff/2-hole/cleanup/etc.
-- Real games only (is_aggregate = false) and only where a batting_order was
-- saved. House formulas mirror season_stats exactly.

create view batting_order_stats
with (security_invoker = on)
as
with agg as (
  select
    g.season_id,
    gps.player_id,
    l.batting_order,
    count(*)::int                    as gp_count,
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
  join lineups l on l.game_id = gps.game_id and l.player_id = gps.player_id
  join games g   on g.id = gps.game_id
  where g.is_aggregate = false and l.batting_order is not null
  group by g.season_id, gps.player_id, l.batting_order
)
select
  a.season_id,
  a.player_id,
  p.name,
  a.batting_order,
  a.gp_count,
  a.singles, a.doubles, a.triples, a.hr,
  a.ab, a.fc, a.bb, a.hbp, a.roe, a.rbi, a.runs, a.k,
  (a.singles + a.doubles + a.triples + a.hr)                               as hits,
  (a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)                   as tb,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0) as avg,
  coalesce(((a.singles + a.doubles + a.triples + a.hr) + a.fc)::numeric / nullif(a.ab, 0), 0) as obp,
  coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0) as slg,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab, 0), 0)
    + coalesce((a.singles + 2 * a.doubles + 3 * a.triples + 4 * a.hr)::numeric / nullif(a.ab, 0), 0) as ops
from agg a
join players p on p.id = a.player_id;

grant select on batting_order_stats to anon, authenticated;
