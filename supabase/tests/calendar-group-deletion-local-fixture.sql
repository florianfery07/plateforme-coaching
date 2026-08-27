-- L15e local-only browser fixture. Synthetic legacy group sessions; never a migration.
delete from public.workout_feedbacks
where workout_id in (
  '98000000-0000-0000-0000-000000000151',
  '98000000-0000-0000-0000-000000000152',
  '98000000-0000-0000-0000-000000000153'
);

insert into public.calendar_workouts (
  id,
  athlete_id,
  date,
  workout_type,
  title,
  duration,
  description,
  blocks,
  completed,
  non_done
) values
  (
    '98000000-0000-0000-0000-000000000151',
    '93000000-0000-0000-0000-000000000001',
    '2026-08-26',
    'Endurance',
    'L15e Single Group Session',
    '0h45',
    'Synthetic local-only session for one group member deletion.',
    '[]',
    false,
    false
  ),
  (
    '98000000-0000-0000-0000-000000000152',
    '93000000-0000-0000-0000-000000000001',
    '2026-08-27',
    'Endurance',
    'L15e Group Day Session One',
    '1h00',
    'Synthetic local-only group-day deletion target.',
    '[]',
    false,
    false
  ),
  (
    '98000000-0000-0000-0000-000000000153',
    '93000000-0000-0000-0000-000000000002',
    '2026-08-27',
    'Endurance',
    'L15e Group Day Session Two',
    '1h15',
    'Synthetic local-only group-day deletion target.',
    '[]',
    false,
    false
  )
on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  workout_type = excluded.workout_type,
  title = excluded.title,
  duration = excluded.duration,
  description = excluded.description,
  blocks = excluded.blocks,
  completed = false,
  non_done = false;

insert into public.workout_feedbacks (id, workout_id, comment) values
  ('98000000-0000-0000-0000-000000000161', '98000000-0000-0000-0000-000000000151', 'L15e synthetic feedback one'),
  ('98000000-0000-0000-0000-000000000162', '98000000-0000-0000-0000-000000000152', 'L15e synthetic feedback two'),
  ('98000000-0000-0000-0000-000000000163', '98000000-0000-0000-0000-000000000153', 'L15e synthetic feedback three')
on conflict (workout_id) do update set comment = excluded.comment;
