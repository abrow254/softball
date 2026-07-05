-- ============================================================================
-- 0017_game_photos.sql — scorecard photos attached to a game
-- ============================================================================
-- Admins snap the filled-in paper scorecard after a game and attach it to the
-- game as a source-of-truth record. Files live in the 'scorecards' Storage
-- bucket; this table tracks which files belong to which game.

create table game_photos (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table game_photos enable row level security;

create policy "read for authenticated" on game_photos
  for select to authenticated using (true);
create policy "admin write" on game_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage bucket for the scorecard images. Public read (images are not
-- sensitive and are shown via plain <img>); writes gated to admins below.
insert into storage.buckets (id, name, public)
values ('scorecards', 'scorecards', true)
on conflict (id) do nothing;

-- Anyone can read the images (bucket is public); only admins can add/replace/remove.
create policy "scorecards public read" on storage.objects
  for select using (bucket_id = 'scorecards');
create policy "scorecards admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'scorecards' and public.is_admin());
create policy "scorecards admin update" on storage.objects
  for update to authenticated using (bucket_id = 'scorecards' and public.is_admin());
create policy "scorecards admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'scorecards' and public.is_admin());
