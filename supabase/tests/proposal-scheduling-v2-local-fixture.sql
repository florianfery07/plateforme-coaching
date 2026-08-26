-- L15c local-only browser fixture. Synthetic coach, athlete, and pending proposal.
-- It is applied only by the explicit local bootstrap, never by a remote migration.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, raw_app_meta_data, raw_user_meta_data, created_at,
  updated_at, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000151',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'l15c-coach@example.test',
  crypt('L15c-local-only-password', gen_salt('bf')),
  now(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  false,
  false
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  updated_at = excluded.updated_at;

update auth.users
set
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  email_change_token_current = '',
  phone_change = '',
  phone_change_token = '',
  reauthentication_token = ''
where id = '00000000-0000-0000-0000-000000000151';

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000151',
  'l15c-coach@example.test',
  '00000000-0000-0000-0000-000000000151',
  '{"sub":"00000000-0000-0000-0000-000000000151","email":"l15c-coach@example.test","email_verified":true}',
  'email', now(), now(), now()
) on conflict (provider, provider_id) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000151', 'coach')
on conflict (user_id) do update set role = excluded.role;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000151', 'active', 'verified'),
  ('90000000-0000-0000-0000-000000000002', 'active', 'verified')
on conflict (user_id) do update set
  account_status = excluded.account_status,
  migration_state = excluded.migration_state;

insert into access_control.organizations (id, name, status) values (
  '20000000-0000-0000-0000-000000000151',
  'L15c Local Organization',
  'active'
) on conflict (id) do update set
  name = excluded.name,
  status = excluded.status;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  (
    '30000000-0000-0000-0000-000000000151',
    '20000000-0000-0000-0000-000000000151',
    '00000000-0000-0000-0000-000000000151',
    'coach',
    'active'
  ),
  (
    '30000000-0000-0000-0000-000000000161',
    '20000000-0000-0000-0000-000000000151',
    '90000000-0000-0000-0000-000000000002',
    'athlete',
    'active'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  user_id = excluded.user_id,
  role = excluded.role,
  status = excluded.status;

insert into access_control.coach_athlete_access (
  id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
) values (
  '40000000-0000-0000-0000-000000000151',
  '20000000-0000-0000-0000-000000000151',
  '30000000-0000-0000-0000-000000000151',
  '30000000-0000-0000-0000-000000000161',
  'coach',
  'active'
) on conflict (id) do update set
  organization_id = excluded.organization_id,
  coach_membership_id = excluded.coach_membership_id,
  athlete_membership_id = excluded.athlete_membership_id,
  access_role = excluded.access_role,
  status = excluded.status;

insert into access_control.pilots (id, user_id, status) values (
  '60000000-0000-0000-0000-000000000151',
  '00000000-0000-0000-0000-000000000151',
  'active'
) on conflict (id) do update set
  user_id = excluded.user_id,
  status = excluded.status;

insert into public.athletes (id, name, email, user_id, active, sport, color) values (
  '10000000-0000-0000-0000-000000000151',
  'L15c Proposal Athlete',
  'l15c-athlete@example.test',
  null,
  true,
  'Velo',
  'bg-blue-500'
) on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  user_id = null,
  active = excluded.active,
  sport = excluded.sport,
  color = excluded.color;

insert into public.athlete_proposals (
  id, athlete_id, date, type, title, message, status
) values
  (
    '13000000-0000-0000-0000-000000000151',
    '10000000-0000-0000-0000-000000000151',
    '2026-08-26',
    'Course à ajouter',
    'L15c Atomic Proposal',
    'Synthetic local proposal scheduled through the L15c pilot.',
    'À traiter'
  ),
  (
    '13000000-0000-0000-0000-000000000161',
    '10000000-0000-0000-0000-000000000151',
    '2026-08-27',
    'Course à ajouter',
    'L15c Legacy Baseline Proposal',
    'Synthetic local proposal used only to measure the legacy path.',
    'À traiter'
  )
on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  status = excluded.status;

delete from public.calendar_workouts
where source_proposal_id in (
  '13000000-0000-0000-0000-000000000151',
  '13000000-0000-0000-0000-000000000161'
);

insert into access_control.legacy_athlete_links (
  legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method
) values (
  '10000000-0000-0000-0000-000000000151',
  '20000000-0000-0000-0000-000000000151',
  '30000000-0000-0000-0000-000000000161',
  'active',
  'manual'
) on conflict (legacy_athlete_id, organization_id) do update set
  athlete_membership_id = excluded.athlete_membership_id,
  status = excluded.status,
  verification_method = excluded.verification_method;
