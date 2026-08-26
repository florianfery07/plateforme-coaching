-- L15c isolated synthetic fixture. It reuses the L05/L09/L11/L12 local harness.

create table if not exists public.athlete_proposals (
  id uuid primary key,
  athlete_id uuid references public.athletes (id),
  date text,
  type text,
  title text,
  message text,
  status text default 'À traiter',
  created_at timestamptz default now()
);

create table if not exists public.calendar_workouts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes (id),
  date text not null,
  workout_type text,
  title text,
  duration text,
  completed boolean default false,
  created_at timestamptz default now(),
  non_done boolean default false,
  non_done_reason text,
  non_done_fatigue text,
  non_done_pain text,
  non_done_comment text,
  description text,
  expected_rpe text,
  blocks jsonb,
  subcategory text,
  expected_rpe_global numeric,
  expected_specific_duration text,
  expected_rpe_specific numeric,
  adjusted_specific_duration text,
  athlete_seen_at timestamptz
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000151', 'l15c-coach@example.test'),
  ('00000000-0000-0000-0000-000000000152', 'l15c-unmanaged-coach@example.test'),
  ('00000000-0000-0000-0000-000000000153', 'l15c-non-pilot@example.test'),
  ('00000000-0000-0000-0000-000000000154', 'l15c-inactive@example.test'),
  ('00000000-0000-0000-0000-000000000155', 'l15c-archived-athlete@example.test')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000001', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000002', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000010', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000151', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000152', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000153', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000154', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000155', 'active', 'verified')
on conflict (user_id) do update set
  account_status = excluded.account_status,
  migration_state = excluded.migration_state;

insert into access_control.organizations (id, name, status) values
  ('20000000-0000-0000-0000-000000000151', 'L15c synthetic organization', 'active'),
  ('20000000-0000-0000-0000-000000000152', 'L15c foreign organization', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  ('30000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000151', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000152', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000152', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000153', '20000000-0000-0000-0000-000000000152', '00000000-0000-0000-0000-000000000153', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000154', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000154', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000161', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000162', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000002', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000163', '20000000-0000-0000-0000-000000000152', '00000000-0000-0000-0000-000000000010', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000164', '20000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000155', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.coach_athlete_access (
  id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
) values
  ('40000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000151', '30000000-0000-0000-0000-000000000151', '30000000-0000-0000-0000-000000000161', 'coach', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000151', 'active')
on conflict (id) do update set status = excluded.status;

insert into public.athletes (id, user_id, active, email) values
  ('10000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000001', true, 'l15c-athlete@example.test'),
  ('10000000-0000-0000-0000-000000000152', '00000000-0000-0000-0000-000000000002', true, 'l15c-unmanaged@example.test'),
  ('10000000-0000-0000-0000-000000000153', null, true, 'l15c-unmapped@example.test'),
  ('10000000-0000-0000-0000-000000000154', '00000000-0000-0000-0000-000000000010', true, 'l15c-foreign@example.test'),
  ('10000000-0000-0000-0000-000000000155', '00000000-0000-0000-0000-000000000155', false, 'l15c-archived@example.test')
on conflict (id) do update set active = excluded.active, user_id = excluded.user_id;

insert into access_control.legacy_athlete_links (
  legacy_athlete_id, organization_id, athlete_membership_id, status, verification_method
) values
  ('10000000-0000-0000-0000-000000000151', '20000000-0000-0000-0000-000000000151', '30000000-0000-0000-0000-000000000161', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000152', '20000000-0000-0000-0000-000000000151', '30000000-0000-0000-0000-000000000162', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000154', '20000000-0000-0000-0000-000000000152', '30000000-0000-0000-0000-000000000163', 'active', 'manual'),
  ('10000000-0000-0000-0000-000000000155', '20000000-0000-0000-0000-000000000151', '30000000-0000-0000-0000-000000000164', 'active', 'manual')
on conflict (legacy_athlete_id, organization_id) do update set
  athlete_membership_id = excluded.athlete_membership_id,
  status = excluded.status;

insert into public.athlete_proposals (
  id, athlete_id, date, type, title, message, status
) values
  ('13000000-0000-0000-0000-000000000151', '10000000-0000-0000-0000-000000000151', '2026-08-26', 'Course à ajouter', 'Course locale', 'À ajouter au calendrier.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000152', '10000000-0000-0000-0000-000000000151', '2026-08-27', 'Indisponibilité / demande de repos', 'Repos', 'Indisponible.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000153', '10000000-0000-0000-0000-000000000153', '2026-08-28', 'Course à ajouter', 'Sans mapping', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000154', '10000000-0000-0000-0000-000000000152', '2026-08-29', 'Course à ajouter', 'Sans accès', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000155', '10000000-0000-0000-0000-000000000155', '2026-08-30', 'Course à ajouter', 'Archivée', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000156', '10000000-0000-0000-0000-000000000154', '2026-08-31', 'Course à ajouter', 'Étrangère', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000157', '10000000-0000-0000-0000-000000000151', '2026-09-01', 'Course à ajouter', 'Historique', 'Déjà programmée legacy.', 'Programmée'),
  ('13000000-0000-0000-0000-000000000158', '10000000-0000-0000-0000-000000000151', '2026-09-02', 'Course à ajouter', 'Concurrence', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000159', '10000000-0000-0000-0000-000000000151', '2026-09-03', 'Course à ajouter', 'Rollback insertion', 'À ajouter.', 'À traiter'),
  ('13000000-0000-0000-0000-000000000160', '10000000-0000-0000-0000-000000000151', '2026-09-04', 'Course à ajouter', 'Rollback statut', 'À ajouter.', 'À traiter')
on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  status = excluded.status;

create or replace function public.l15c_test_workout_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15c.force_workout_failure', true) = 'on' then
    raise exception 'l15c_test_workout_failure';
  end if;
  return new;
end;
$$;

create or replace function public.l15c_test_proposal_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15c.force_proposal_failure', true) = 'on' then
    raise exception 'l15c_test_proposal_failure';
  end if;
  return new;
end;
$$;

drop trigger if exists l15c_test_workout_failure on public.calendar_workouts;
create trigger l15c_test_workout_failure
before insert on public.calendar_workouts
for each row execute function public.l15c_test_workout_failure();

drop trigger if exists l15c_test_proposal_failure on public.athlete_proposals;
create trigger l15c_test_proposal_failure
before update on public.athlete_proposals
for each row execute function public.l15c_test_proposal_failure();
