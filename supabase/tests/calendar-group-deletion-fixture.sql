-- L15e isolated synthetic fixture. It mirrors the legacy calendar/feedback FK only.
create extension if not exists pgcrypto;

create table public.athletes (
  id uuid primary key,
  name text not null
);

create table public.athlete_groups (
  id uuid primary key,
  name text not null
);

create table public.athlete_group_members (
  group_id uuid not null references public.athlete_groups (id),
  athlete_id uuid not null references public.athletes (id),
  primary key (group_id, athlete_id)
);

create table public.calendar_workouts (
  id uuid primary key,
  athlete_id uuid not null references public.athletes (id),
  date text not null,
  title text not null
);

create table public.workout_feedbacks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null unique references public.calendar_workouts (id) on delete cascade
);

insert into public.athletes (id, name) values
  ('15000000-0000-0000-0000-000000000011', 'L15e Athlete One'),
  ('15000000-0000-0000-0000-000000000012', 'L15e Athlete Two'),
  ('15000000-0000-0000-0000-000000000013', 'L15e Unrelated Athlete');

insert into public.athlete_groups (id, name) values
  ('15000000-0000-0000-0000-000000000021', 'L15e Group');

insert into public.athlete_group_members (group_id, athlete_id) values
  ('15000000-0000-0000-0000-000000000021', '15000000-0000-0000-0000-000000000011'),
  ('15000000-0000-0000-0000-000000000021', '15000000-0000-0000-0000-000000000012');

insert into public.calendar_workouts (id, athlete_id, date, title) values
  ('15000000-0000-0000-0000-000000000031', '15000000-0000-0000-0000-000000000011', '2026-08-16', 'Target one'),
  ('15000000-0000-0000-0000-000000000032', '15000000-0000-0000-0000-000000000012', '2026-08-16', 'Target two'),
  ('15000000-0000-0000-0000-000000000033', '15000000-0000-0000-0000-000000000011', '2026-08-17', 'Other day'),
  ('15000000-0000-0000-0000-000000000034', '15000000-0000-0000-0000-000000000013', '2026-08-16', 'Outside group');

insert into public.workout_feedbacks (id, workout_id) values
  ('15000000-0000-0000-0000-000000000041', '15000000-0000-0000-0000-000000000031'),
  ('15000000-0000-0000-0000-000000000042', '15000000-0000-0000-0000-000000000032'),
  ('15000000-0000-0000-0000-000000000043', '15000000-0000-0000-0000-000000000033'),
  ('15000000-0000-0000-0000-000000000044', '15000000-0000-0000-0000-000000000034');
