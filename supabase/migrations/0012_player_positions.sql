-- ============================================================================
-- 0012_player_positions.sql — eligible fielding positions per player
-- ============================================================================
-- Which defensive positions each player can field. Drives the alignment builder
-- (warns on ineligible assignments) and position-eligibility UI. Values are
-- drawn from FIELDING_POSITIONS in lib/positions.ts
-- (C,1B,2B,3B,SS,LF,CF,RF,Rover). Empty array = unknown (no warnings).

alter table players add column if not exists positions text[] not null default '{}';

-- Existing players RLS (auth read / admin write) already covers the new column.
