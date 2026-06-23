-- ============================================================================
-- season_stats_worked_example.sql — QA check against REAL imported data
-- ============================================================================
-- Run AFTER 0004 migration + import_history.sql (paste into the Supabase SQL
-- editor, or psql -f). Asserts the season_stats VIEW reproduces the workbook's
-- 2025 Summer numbers exactly, proving the SQL house formulas are intact.
--
--   Aaron, 2025 Summer: 1B 20, 2B 10, 3B 9, HR 2, AB 55, FC 1
--   Expect: hits 41, tb 75, avg .745, obp .764 (HOUSE: +FC /AB),
--           slg 1.364, ops 2.109 (HOUSE: avg+slg), iso .618, xbh% .512

do $$
declare r record;
begin
  select * into r
  from season_stats
  where player_id = 'd23c1ed6-b8aa-53e5-82e0-8e05aa383564'   -- Aaron
    and season_id  = 'dc97e180-1c8a-5af2-928a-f94118e1a6c0';  -- 2025 Summer

  if r is null then
    raise exception 'worked-example row not found — did import_history.sql run?';
  end if;

  assert r.hits = 41, 'hits should be 41, got %', r.hits;
  assert r.tb   = 75, 'tb should be 75, got %',   r.tb;
  assert round(r.avg, 3)     = 0.745, 'avg should be .745, got %',  r.avg;
  assert round(r.obp, 3)     = 0.764, 'obp should be .764, got %',  r.obp;
  assert round(r.slg, 3)     = 1.364, 'slg should be 1.364, got %', r.slg;
  assert round(r.ops, 3)     = 2.109, 'ops should be 2.109, got %', r.ops;
  assert round(r.iso, 3)     = 0.618, 'iso should be .618, got %',  r.iso;
  assert round(r.xbh_pct, 3) = 0.512, 'xbh_pct should be .512, got %', r.xbh_pct;
  assert r.is_regular = true, 'Aaron should be a regular in 2025, got %', r.is_regular;

  raise notice 'season_stats worked example PASSED (real 2025 data)';
end $$;
