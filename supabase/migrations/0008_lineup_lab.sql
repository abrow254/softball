-- ============================================================================
-- 0008_lineup_lab.sql — schema additions for Lineup Lab
-- ============================================================================
-- Adds gender to players (for the MMF batting-order constraint) and creates
-- the player_game_log view (per-player per-game house stat line for sparklines
-- and hot/cold logic).
-- Backfill gender for every active player before using the Lineup Lab page.

-- players: add gender column for MMF constraint
alter table players add column if not exists gender text check (gender in ('M','F'));

-- player_game_log: per-player per-game house stat line, ordered by date.
-- House OPS = AVG + SLG (matches formulas.ts; deliberately not OBP + SLG).
-- security_invoker = on: RLS of the querying user applies through the view.
create or replace view player_game_log
with (security_invoker = on)
as
select
  gps.player_id,
  g.id                                                                           as game_id,
  g.game_date,
  g.season_id,
  (gps.singles + gps.doubles + gps.triples + gps.hr)                            as hits,
  gps.ab,
  case when gps.ab = 0 then 0
       else round(
         (gps.singles + gps.doubles + gps.triples + gps.hr)::numeric / gps.ab,
         3)
  end                                                                            as avg,
  case when gps.ab = 0 then 0
       else round(
         (gps.singles + 2*gps.doubles + 3*gps.triples + 4*gps.hr)::numeric / gps.ab,
         3)
  end                                                                            as slg,
  case when gps.ab = 0 then 0
       else round(
         (gps.singles + gps.doubles + gps.triples + gps.hr)::numeric / gps.ab
         + (gps.singles + 2*gps.doubles + 3*gps.triples + 4*gps.hr)::numeric / gps.ab,
         3)
  end                                                                            as ops
from game_player_stats gps
join games g on g.id = gps.game_id;
