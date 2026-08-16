-- L14a local-only browser fixture. Synthetic feedback session; never a migration.
delete from public.workout_feedbacks
where workout_id = '98000000-0000-0000-0000-000000000001';

insert into public.calendar_workouts (
  id,
  athlete_id,
  date,
  workout_type,
  title,
  duration,
  description,
  expected_rpe,
  expected_rpe_global,
  expected_specific_duration,
  expected_rpe_specific,
  blocks
) values (
  '98000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  '2026-08-16',
  'Endurance',
  'L14 Reliable Feedback Session',
  '1h00',
  'Synthetic local-only session used to measure reliable feedback writes.',
  '5',
  5,
  '60 min',
  4,
  '[{"name":"Endurance","duration":"60 min"}]'
) on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  workout_type = excluded.workout_type,
  title = excluded.title,
  duration = excluded.duration,
  description = excluded.description,
  expected_rpe = excluded.expected_rpe,
  expected_rpe_global = excluded.expected_rpe_global,
  expected_specific_duration = excluded.expected_specific_duration,
  expected_rpe_specific = excluded.expected_rpe_specific,
  blocks = excluded.blocks,
  completed = false,
  non_done = false;
