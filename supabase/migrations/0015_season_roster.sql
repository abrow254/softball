-- ============================================================================
-- 0015_season_roster.sql — per-season roster membership
-- ============================================================================
-- Who is on the team for a given season. Lets the Roster page be season-scoped
-- (check who's playing this year) and drives the lineup builder's candidate
-- pool. When a season has no roster rows, the app falls back to everyone with
-- stats that season.

create table season_roster (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  unique (season_id, player_id)
);

alter table season_roster enable row level security;

create policy "read for authenticated" on season_roster
  for select to authenticated using (true);
create policy "admin write" on season_roster
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
