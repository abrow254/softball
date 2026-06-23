-- ============================================================================
-- 0002_auth_rls.sql — roles + Row Level Security
-- ============================================================================
-- Access model: any AUTHENTICATED user can READ everything; only ADMINS can
-- write. Aaron is the first admin (see the note at the bottom of this file).

-- profiles: one row per auth user, carrying the role -------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

-- New auth users automatically get a 'viewer' profile.
-- SECURITY DEFINER so the trigger can insert past RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin(): true when the current user's profile role is 'admin'.
-- SECURITY DEFINER + STABLE so it runs as the function owner (bypassing RLS on
-- profiles, which avoids any recursive policy evaluation).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- Enable RLS on everything ----------------------------------------------
alter table players            enable row level security;
alter table seasons            enable row level security;
alter table games              enable row level security;
alter table lineups            enable row level security;
alter table game_player_stats  enable row level security;
alter table at_bats            enable row level security;
alter table profiles           enable row level security;

-- ---- Read: any authenticated user ------------------------------------------
create policy "read for authenticated" on players           for select to authenticated using (true);
create policy "read for authenticated" on seasons           for select to authenticated using (true);
create policy "read for authenticated" on games             for select to authenticated using (true);
create policy "read for authenticated" on lineups           for select to authenticated using (true);
create policy "read for authenticated" on game_player_stats for select to authenticated using (true);
create policy "read for authenticated" on at_bats           for select to authenticated using (true);

-- ---- Write: admins only (insert / update / delete) -------------------------
-- One policy per table per command, gated on is_admin().
create policy "admin write" on players           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on seasons           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on games             for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on lineups           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on game_player_stats for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on at_bats           for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Note: a `for all` policy also governs SELECT, so the explicit read policies
-- above (using true) are what actually let non-admins read; PostgreSQL ORs
-- permissive policies together, so authenticated users can always read, and
-- admins additionally satisfy the write policy.

-- ---- profiles: users read their own row; admins read/manage all ------------
create policy "read own or admin" on profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin manage profiles" on profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- FIRST ADMIN — run once after Aaron has signed up (replace the email):
--
--   update public.profiles set role = 'admin'
--   where email = 'aaron.scott.brown@outlook.com';
-- ============================================================================
