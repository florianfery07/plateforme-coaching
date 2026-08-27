-- L15e: one parent DELETE uses the legacy FK cascade without touching unrelated rows.
delete from public.calendar_workouts
where id = '15000000-0000-0000-0000-000000000031';

do $$
begin
  if exists (select 1 from public.calendar_workouts where id = '15000000-0000-0000-0000-000000000031')
    or exists (select 1 from public.workout_feedbacks where workout_id = '15000000-0000-0000-0000-000000000031') then
    raise exception 'Single calendar deletion did not cascade to its feedback';
  end if;
end;
$$;

insert into public.calendar_workouts (id, athlete_id, date, title) values
  ('15000000-0000-0000-0000-000000000031', '15000000-0000-0000-0000-000000000011', '2026-08-16', 'Target one');
insert into public.workout_feedbacks (id, workout_id) values
  ('15000000-0000-0000-0000-000000000041', '15000000-0000-0000-0000-000000000031');

-- This reproduces the pre-pilot client sequence: a child delete can commit before a parent failure.
create or replace function public.l15e_reject_workout_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'l15e_test_parent_delete_failure';
end;
$$;

create trigger l15e_reject_workout_delete
before delete on public.calendar_workouts
for each row execute function public.l15e_reject_workout_delete();

delete from public.workout_feedbacks
where workout_id = '15000000-0000-0000-0000-000000000031';

do $$
begin
  begin
    delete from public.calendar_workouts where id = '15000000-0000-0000-0000-000000000031';
  exception when others then
    null;
  end;

  if not exists (select 1 from public.calendar_workouts where id = '15000000-0000-0000-0000-000000000031')
    or exists (select 1 from public.workout_feedbacks where workout_id = '15000000-0000-0000-0000-000000000031') then
    raise exception 'Legacy two-request failure was not reproduced as a partial state';
  end if;
end;
$$;

drop trigger l15e_reject_workout_delete on public.calendar_workouts;

insert into public.workout_feedbacks (id, workout_id) values
  ('15000000-0000-0000-0000-000000000041', '15000000-0000-0000-0000-000000000031');

-- A single targeted group-day parent deletion cascades all linked feedbacks atomically.
delete from public.calendar_workouts
where id in (
  '15000000-0000-0000-0000-000000000031',
  '15000000-0000-0000-0000-000000000032'
);

do $$
begin
  if exists (
    select 1 from public.calendar_workouts
    where id in (
      '15000000-0000-0000-0000-000000000031',
      '15000000-0000-0000-0000-000000000032'
    )
  ) or exists (
    select 1 from public.workout_feedbacks
    where workout_id in (
      '15000000-0000-0000-0000-000000000031',
      '15000000-0000-0000-0000-000000000032'
    )
  ) then
    raise exception 'Group-day deletion did not remove every targeted workout and feedback';
  end if;

  if not exists (select 1 from public.calendar_workouts where id = '15000000-0000-0000-0000-000000000033')
    or not exists (select 1 from public.calendar_workouts where id = '15000000-0000-0000-0000-000000000034')
    or not exists (select 1 from public.workout_feedbacks where workout_id = '15000000-0000-0000-0000-000000000033')
    or not exists (select 1 from public.workout_feedbacks where workout_id = '15000000-0000-0000-0000-000000000034') then
    raise exception 'Group-day deletion removed an out-of-scope workout or feedback';
  end if;
end;
$$;

-- Repeating the parent delete leaves the persisted state unchanged.
delete from public.calendar_workouts
where id = '15000000-0000-0000-0000-000000000032';
