-- L15b isolated synthetic fixture. It reuses the L05 access-control harness.

create table if not exists public.calendar_workouts (
  id uuid primary key,
  athlete_id uuid not null references public.athletes (id),
  completed boolean not null default false,
  non_done boolean not null default false
);

create table if not exists public.workout_feedbacks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null unique references public.calendar_workouts (id) on delete cascade,
  rpe numeric,
  rpe_global numeric,
  rpe_specific numeric,
  motivation integer,
  pleasure integer,
  comment text,
  real_duration text
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000004', 'l15b-unassigned@example.test'),
  ('00000000-0000-0000-0000-000000000005', 'l15b-inactive@example.test'),
  ('00000000-0000-0000-0000-000000000010', 'l15b-foreign@example.test')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000001', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000003', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000004', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000005', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000010', 'active', 'verified')
on conflict (user_id) do update set
  account_status = excluded.account_status,
  migration_state = excluded.migration_state;

insert into access_control.organizations (id, name, status) values
  ('20000000-0000-0000-0000-000000000015', 'L15b synthetic organization', 'active'),
  ('20000000-0000-0000-0000-000000000016', 'L15b foreign organization', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  ('30000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000153', '20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000154', '20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000004', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000155', '20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000010', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.coach_athlete_access (
  id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
) values
  ('40000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000153', '30000000-0000-0000-0000-000000000151', 'coach', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.pilots (id, organization_id, status) values
  ('60000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000015', 'active')
on conflict (id) do update set status = excluded.status;

insert into public.athletes (id, user_id, active, email) values
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', true, 'l15b-athlete@example.test'),
  ('10000000-0000-0000-0000-000000000016', null, true, 'l15b-unmapped@example.test'),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000010', true, 'l15b-foreign@example.test')
on conflict (id) do update set active = excluded.active, user_id = excluded.user_id;

insert into access_control.legacy_athlete_links (
  legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method
) values
  ('10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000151', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000155', 'active', 'manual')
on conflict (legacy_athlete_id, organization_id) do update set
  athlete_membership_id = excluded.athlete_membership_id,
  status = excluded.status;

insert into public.calendar_workouts (id, athlete_id, completed, non_done) values
  ('11000000-0000-0000-0000-000000000151', '10000000-0000-0000-0000-000000000015', false, false),
  ('11000000-0000-0000-0000-000000000152', '10000000-0000-0000-0000-000000000016', false, false),
  ('11000000-0000-0000-0000-000000000153', '10000000-0000-0000-0000-000000000017', false, false)
on conflict (id) do update set completed = false, non_done = false;

delete from public.workout_feedbacks
where workout_id in (
  '11000000-0000-0000-0000-000000000151',
  '11000000-0000-0000-0000-000000000152',
  '11000000-0000-0000-0000-000000000153'
);

create or replace function public.l15b_test_feedback_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15b.force_feedback_failure', true) = 'on' then
    raise exception 'l15b_test_feedback_failure';
  end if;
  return new;
end;
$$;

create or replace function public.l15b_test_workout_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15b.force_workout_failure', true) = 'on' then
    raise exception 'l15b_test_workout_failure';
  end if;
  return new;
end;
$$;

drop trigger if exists l15b_test_feedback_failure on public.workout_feedbacks;
create trigger l15b_test_feedback_failure
before insert or update on public.workout_feedbacks
for each row execute function public.l15b_test_feedback_failure();

drop trigger if exists l15b_test_workout_failure on public.calendar_workouts;
create trigger l15b_test_workout_failure
before update on public.calendar_workouts
for each row execute function public.l15b_test_workout_failure();
