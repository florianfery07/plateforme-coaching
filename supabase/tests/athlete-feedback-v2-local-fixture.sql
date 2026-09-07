-- Local-only P04 browser fixture. It reuses the synthetic L10 athlete mapping.
delete from public.workout_feedbacks
where workout_id = 'a4000000-0000-0000-0000-000000000001';

insert into public.calendar_workouts (
  id,
  athlete_id,
  date,
  workout_type,
  title,
  duration,
  completed,
  non_done,
  description,
  expected_rpe,
  expected_rpe_global,
  expected_specific_duration,
  expected_rpe_specific,
  blocks
) values (
  'a4000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  current_date - 1,
  'Cyclo-cross',
  'P04 Retour seance local',
  '1h20',
  false,
  false,
  'Seance synthetique locale pour le pilote de retour V2.',
  '7',
  7,
  '40 min',
  8,
  '[]'::jsonb
)
on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  workout_type = excluded.workout_type,
  title = excluded.title,
  duration = excluded.duration,
  completed = false,
  non_done = false,
  description = excluded.description,
  expected_rpe = excluded.expected_rpe,
  expected_rpe_global = excluded.expected_rpe_global,
  expected_specific_duration = excluded.expected_specific_duration,
  expected_rpe_specific = excluded.expected_rpe_specific,
  blocks = excluded.blocks;
