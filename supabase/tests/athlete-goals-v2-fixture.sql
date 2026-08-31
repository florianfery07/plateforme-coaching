-- L16b isolated synthetic fixture. It uses only local PostgreSQL test data.

alter table public.athletes add column if not exists short_goal text;
alter table public.athletes add column if not exists medium_goal text;
alter table public.athletes add column if not exists long_goal text;
alter table public.athletes add column if not exists name text;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000021', 'l16-athlete@example.test'),
  ('00000000-0000-0000-0000-000000000022', 'l16-coach@example.test'),
  ('00000000-0000-0000-0000-000000000023', 'l16-second-coach@example.test'),
  ('00000000-0000-0000-0000-000000000024', 'l16-non-pilot@example.test'),
  ('00000000-0000-0000-0000-000000000025', 'l16-inactive@example.test'),
  ('00000000-0000-0000-0000-000000000026', 'l16-unmanaged@example.test')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000021', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000022', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000023', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000024', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000025', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000026', 'active', 'verified')
on conflict (user_id) do update set account_status = excluded.account_status;

insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000021', 'L16 pilot organization'),
  ('20000000-0000-0000-0000-000000000022', 'L16 foreign organization')
on conflict do nothing;

insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000023', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000024', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000025', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000026', 'coach', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.coach_athlete_access (id, organization_id, coach_membership_id, athlete_membership_id, access_role, status) values
  ('40000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000021', 'coach', 'active'),
  ('40000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000021', 'coach', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', 'active'),
  ('60000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022', 'active'),
  ('60000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000023', 'active'),
  ('60000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000025', 'active'),
  ('60000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000026', 'active')
on conflict (id) do update set status = excluded.status;

insert into public.athletes (id, name, user_id, active, email, short_goal, medium_goal, long_goal) values
  ('10000000-0000-0000-0000-000000000021', 'L16 Athlete', '00000000-0000-0000-0000-000000000021', true, 'l16-athlete@example.test', 'Legacy court', 'Legacy moyen', 'Legacy long'),
  ('10000000-0000-0000-0000-000000000022', 'L16 Unmapped Athlete', null, true, 'l16-unmapped@example.test', null, null, null),
  ('10000000-0000-0000-0000-000000000023', 'L16 Archived Athlete', null, false, 'l16-archived@example.test', null, null, null)
on conflict (id) do update set name = excluded.name, active = excluded.active, short_goal = excluded.short_goal, medium_goal = excluded.medium_goal, long_goal = excluded.long_goal;

insert into access_control.legacy_athlete_links (legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method) values
  ('10000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000021', 'active', 'manual')
on conflict (legacy_athlete_id, organization_id) do update set status = excluded.status;
