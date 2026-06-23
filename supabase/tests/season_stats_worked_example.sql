-- ============================================================================
-- season_stats_worked_example.sql — QA check for §4
-- ============================================================================
-- Run AFTER migrations + seed (e.g. paste into the Supabase SQL editor, or
-- `psql "$DATABASE_URL" -f supabase/tests/season_stats_worked_example.sql`).
-- Asserts the season_stats VIEW returns the spec's worked example exactly,
-- proving the SQL formulas agree with lib/formulas.ts.
--
--   Aaron Brown, one game: 2×1B, 1×2B, 1×HR, AB 5, rest 0
--   Expect: hits 4, tb 8, avg .800, slg 1.600, ops 2.400, iso .800,
--           xbh% 50%, obp .800

do $$
declare r record;
begin
  select * into r
  from season_stats
  where player_id = 'a0000000-0000-0000-0000-000000000001'
    and season_id = 'c0000000-0000-0000-0000-000000000001';

  if r is null then
    raise exception 'worked-example row not found — did seed.sql run?';
  end if;

  assert r.hits    = 4,      'hits should be 4, got %',    r.hits;
  assert r.tb      = 8,      'tb should be 8, got %',      r.tb;
  assert round(r.avg, 3)     = 0.800, 'avg should be .800, got %',  r.avg;
  assert round(r.slg, 3)     = 1.600, 'slg should be 1.600, got %', r.slg;
  assert round(r.ops, 3)     = 2.400, 'ops should be 2.400, got %', r.ops;
  assert round(r.iso, 3)     = 0.800, 'iso should be .800, got %',  r.iso;
  assert round(r.obp, 3)     = 0.800, 'obp should be .800, got %',  r.obp;
  assert round(r.xbh_pct, 3) = 0.500, 'xbh_pct should be .500, got %', r.xbh_pct;

  raise notice 'season_stats worked example PASSED ✔';
end $$;
