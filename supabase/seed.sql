-- ============================================================================
-- seed.sql — minimal data so the stats grid renders verifiable numbers
-- ============================================================================
-- Fixed UUIDs so the QA worked-example test can reference rows directly.
-- Aaron Brown's line is the §4 worked example: 2×1B, 1×2B, 1×HR, AB 5.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

-- players ---------------------------------------------------------------------
insert into players (id, name, is_regular, active) values
  ('a0000000-0000-0000-0000-000000000001', 'Aaron Brown', true,  true),
  ('a0000000-0000-0000-0000-000000000002', 'Mike Carter', true,  true),
  ('a0000000-0000-0000-0000-000000000003', 'Dave Singh',  true,  true),
  ('a0000000-0000-0000-0000-000000000004', 'Chris Day',   true,  true),
  ('b0000000-0000-0000-0000-000000000001', 'Sam Ringer',  false, true)
on conflict (id) do nothing;

-- season ----------------------------------------------------------------------
insert into seasons (id, year, term, label, is_current) values
  ('c0000000-0000-0000-0000-000000000001', 2025, 'Summer', '2025 Summer', true)
on conflict (id) do nothing;

-- game ------------------------------------------------------------------------
insert into games (id, season_id, game_date, opponent, our_runs, opp_runs) values
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   '2025-06-05', 'Sharks', 14, 9)
on conflict (id) do nothing;

-- lineup (drives the printable card for this game) ----------------------------
insert into lineups (game_id, player_id, batting_order, starting_pos) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'SS'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, 'CF'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 3, '3B'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 4, 'C'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 5, 'RF')
on conflict (game_id, player_id) do nothing;

-- per-game counting lines (SOURCE OF TRUTH) ----------------------------------
-- Aaron = §4 worked example: singles 2, doubles 1, hr 1, ab 5, rest 0.
insert into game_player_stats
  (game_id, player_id, singles, doubles, triples, hr, ab, fc, bb, hbp, roe, rbi, runs, k) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2, 1, 0, 1, 5, 0, 0, 0, 0, 3, 2, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 3, 0, 0, 0, 4, 0, 0, 0, 0, 1, 1, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, 1, 1, 0, 5, 0, 0, 0, 0, 2, 1, 0),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 2),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 0, 0, 1, 3, 0, 0, 0, 0, 2, 2, 0)
on conflict (game_id, player_id) do nothing;
