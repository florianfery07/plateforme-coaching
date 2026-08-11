-- L12 isolated, synthetic legacy rows used only by the athlete lifecycle SQL proof.

create table if not exists public.calendar_workouts (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.workout_feedbacks (
  id uuid primary key,
  workout_id uuid references public.calendar_workouts (id) on delete cascade
);
create table if not exists public.athlete_proposals (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_week_colors (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_week_notes (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_week_planning (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_observations (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_goal_history (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);
create table if not exists public.athlete_test_history (
  id uuid primary key,
  athlete_id uuid references public.athletes (id) on delete cascade
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'l12-athlete@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'l12-coach@example.test'),
  ('00000000-0000-0000-0000-000000000004', 'l12-non-pilot@example.test'),
  ('00000000-0000-0000-0000-000000000009', 'l12-inactive@example.test'),
  ('00000000-0000-0000-0000-000000000010', 'l12-unmanaged-athlete@example.test'),
  ('00000000-0000-0000-0000-000000000024', 'l12-foreign-athlete@example.test')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000001', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000003', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000004', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000009', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000010', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000024', 'active', 'verified')
on conflict (user_id) do update set account_status = excluded.account_status;

insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'L12 pilot organization'),
  ('20000000-0000-0000-0000-000000000002', 'L12 foreign organization')
on conflict do nothing;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.coach_athlete_access (
  id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'coach', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'active')
on conflict (id) do update set status = excluded.status;

insert into public.athletes (id, active, email) values
  ('10000000-0000-0000-0000-000000000021', true, 'l12-target@example.test'),
  ('10000000-0000-0000-0000-000000000022', true, 'l12-unmapped@example.test'),
  ('10000000-0000-0000-0000-000000000023', true, 'l12-foreign@example.test'),
  ('10000000-0000-0000-0000-000000000024', true, 'l12-unmanaged@example.test')
on conflict (id) do update set active = excluded.active;

insert into access_control.legacy_athlete_links (
  legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method
) values
  ('10000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000024', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000010', 'active', 'manual')
on conflict (legacy_athlete_id, organization_id) do update set status = excluded.status;

insert into public.calendar_workouts (id, athlete_id) values
  ('11000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.workout_feedbacks (id, workout_id) values
  ('12000000-0000-0000-0000-000000000021', '11000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_proposals (id, athlete_id) values
  ('13000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_week_colors (id, athlete_id) values
  ('14000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_week_notes (id, athlete_id) values
  ('15000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_week_planning (id, athlete_id) values
  ('16000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_observations (id, athlete_id) values
  ('17000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_goal_history (id, athlete_id) values
  ('18000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_test_history (id, athlete_id) values
  ('19000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
insert into public.athlete_groups (id, name) values
  ('1a000000-0000-0000-0000-000000000021', 'L12 synthetic group')
on conflict do nothing;
insert into public.athlete_group_members (group_id, athlete_id) values
  ('1a000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021')
on conflict do nothing;
