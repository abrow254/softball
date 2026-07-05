-- Forfeits have a known result but no runs. Flag them so head-to-head records
-- and win streaks count them, while run totals (RS/RA/diff) ignore them —
-- keeping the DB in step with the registry, which treats forfeits as 0 runs.
--
-- forfeit_won: true  = we won by forfeit
--              false = we lost by forfeit
--              null  = not a forfeit
alter table games add column if not exists is_forfeit boolean not null default false;
alter table games add column if not exists forfeit_won boolean;
