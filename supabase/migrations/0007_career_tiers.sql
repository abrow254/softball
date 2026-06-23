-- ============================================================================
-- 0007_career_tiers.sql — three-tier all-time classification
-- ============================================================================
-- The binary regular/ringer split is too blunt all-time: multi-season members
-- with moderate career AB were lumped in with one-game subs. career_stats now
-- exposes a `tier` by career AB relative to the all-time AB leader:
--   core    : AB >= 40% of leader   (long-tenured mainstays)
--   regular : 15% <= AB < 40%       (middle tier — fewer seasons)
--   ringer  : AB < 15%              (occasional subs)
-- season_stats is unchanged (a single season stays Regulars/Ringers).

create or replace view career_stats
with (security_invoker = on)
as
with agg as (
  select
    gps.player_id, sum(gps.gp)::int as gp,
    count(distinct g.season_id)::int as seasons_played,
    sum(gps.singles)::int as singles, sum(gps.doubles)::int as doubles,
    sum(gps.triples)::int as triples, sum(gps.hr)::int as hr,
    sum(gps.ab)::int as ab, sum(gps.fc)::int as fc, sum(gps.bb)::int as bb,
    sum(gps.hbp)::int as hbp, sum(gps.roe)::int as roe, sum(gps.rbi)::int as rbi,
    sum(gps.runs)::int as runs, sum(gps.k)::int as k
  from game_player_stats gps
  join games g on g.id = gps.game_id
  group by gps.player_id
),
career_max as (select max(ab) as max_ab from agg)
select
  a.player_id, p.name,
  (a.ab >= 0.40 * cm.max_ab) as is_regular,
  case
    when a.ab >= 0.40 * cm.max_ab then 'core'
    when a.ab >= 0.15 * cm.max_ab then 'regular'
    else 'ringer'
  end as tier,
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
