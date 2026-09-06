-- Minimal legacy read surfaces retained in the isolated P03 proof.
-- The timeline pilot must never write these existing calendar structures.

create table if not exists public.athlete_week_colors (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  year integer,
  week text,
  color_name text
);
create table if not exists public.athlete_week_planning (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  year integer,
  week text,
  goal text,
  category text,
  subcategory text,
  coach_comment text
);
create table if not exists public.calendar_workouts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  date text,
  title text
);

insert into public.athlete_week_colors (athlete_id, year, week, color_name)
values ('10000000-0000-0000-0000-000000000021', 2026, 'S37', 'bg-blue-500')
on conflict do nothing;
insert into public.athlete_week_planning (athlete_id, year, week, goal, category, subcategory, coach_comment)
values ('10000000-0000-0000-0000-000000000021', 2026, 'S37', 'Charge', 'Route', 'Endurance', 'Legacy')
on conflict do nothing;
insert into public.calendar_workouts (athlete_id, date, title)
values ('10000000-0000-0000-0000-000000000021', '2026-09-10', 'Legacy workout')
on conflict do nothing;
