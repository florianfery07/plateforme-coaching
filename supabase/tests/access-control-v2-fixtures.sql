insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'athlete-one@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'athlete-two@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'coach@example.test'),
  ('00000000-0000-0000-0000-000000000004', 'other-coach@example.test'),
  ('00000000-0000-0000-0000-000000000005', 'archived-coach@example.test'),
  ('00000000-0000-0000-0000-000000000006', 'platform-admin@example.test'),
  ('00000000-0000-0000-0000-000000000007', 'delegate@example.test'),
  ('00000000-0000-0000-0000-000000000008', 'expired-delegate@example.test'),
  ('00000000-0000-0000-0000-000000000009', 'unassigned@example.test'),
  ('00000000-0000-0000-0000-000000000010', 'other-athlete@example.test')
on conflict do nothing;

insert into public.athletes (id, user_id, active, email) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, 'athlete-one@example.test'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', false, 'athlete-two@example.test')
on conflict do nothing;

insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000001', 'athlete'),
  ('00000000-0000-0000-0000-000000000003', 'coach')
on conflict do nothing;
