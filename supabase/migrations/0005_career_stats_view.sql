-- ============================================================================
-- 0005_career_stats_view.sql — all-time career totals per player
-- ============================================================================
-- Same house formulas as season_stats, but aggregated across EVERY season.
-- Adds seasons_played (distinct seasons a player appears in). No games_missed
-- (meaningless all-time). security_invoker = on so RLS flows through.

create or replace view career_stats
with (security_invoker = on)
as
with agg as (
  select
    gps.player_id,
    sum(gps.gp)::int                 as gp,
    count(distinct g.season_id)::int as seasons_played,
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
  join games g on g.id = gps.game_id
  group by gps.player_id
)
select
  a.player_id,
  p.name,
  p.is_regular,
  a.gp,
  a.seasons_played,
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
join players p on p.id = a.player_id;

grant select on career_stats to anon, authenticated;
