# Remote public schema reference

## Baseline facts

- Source: schema-only `npx supabase db dump --linked --schema public` supplied
  by the authorised operator.
- File: [`remote-schema.sql`](../../supabase/baseline/remote-schema.sql),
  32,740 bytes, SHA-256 recorded in the baseline manifest.
- Scope: `public` only; no application data statements detected.
- Objects: 19 tables, 3 function definitions, 49 policies, RLS enabled on all
  19 tables, no views, no triggers, and no explicit non-constraint indexes.

## Tables and constraints

All tables have UUID primary keys except `user_roles`, whose primary key is
`user_id`. The full DDL remains the authoritative source.

| Table | Key facts from the export |
| --- | --- |
| `athletes` | `user_id` references `auth.users`; `active` defaults true; `goal_update_requested` defaults false. |
| `calendar_workouts` | Athlete FK cascades; `blocks` is JSONB; RPE global/specific are numeric. |
| `workout_feedbacks` | `workout_id` has a unique FK to workouts with cascade. |
| `athlete_goal_history`, `athlete_observations`, `athlete_proposals`, `athlete_test_history`, `athlete_week_colors`, `athlete_week_planning` | Each has an athlete FK with cascade. |
| `athlete_group_members` | Both athlete and group FKs cascade; `(group_id, athlete_id)` is unique. |
| `athlete_week_colors`, `athlete_week_notes`, `athlete_week_planning` | Each has uniqueness on `(athlete_id, year, week)`; `athlete_week_notes` has no FK in the export. |
| `user_roles` | `role` check restricts values to `coach` or `athlete`; `user_id` references Auth with cascade. |
| `profiles`, `week_colors`, `workout_proposals` | Present but unused by current source; `week_colors` and `workout_proposals` have athlete FKs. |
| `workout_library`, `workout_categories`, `workout_subcategories`, `athlete_groups` | No foreign-key relationship between categories/subcategories or group ownership is exported. |

## Functions and grants

`is_coach()` is SQL `SECURITY DEFINER` and checks `user_roles` for the current
Auth user. `link_athlete_invite` has two PL/pgSQL `SECURITY DEFINER` overloads:
one accepts an invite-token-shaped string and requires an unlinked athlete; the
other accepts an athlete UUID and updates the matching athlete directly.

All three function definitions are granted to `anon`, `authenticated`, and
`service_role`. Every public table is also granted `ALL` to those roles. For
`anon` and `authenticated`, the exported RLS policies are therefore the
effective Data API authorization boundary. `service_role` must be treated as a
separate privileged context: whether it bypasses RLS is not established by this
`public`-schema export and must not be inferred from this document.

## RLS and policy baseline

RLS is enabled for every exported public table. The following policies are
visible in the dump and must be treated as a security baseline, not as an
approval of their design:

- Open `anon` policies with `USING (true)` or `WITH CHECK (true)` allow select,
  insert, update, or delete on `athletes`, `calendar_workouts`, and
  `workout_feedbacks` as named by the dump.
- `workout_library` has public select/insert/update/delete policies with true
  predicates; `athlete_week_notes` has `Allow all week notes` with true
  predicates.
- `athlete_groups` and `athlete_group_members` have policies named for coaches
  but their predicates are `USING (true)` / `WITH CHECK (true)` for every
  authenticated user.
- Athlete policies scope profile, proposals, workouts, feedbacks, test history,
  goal history, week colors, and week planning through `auth.uid()` and the
  athlete record.
- Coach policies either call `is_coach()` or infer coach status from the absence
  of an athlete record. These are not equivalent authorization models.
- `profiles`, `week_colors`, and `workout_proposals` have RLS enabled but no
  visible policy; their grants alone do not bypass RLS.

## Baseline risks to preserve for future remediation

L01 does not change these conditions. They are recorded so a future security
lot can migrate them deliberately with compatibility tests:

1. Broad anonymous policies expose athlete, workout, and feedback operations.
2. The direct UUID invitation overload is `SECURITY DEFINER` and granted to
   anonymous users.
3. Group policies do not enforce a coach predicate despite their names.
4. There are overlapping, apparently legacy relations for proposals and week
   colors.
5. No explicit non-constraint indexes or triggers are exported; performance and
   automatic timestamp behaviour require measurement before change.
6. Default privileges grant `ALL` on future tables, functions, and sequences to
   `anon` and `authenticated`, so the broad grant posture can propagate to new
   objects.
7. The exported `SECURITY DEFINER` functions do not declare a fixed
   `search_path`; a dedicated security migration must assess and harden that
   boundary before changing their behaviour.

## Explicitly absent from the export

No view, materialized view, trigger, custom type, domain, extension definition,
or explicit non-constraint index is present in this public-schema dump. This
does not prove that managed schemas or platform services have none.
