-- L16c local browser fixture. Synthetic credentials only; never used remotely.

update auth.users
set
  instance_id = '00000000-0000-0000-0000-000000000000',
  aud = 'authenticated',
  role = 'authenticated',
  encrypted_password = crypt('L16-local-only-password', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  email_change_token_current = '',
  created_at = coalesce(created_at, now()),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data = '{}'::jsonb,
  updated_at = now()
where id in (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);

insert into auth.identities (provider_id, user_id, provider, identity_data, created_at, updated_at)
values
  (
    'l16-athlete@example.test',
    '00000000-0000-0000-0000-000000000021',
    'email',
    '{"sub":"00000000-0000-0000-0000-000000000021","email":"l16-athlete@example.test","email_verified":true}'::jsonb,
    now(), now()
  ),
  (
    'l16-coach@example.test',
    '00000000-0000-0000-0000-000000000022',
    'email',
    '{"sub":"00000000-0000-0000-0000-000000000022","email":"l16-coach@example.test","email_verified":true}'::jsonb,
    now(), now()
  )
on conflict (provider_id, provider) do update
set user_id = excluded.user_id, identity_data = excluded.identity_data, updated_at = now();
