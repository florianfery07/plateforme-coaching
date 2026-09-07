-- P05.C synthetic local fixture. It contains no hosted data or credentials.
create table if not exists public.workout_library (
  id uuid primary key, title text not null, total_duration text,
  expected_specific_duration text, blocks jsonb default '[]'::jsonb
);
create table if not exists public.calendar_workouts (
  id uuid primary key, athlete_id uuid references public.athletes(id), date text not null default '2026-09-08',
  duration text, expected_specific_duration text, blocks jsonb default '[]'::jsonb
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'p05-coach@example.test'),
  ('00000000-0000-0000-0000-000000000302', 'p05-other-coach@example.test'),
  ('00000000-0000-0000-0000-000000000303', 'p05-non-pilot@example.test'),
  ('00000000-0000-0000-0000-000000000304', 'p05-athlete@example.test')
on conflict do nothing;
insert into public.athletes (id, user_id, active, email) values
  ('10000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000304', true, 'p05-athlete@example.test')
on conflict (id) do update set active = excluded.active;
insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000301', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000302', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000303', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000304', 'active', 'verified')
on conflict (user_id) do update set account_status = excluded.account_status;
insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000301', 'P05 synthetic organization') on conflict do nothing;
insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000302', '20000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000303', '20000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000303', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000304', '20000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000304', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;
insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301', 'active'),
  ('60000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000302', 'active')
on conflict (id) do update set status = excluded.status;
insert into access_control.legacy_athlete_links (organization_id, legacy_athlete_id, athlete_membership_id, status, verification_method) values
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000301', '30000000-0000-0000-0000-000000000304', 'active', 'manual')
on conflict (legacy_athlete_id, organization_id) do update set status = excluded.status;
insert into access_control.coach_athlete_access (id, organization_id, coach_membership_id, athlete_membership_id, access_role, status) values
  ('50000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000301', '30000000-0000-0000-0000-000000000301', '30000000-0000-0000-0000-000000000304', 'coach', 'active')
on conflict do nothing;
insert into public.workout_library (id, title, total_duration, expected_specific_duration, blocks) values
  ('70000000-0000-0000-0000-000000000301', 'P05 template', '45min', '20min', '[{"legacy":true}]') on conflict do nothing;
insert into public.calendar_workouts (id, athlete_id, date, duration, expected_specific_duration, blocks) values
  ('71000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000301', '2026-09-08', '45min', '20min', '[{"legacy":true}]') on conflict do nothing;

create or replace function public.p05_test_projection_failure() returns trigger language plpgsql as $$
begin
  if current_setting('app.p05.force_projection_failure', true) = 'on' then raise exception 'p05_test_projection_failure'; end if;
  return new;
end; $$;
create trigger p05_test_projection_failure before update on public.workout_library for each row execute function public.p05_test_projection_failure();
