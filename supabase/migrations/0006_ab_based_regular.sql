-- ============================================================================
-- 0006_ab_based_regular.sql — derive Regular/Ringer from at-bats
-- ============================================================================
-- Regular vs ringer is no longer a stored flag. A player is a REGULAR in a
-- season if their AB is at least 40% of that season's highest individual AB
-- (relative, so it works for short / in-progress seasons too). Career uses the
-- same rule against the all-time AB leader. The stored is_regular columns are
-- left in place but no longer drive the split.

-- ---- season_stats -----------------------------------------------------------
create or replace view season_stats
with (security_invoker = on)
as
with agg as (
  select
    g.season_id,
    gps.player_id,
    sum(gps.gp)::int as gp,
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
  group by g.season_id, gps.player_id
),
season_agg as (
  select season_id, max(gp) as peak_gp, max(ab) as max_ab from agg group by season_id
)
select
  a.season_id,
  a.player_id,
  p.name,
  (a.ab >= 0.4 * sa.max_ab) as is_regular,
  a.gp,
  greatest(sa.peak_gp - a.gp, 0) as games_missed,
  a.singles, a.doubles, a.triples, a.hr,
  a.ab, a.fc, a.bb, a.hbp, a.roe, a.rbi, a.runs, a.k,
  (a.singles + a.doubles + a.triples + a.hr) as hits,
  (a.singles + 2*a.doubles + 3*a.triples + 4*a.hr) as tb,
  (a.runs + (a.singles + a.doubles + a.triples + a.hr) + a.bb + a.hbp + a.roe) as pa,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0) as avg,
  coalesce(((a.singles + a.doubles + a.triples + a.hr) + a.fc)::numeric / nullif(a.ab,0), 0) as obp,
  coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0) as slg,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0)
    + coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0) as ops,
  coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0)
    - coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0) as iso,
  coalesce((a.doubles + a.triples + a.hr)::numeric / nullif((a.singles + a.doubles + a.triples + a.hr),0), 0) as xbh_pct
from agg a
join players p     on p.id = a.player_id
join season_agg sa on sa.season_id = a.season_id;

-- ---- career_stats -----------------------------------------------------------
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
),
career_max as (select max(ab) as max_ab from agg)
select
  a.player_id, p.name,
  (a.ab >= 0.4 * cm.max_ab) as is_regular,
  a.gp, a.seasons_played,
  a.singles, a.doubles, a.triples, a.hr,
  a.ab, a.fc, a.bb, a.hbp, a.roe, a.rbi, a.runs, a.k,
  (a.singles + a.doubles + a.triples + a.hr) as hits,
  (a.singles + 2*a.doubles + 3*a.triples + 4*a.hr) as tb,
  (a.runs + (a.singles + a.doubles + a.triples + a.hr) + a.bb + a.hbp + a.roe) as pa,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0) as avg,
  coalesce(((a.singles + a.doubles + a.triples + a.hr) + a.fc)::numeric / nullif(a.ab,0), 0) as obp,
  coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0) as slg,
  coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0)
    + coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0) as ops,
  coalesce((a.singles + 2*a.doubles + 3*a.triples + 4*a.hr)::numeric / nullif(a.ab,0), 0)
    - coalesce((a.singles + a.doubles + a.triples + a.hr)::numeric / nullif(a.ab,0), 0) as iso,
  coalesce((a.doubles + a.triples + a.hr)::numeric / nullif((a.singles + a.doubles + a.triples + a.hr),0), 0) as xbh_pct
from agg a
cross join career_max cm
join players p on p.id = a.player_id;
