-- ============================================================================
-- 0014_availability.sql — game-day availability (RSVP)
-- ============================================================================
-- Who's available for an upcoming game, so the lineup builder optimizes over
-- only the players who are actually playing. Keyed by (season_id, game_date,
-- player_id) — NOT game_id — because upcoming games come from the scraped
-- schedule and have no games row yet.

create table availability (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  game_date date not null,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'in' check (status in ('in', 'out', 'maybe')),
  updated_at timestamptz not null default now(),
  unique (season_id, game_date, player_id)
);

alter table availability enable row level security;

create policy "read for authenticated" on availability
  for select to authenticated using (true);
create policy "admin write" on availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
