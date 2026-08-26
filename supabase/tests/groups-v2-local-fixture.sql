-- L10 local-only browser fixture. Synthetic data only; never a migration.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'l10-coach@example.test', crypt('L10-local-only-password', gen_salt('bf')), now(), '', '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'l10-athlete-one@example.test', crypt('L10-local-only-password', gen_salt('bf')), now(), '', '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'l10-athlete-two@example.test', crypt('L10-local-only-password', gen_salt('bf')), now(), '', '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do update set encrypted_password = excluded.encrypted_password, confirmation_token = excluded.confirmation_token, email_confirmed_at = excluded.email_confirmed_at;
update auth.users
set
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  email_change_token_current = '',
  phone_change = '',
  phone_change_token = '',
  reauthentication_token = ''
where id in (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('90000000-0000-0000-0000-000000000001', 'l10-coach@example.test', '90000000-0000-0000-0000-000000000001', '{"sub":"90000000-0000-0000-0000-000000000001","email":"l10-coach@example.test","email_verified":true}', 'email', now(), now(), now()),
  ('90000000-0000-0000-0000-000000000002', 'l10-athlete-one@example.test', '90000000-0000-0000-0000-000000000002', '{"sub":"90000000-0000-0000-0000-000000000002","email":"l10-athlete-one@example.test","email_verified":true}', 'email', now(), now(), now()),
  ('90000000-0000-0000-0000-000000000003', 'l10-athlete-two@example.test', '90000000-0000-0000-0000-000000000003', '{"sub":"90000000-0000-0000-0000-000000000003","email":"l10-athlete-two@example.test","email_verified":true}', 'email', now(), now(), now())
on conflict (provider, provider_id) do update set user_id = excluded.user_id, identity_data = excluded.identity_data, updated_at = excluded.updated_at;
insert into public.user_roles (user_id, role) values ('90000000-0000-0000-0000-000000000001', 'coach') on conflict (user_id) do update set role = excluded.role;
insert into public.athletes (id, name, email, user_id, active, sport, color) values
  ('93000000-0000-0000-0000-000000000001', 'L10 Athlete One', 'l10-athlete-one@example.test', '90000000-0000-0000-0000-000000000002', true, 'Velo', 'bg-blue-500'),
  ('93000000-0000-0000-0000-000000000002', 'L10 Athlete Two', 'l10-athlete-two@example.test', '90000000-0000-0000-0000-000000000003', true, 'Velo', 'bg-emerald-500') on conflict (id) do update set user_id = excluded.user_id, active = excluded.active;
insert into public.athlete_groups (id, name) values ('94000000-0000-0000-0000-000000000001', 'L10 Local Pilot Group') on conflict (id) do update set name = excluded.name;
insert into public.athlete_group_members (id, group_id, athlete_id) values
  ('94100000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001'),
  ('94100000-0000-0000-0000-000000000002', '94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000002') on conflict (id) do nothing;
insert into public.workout_library (id, title, category, duration, description, blocks, subcategory, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific) values ('95000000-0000-0000-0000-000000000001', 'L10 Local Endurance Session', 'Endurance', '1h00', 'Synthetic local validation workout.', '[{"name":"Endurance","duration":"60 min"}]', 'Base', '1h00', '4', 4, '60 min', 4) on conflict (id) do update set title = excluded.title;
insert into access_control.accounts (user_id, account_status, migration_state) values ('90000000-0000-0000-0000-000000000001', 'active', 'verified'), ('90000000-0000-0000-0000-000000000002', 'active', 'verified'), ('90000000-0000-0000-0000-000000000003', 'active', 'verified') on conflict (user_id) do update set account_status = excluded.account_status, migration_state = excluded.migration_state;
insert into access_control.organizations (id, name, status) values ('91000000-0000-0000-0000-000000000001', 'L10 Local Organization', 'active') on conflict (id) do update set name = excluded.name;
insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'coach', 'active'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'athlete', 'active'),
  ('92000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000003', 'athlete', 'active') on conflict (id) do update set status = excluded.status;
insert into access_control.coach_athlete_access (id, organization_id, coach_membership_id, athlete_membership_id, access_role, status) values
  ('96000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000002', 'coach', 'active'),
  ('96000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000003', 'coach', 'active') on conflict (id) do update set status = excluded.status;
insert into access_control.pilots (id, organization_id, status) values ('97000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'active') on conflict (id) do update set organization_id = excluded.organization_id, status = excluded.status;
insert into access_control.legacy_group_links (legacy_group_id, organization_id, status, verification_method, verified_by_user_id) values ('94000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'active', 'manual', '90000000-0000-0000-0000-000000000001') on conflict (legacy_group_id) do update set status = excluded.status;
insert into access_control.legacy_athlete_links (legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method, verified_by_user_id) values
  ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000002', 'active', 'manual', '90000000-0000-0000-0000-000000000001'),
  ('93000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000003', 'active', 'manual', '90000000-0000-0000-0000-000000000001') on conflict (legacy_athlete_id, organization_id) do update set athlete_membership_id = excluded.athlete_membership_id, status = excluded.status;
