-- P04.B isolated, synthetic fixture. It composes the existing L05/L12/L15
-- harness; no hosted Supabase project or personal data is involved.

alter table public.calendar_workouts
  add column if not exists expected_rpe_specific numeric,
  add column if not exists expected_specific_duration text,
  add column if not exists duration text;

update public.calendar_workouts
set expected_rpe_specific = 8,
    expected_specific_duration = '40 min',
    duration = '1h20',
    completed = false,
    non_done = false
where id = '11000000-0000-0000-0000-000000000151';

insert into public.calendar_workouts (
  id, athlete_id, completed, non_done, expected_rpe_specific,
  expected_specific_duration, duration
) values
  ('11000000-0000-0000-0000-000000000154', '10000000-0000-0000-0000-000000000015', false, false, null, '', '45 min'),
  ('11000000-0000-0000-0000-000000000155', '10000000-0000-0000-0000-000000000015', false, false, 8, '40 min', '1h20')
on conflict (id) do update set
  completed = false,
  non_done = false,
  expected_rpe_specific = excluded.expected_rpe_specific,
  expected_specific_duration = excluded.expected_specific_duration,
  duration = excluded.duration;

delete from public.workout_feedbacks
where workout_id in (
  '11000000-0000-0000-0000-000000000151',
  '11000000-0000-0000-0000-000000000154',
  '11000000-0000-0000-0000-000000000155'
);

create or replace function public.p04_test_feedback_failure()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.p04.force_feedback_failure', true) = 'on' then
    raise exception 'p04_test_feedback_failure';
  end if;
  return new;
end;
$$;

drop trigger if exists p04_test_feedback_failure on public.workout_feedbacks;
create trigger p04_test_feedback_failure
before insert or update on public.workout_feedbacks
for each row execute function public.p04_test_feedback_failure();
