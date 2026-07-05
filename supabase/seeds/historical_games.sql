-- ============================================================================
-- Load ALL historical game results (2022–2025) into the games table.
-- Idempotent: for each season it clears non-aggregate rows then re-inserts,
-- so it's safe to run once or many times regardless of what's already loaded.
-- Only touches non-aggregate rows — season aggregate totals are left alone.
--
-- Includes the forfeit columns up front so it's fully self-contained.
-- ============================================================================

-- Forfeit columns (idempotent — safe if already applied via migration 0016).
alter table games add column if not exists is_forfeit boolean not null default false;
alter table games add column if not exists forfeit_won boolean;

-- ---- Summer 2023 (8-3-1, +26) ----
with s as (select id from seasons where year = 2023 and term = 'Summer' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2023 and term = 'Summer' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2023-05-25','TBD',26,13),
  ('2023-06-01','Horsemen',14,17),
  ('2023-06-08','NOBLETIGERS',18,12),
  ('2023-06-15','Mohome Smashers',18,18),
  ('2023-06-22','Big Dingers',19,6),
  ('2023-06-29','B-Squad',17,6),
  ('2023-07-13','EllisDon',14,7),
  ('2023-07-27','Loon Lakers',14,28),
  ('2023-08-03','BIG HITTERS',24,20),
  ('2023-08-10','Blue Steel',23,21),
  ('2023-08-17','Black Fly',4,19),
  ('2023-08-24','NOBLETIGERS',14,12)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Fall 2023 (6-0-1, +111) ----
with s as (select id from seasons where year = 2023 and term = 'Fall' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2023 and term = 'Fall' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2023-09-12','1 Hit Wonders',35,1),
  ('2023-09-19','The Incredible Hucks',21,12),
  ('2023-09-26','Salty Swingers',22,9),
  ('2023-10-03','Backdoor Sliders',24,8),
  ('2023-10-10','Sultans of Swing',24,24),
  ('2023-10-17','Benchwarmers',28,2),
  ('2023-10-24',E'Taps ''N Bars',32,19)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Summer 2024 (9-2, +98) ----
with s as (select id from seasons where year = 2024 and term = 'Summer' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2024 and term = 'Summer' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2024-05-28','Master Batters',18,16),
  ('2024-06-04','Tossit Terriers',11,10),
  ('2024-06-11','The Sluggers',9,7),
  ('2024-06-18','Peanuts',41,8),
  ('2024-06-25','The Incredible Hucks',35,18),
  ('2024-07-02','The Soft Serves',20,13),
  ('2024-07-09','Past Our Prime',25,5),
  ('2024-07-16','Kracken da bats',8,22),
  ('2024-07-23','Kracken da bats',16,17),
  ('2024-08-13','Hooligans',26,16),
  ('2024-08-20','Hooligans',38,17)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Fall 2024 (7-0, +127) ----
with s as (select id from seasons where year = 2024 and term = 'Fall' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2024 and term = 'Fall' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2024-09-08','Hitting Tanks',31,16),
  ('2024-09-15','New Era',39,8),
  ('2024-09-22','Bad Knees Bears',23,11),
  ('2024-09-29','Ball the Office',31,22),
  ('2024-10-06','Alpha Q Up',30,7),
  ('2024-10-20','Honeybadgers',28,2),
  ('2024-10-27','Alpha Q Up',21,10)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Summer 2025 (13-0, +153) ----
with s as (select id from seasons where year = 2025 and term = 'Summer' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2025 and term = 'Summer' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2025-05-29','Beckett Bombers',13,1),
  ('2025-06-12','Labatt',15,9),
  ('2025-06-19','Loon Lakers',22,19),
  ('2025-06-26','EllisDon',23,6),
  ('2025-07-03','Double Header',21,13),
  ('2025-07-10','The Horsemen',16,9),
  ('2025-07-17','NOBLETIGERS',16,15),
  ('2025-07-24','Louisville Chuggers',32,3),
  ('2025-07-31','Indy Team',31,3),
  ('2025-08-07','BIG BALLERS',28,10),
  ('2025-08-14','NOBLETIGERS',24,16),
  ('2025-08-21','Loon Lakers',19,16),
  ('2025-08-28','Louisville Chuggers',24,11)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Summer 2022 (9 scored; 3 forfeits below) ----
with s as (select id from seasons where year = 2022 and term = 'Summer' limit 1)
delete from games where season_id = (select id from s) and is_aggregate = false;
with s as (select id from seasons where year = 2022 and term = 'Summer' limit 1)
insert into games (season_id, game_date, opponent, our_runs, opp_runs, is_aggregate)
select (select id from s), g.d::date, g.o, g.us, g.them, false
from (values
  ('2022-05-29','The Incredible Hucks',8,19),
  ('2022-06-05','Benchwarmers',19,5),
  ('2022-06-12','Brew Jays',28,20),
  ('2022-07-10','The Old Timers',30,17),
  ('2022-07-17','Salty Swingers',27,16),
  ('2022-07-24','Inglorious Batters',6,24),
  ('2022-08-07','The Buckets',20,7),
  ('2022-08-14','The Incredible Hucks',21,0),
  ('2022-08-21','The Buckets',11,10)
) as g(d,o,us,them) where exists (select 1 from s);

-- ---- Summer 2022 forfeits (needs migration 0016) ----
with s as (select id from seasons where year = 2022 and term = 'Summer' limit 1)
insert into games (season_id, game_date, opponent, is_aggregate, is_forfeit, forfeit_won)
select (select id from s), g.d::date, g.o, false, true, g.won
from (values
  ('2022-06-19','Cougars',true),
  ('2022-06-26','Hit Talkers',true),
  ('2022-08-28','Inglorious Batters',false)
) as g(d,o,won) where exists (select 1 from s);
