-- ============================================================================
-- 0011_season_regular_ab.sql — restore AB-based "regular" in season_stats
-- ============================================================================
-- 0009 recreated season_stats reading the static players.is_regular flag, which
-- mislabels players whose roster flag is stale (e.g. a 57-AB regular shown as a
-- ringer). Restore the relative rule used everywhere else: a player is a REGULAR
-- in a season if their AB is at least 40% of that season's highest individual AB
-- (this matches career_stats' definition in 0007). No new data needed.

create or replace view season_stats
with (security_invoker = on)
as
with agg as (
  select
    g.season_id,
    gps.player_id,
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
),
season_agg as (
  select season_id, max(ab) as max_ab from agg group by season_id
)
select
  a.season_id,
  a.player_id,
  p.name,
  -- is_regular: AB >= 40% of the season's highest individual AB (relative, so
  -- it self-scales for short / in-progress seasons). Matches career_stats.
  (a.ab >= 0.4 * sa.max_ab)                                                as is_regular,
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
join players p     on p.id = a.player_id
join season_agg sa on sa.season_id = a.season_id;

grant select on season_stats to anon, authenticated;
