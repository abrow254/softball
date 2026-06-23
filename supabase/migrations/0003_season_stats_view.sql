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
