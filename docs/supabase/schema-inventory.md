# Supabase resource inventory

## Verification status

L01 reconciles the current application source with the schema-only export in
[`supabase/baseline/remote-schema.sql`](../../supabase/baseline/remote-schema.sql).
The export is non-empty, covers the `public` schema, contains no `COPY` or
`INSERT` data statements, and matches the SHA-256 recorded in
[`supabase/baseline/manifest.json`](../../supabase/baseline/manifest.json).

The detailed, remote-verified reference is
[`remote-schema-reference.md`](remote-schema-reference.md). This document keeps
the application-facing comparison explicit so that future migrations do not
confuse a code expectation with an observed database fact.

## Resources used by the current application

All 15 PostgREST relations used by `src/` exist in the captured `public`
schema. The columns below are used by the application and are present in the
export.

| Resource | Code usage | Verified keys / relationships | Reconciliation |
| --- | --- | --- | --- |
| `athletes` | Coach CRUD, athlete profile and login lookup. | PK `id`; `user_id -> auth.users(id)`. | Code fields exist; `ftp` is remote-only. |
| `calendar_workouts` | Planning, completion and non-completion. | PK `id`; `athlete_id -> athletes(id)` cascade. | Code fields exist. |
| `workout_feedbacks` | Feedback join, upsert and deletion. | PK `id`; unique and FK `workout_id -> calendar_workouts(id)` cascade. | The code's one-feedback-per-workout assumption is verified. |
| `workout_library` | Coach library CRUD. | PK `id`. | Code uses `total_duration`; remote also has legacy `duration`. |
| `workout_categories` | Coach category CRUD. | PK `id`. | No unique constraint on `name` is exported. |
| `workout_subcategories` | Coach subcategory CRUD. | PK `id`. | No parent-category relationship is exported. |
| `athlete_proposals` | Athlete proposal and coach decision. | PK `id`; `athlete_id -> athletes(id)` cascade. | Code fields exist. |
| `athlete_week_colors` | Read and athlete-deletion cleanup. | PK `id`; unique `(athlete_id, year, week)`; FK to athlete cascade. | Read path verified; no write path was found in code. |
| `athlete_week_notes` | Weekly note upsert and cleanup. | PK `id`; unique `(athlete_id, year, week)`. | Code uniqueness expectation is verified; no FK is exported. |
| `athlete_week_planning` | Weekly planning upsert and cleanup. | PK `id`; unique `(athlete_id, year, week)`; FK to athlete cascade. | Code uniqueness expectation is verified. |
| `athlete_groups` | Group CRUD. | PK `id`. | No ownership column or FK is exported. |
| `athlete_group_members` | Membership upsert and delete. | PK `id`; unique `(group_id, athlete_id)`; both FKs cascade. | Code uniqueness expectation is verified. |
| `athlete_observations` | Coaching notes CRUD. | PK `id`; `athlete_id -> athletes(id)` cascade. | Code fields exist. |
| `athlete_goal_history` | Goal history read/create and cleanup. | PK `id`; `athlete_id -> athletes(id)` cascade. | Code fields exist. |
| `athlete_test_history` | Coach test history; athlete read-only view. | PK `id`; `athlete_id -> athletes(id)` cascade. | Code fields exist; no `test_date` column is exported. |

## Public resources not called by the current source

| Resource | Verified shape | Drift risk |
| --- | --- | --- |
| `profiles` | `id`, `role`, `coach_code`, `created_at`; PK `id`. | High: legacy or future auth model with no current source owner. |
| `user_roles` | `user_id`, checked `role` (`coach` or `athlete`); PK and FK to `auth.users`. | High: used by the remote `is_coach()` function, but not by current source. |
| `week_colors` | `id`, `athlete_id`, integer `year`/`week`, `color`, `created_at`; PK and athlete FK. | Medium: overlaps semantically with `athlete_week_colors`. |
| `workout_proposals` | `id`, `athlete_id`, `title`, `description`, `status`, `created_at`; PK and athlete FK. | Medium: overlaps semantically with `athlete_proposals`. |

## Functions, Auth, and services

- Supabase Auth calls in source: `getSession`, `signInWithPassword`, `signUp`,
  and `signOut`.
- Remote functions: `is_coach()` and two `SECURITY DEFINER` overloads of
  `link_athlete_invite`.
- The source call uses the overload accepting `athlete_id`, `athlete_email`,
  and `auth_user_id`. That overload updates any supplied athlete ID and does
  not require `user_id IS NULL`; the alternate token overload does. Both are
  granted to `anon` and `authenticated` in the baseline.
- No Storage, Realtime, or Edge Function call is present in `src/`.

## What the public export does not cover

The baseline does **not** cover `auth`, `storage`, extension schemas, Auth
providers, redirect URLs, JWT settings, Auth hooks, Storage buckets and
policies, Edge Functions, platform configuration, secrets, or any data. Those
surfaces require distinct, read-only operational review before they can be
declared verified.
