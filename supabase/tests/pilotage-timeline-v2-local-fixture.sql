-- P03 local browser fixture. Synthetic timeline data only; never a migration.
-- It extends the existing L10 coach/athlete fixture instead of creating another identity set.

insert into public.athlete_goal_requests_v2 (
  id,
  organization_id,
  athlete_membership_id,
  legacy_athlete_id,
  requested_by_user_id,
  idempotency_key,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_user_id,
  closed_at
) values (
  'a3000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000002',
  '93000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000002',
  'accepted',
  '2026-08-20 09:00:00+00',
  '2026-08-21 10:00:00+00',
  '90000000-0000-0000-0000-000000000001',
  '2026-08-21 10:00:00+00'
) on conflict (id) do nothing;

insert into public.athlete_goal_versions_v2 (
  id,
  request_id,
  revision_number,
  source,
  short_goal,
  medium_goal,
  long_goal,
  submitted_by_user_id,
  idempotency_key,
  submitted_at,
  review_outcome,
  reviewed_at,
  reviewed_by_user_id
) values (
  'a3000000-0000-0000-0000-000000000003',
  'a3000000-0000-0000-0000-000000000001',
  1,
  'athlete_submission',
  'France CX',
  'Monter en puissance pour les compétitions d’automne.',
  'Construire une saison cyclo-cross durable.',
  '90000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000004',
  '2026-08-20 09:00:00+00',
  'accepted',
  '2026-08-21 10:00:00+00',
  '90000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.athlete_pilotage_cycles_v2 (
  id,
  organization_id,
  athlete_membership_id,
  legacy_athlete_id,
  goal_version_id,
  name,
  starts_on,
  ends_on,
  color_key,
  intent,
  created_by_user_id,
  idempotency_key
) values
  (
    'a3000000-0000-0000-0000-000000000011',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000003',
    'Préparation générale',
    '2026-09-01',
    '2026-09-21',
    'blue',
    'Construire le socle aérobie avant la période spécifique.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000012'
  ),
  (
    'a3000000-0000-0000-0000-000000000013',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    null,
    'Développement puissance',
    '2026-09-08',
    '2026-09-28',
    'orange',
    'Faire progresser les efforts répétés sans perdre l’endurance.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000014'
  ),
  (
    'a3000000-0000-0000-0000-000000000015',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    null,
    'Technique CX',
    '2026-09-15',
    '2026-09-24',
    'emerald',
    'Ajouter des automatismes spécifiques cyclo-cross.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000016'
  )
on conflict (id) do nothing;

insert into public.athlete_pilotage_milestones_v2 (
  id,
  organization_id,
  athlete_membership_id,
  legacy_athlete_id,
  goal_version_id,
  kind,
  title,
  scheduled_for,
  details,
  created_by_user_id,
  idempotency_key
) values
  (
    'a3000000-0000-0000-0000-000000000021',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000003',
    'goal',
    'France CX',
    '2026-10-12',
    'Objectif principal de l’automne.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000022'
  ),
  (
    'a3000000-0000-0000-0000-000000000023',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    null,
    'competition',
    'Manche Coupe de France',
    '2026-09-20',
    'Course de préparation et repère de forme.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000024'
  ),
  (
    'a3000000-0000-0000-0000-000000000025',
    '91000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000001',
    null,
    'competition',
    'Test CP',
    '2026-09-10',
    'Test de contrôle ciblé.',
    '90000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000026'
  )
on conflict (id) do nothing;

delete from public.workout_feedbacks
where workout_id in (
  'a3000000-0000-0000-0000-000000000101',
  'a3000000-0000-0000-0000-000000000102',
  'a3000000-0000-0000-0000-000000000103',
  'a3000000-0000-0000-0000-000000000104',
  'a3000000-0000-0000-0000-000000000105',
  'a3000000-0000-0000-0000-000000000106'
);

insert into public.calendar_workouts (
  id,
  athlete_id,
  date,
  workout_type,
  title,
  duration,
  completed,
  description,
  expected_rpe,
  expected_rpe_global,
  expected_specific_duration,
  expected_rpe_specific,
  blocks
) values
  ('a3000000-0000-0000-0000-000000000101', '93000000-0000-0000-0000-000000000001', '2026-09-02', 'Route', 'Endurance 2h00', '2h00', true, 'Séance réalisée avec retour complet.', '4', 4, '2h00', 4, '[]'::jsonb),
  ('a3000000-0000-0000-0000-000000000102', '93000000-0000-0000-0000-000000000001', '2026-09-04', 'Cyclo-cross', 'VO2 max', '1h30', false, 'Retour encore attendu.', '8', 8, '45 min', 8, '[]'::jsonb),
  ('a3000000-0000-0000-0000-000000000103', '93000000-0000-0000-0000-000000000001', '2026-09-10', 'Route', 'Seuil 3 x 12', '1h45', false, 'Séance dense.', '7', 7, '36 min', 7, '[]'::jsonb),
  ('a3000000-0000-0000-0000-000000000104', '93000000-0000-0000-0000-000000000001', '2026-09-10', 'Préparation physique', 'PPG 30 min', '30 min', false, 'Séance dense.', '5', 5, '30 min', 5, '[]'::jsonb),
  ('a3000000-0000-0000-0000-000000000105', '93000000-0000-0000-0000-000000000001', '2026-09-10', 'Cyclo-cross', 'Technique franchissements', '1h00', false, 'Séance dense.', '6', 6, '30 min', 6, '[]'::jsonb),
  ('a3000000-0000-0000-0000-000000000106', '93000000-0000-0000-0000-000000000001', '2026-09-10', 'Home-trainer', 'RPE 8', '1h00', false, 'Séance dense.', '8', 8, '20 min', 8, '[]'::jsonb)
on conflict (id) do update set
  athlete_id = excluded.athlete_id,
  date = excluded.date,
  workout_type = excluded.workout_type,
  title = excluded.title,
  duration = excluded.duration,
  completed = excluded.completed,
  description = excluded.description,
  expected_rpe = excluded.expected_rpe,
  expected_rpe_global = excluded.expected_rpe_global,
  expected_specific_duration = excluded.expected_specific_duration,
  expected_rpe_specific = excluded.expected_rpe_specific,
  blocks = excluded.blocks,
  non_done = false;

insert into public.workout_feedbacks (id, workout_id, rpe, rpe_global, rpe_specific, motivation, pleasure, comment, real_duration)
values (
  'a3000000-0000-0000-0000-000000000111',
  'a3000000-0000-0000-0000-000000000101',
  4,
  4,
  4,
  8,
  8,
  'Retour synthétique complet.',
  '2h00'
)
on conflict (workout_id) do update set
  rpe = excluded.rpe,
  rpe_global = excluded.rpe_global,
  rpe_specific = excluded.rpe_specific,
  motivation = excluded.motivation,
  pleasure = excluded.pleasure,
  comment = excluded.comment,
  real_duration = excluded.real_duration;
