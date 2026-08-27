-- L15d isolated synthetic fixture. It deliberately keeps taxonomy text-linked.

create table if not exists public.workout_categories (
  id uuid primary key,
  name text not null,
  color text
);

create table if not exists public.workout_subcategories (
  id uuid primary key,
  name text not null,
  color text
);

create table if not exists public.workout_library (
  id uuid primary key,
  category text,
  subcategory text,
  title text not null
);

create table if not exists public.calendar_workouts (id uuid primary key);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000171', 'l15d-coach@example.test'),
  ('00000000-0000-0000-0000-000000000172', 'l15d-non-pilot@example.test'),
  ('00000000-0000-0000-0000-000000000173', 'l15d-inactive@example.test'),
  ('00000000-0000-0000-0000-000000000174', 'l15d-athlete@example.test')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000171', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000172', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000173', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000174', 'active', 'verified')
on conflict (user_id) do update set
  account_status = excluded.account_status,
  migration_state = excluded.migration_state;

insert into access_control.organizations (id, name, status) values
  ('20000000-0000-0000-0000-000000000171', 'L15d synthetic organization', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  ('30000000-0000-0000-0000-000000000171', '20000000-0000-0000-0000-000000000171', '00000000-0000-0000-0000-000000000171', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000172', '20000000-0000-0000-0000-000000000171', '00000000-0000-0000-0000-000000000172', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000173', '20000000-0000-0000-0000-000000000171', '00000000-0000-0000-0000-000000000173', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000174', '20000000-0000-0000-0000-000000000171', '00000000-0000-0000-0000-000000000174', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;

insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000171', '00000000-0000-0000-0000-000000000171', 'active'),
  ('60000000-0000-0000-0000-000000000173', '00000000-0000-0000-0000-000000000173', 'active'),
  ('60000000-0000-0000-0000-000000000174', '00000000-0000-0000-0000-000000000174', 'active')
on conflict (id) do update set status = excluded.status;

insert into public.workout_categories (id, name, color) values
  ('71000000-0000-0000-0000-000000000171', 'Route', 'bg-blue-500'),
  ('71000000-0000-0000-0000-000000000172', 'Montagne', 'bg-green-500'),
  ('71000000-0000-0000-0000-000000000173', 'Catégorie fragile', 'bg-red-500'),
  ('71000000-0000-0000-0000-000000000174', 'Concurrence', 'bg-purple-500')
on conflict (id) do update set name = excluded.name, color = excluded.color;

insert into public.workout_subcategories (id, name, color) values
  ('72000000-0000-0000-0000-000000000171', 'Endurance', 'bg-yellow-500'),
  ('72000000-0000-0000-0000-000000000172', 'Tempo', 'bg-orange-500')
on conflict (id) do update set name = excluded.name, color = excluded.color;

insert into public.workout_library (id, category, subcategory, title) values
  ('73000000-0000-0000-0000-000000000171', 'Route', 'Endurance', 'Route endurance'),
  ('73000000-0000-0000-0000-000000000172', 'Route', 'Tempo', 'Route tempo'),
  ('73000000-0000-0000-0000-000000000173', 'Montagne', 'Endurance', 'Montagne endurance'),
  ('73000000-0000-0000-0000-000000000174', 'Catégorie fragile', 'Endurance', 'Fragile'),
  ('73000000-0000-0000-0000-000000000175', 'Concurrence', 'Endurance', 'Concurrente')
on conflict (id) do update set category = excluded.category, subcategory = excluded.subcategory, title = excluded.title;

create or replace function public.l15d_test_library_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15d.force_library_failure', true) = 'on' then
    raise exception 'l15d_test_library_failure';
  end if;
  return new;
end;
$$;

create or replace function public.l15d_test_category_delete_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.l15d.force_category_delete_failure', true) = 'on' then
    raise exception 'l15d_test_category_delete_failure';
  end if;
  return old;
end;
$$;

drop trigger if exists l15d_test_library_failure on public.workout_library;
create trigger l15d_test_library_failure
before update on public.workout_library
for each row execute function public.l15d_test_library_failure();

drop trigger if exists l15d_test_category_delete_failure on public.workout_categories;
create trigger l15d_test_category_delete_failure
before delete on public.workout_categories
for each row execute function public.l15d_test_category_delete_failure();
