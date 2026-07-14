# Group Sessions V2 Foundation (L09)

## What L09 delivers

L09 creates a local, versioned future foundation only:

- `supabase/migrations/20260714010000_groups_v2_foundation.sql`;
- generated Supabase types for the baseline plus every local migration;
- isolated V2 domain, repository and service modules;
- local SQL, repository, service, mapper and feature-flag evidence;
- architecture and rollout documentation.

It changes no legacy behavior. `groupsV2` remains `false`; no current React
component imports `src/services/groups-v2`; no remote migration is run; no
legacy data is read, copied, or dual-written.

## RPC contract

| RPC | Atomic effect | Concurrency rule |
| --- | --- | --- |
| `create_group_session_v2` | Canonical session, active assignments, created event. | New session starts at version 1. |
| `update_group_session_v2` | Shared content/date update and audit event. | Requires current version. |
| `add_group_session_participant_v2` | Activates one assignment and records it. | Requires current version. |
| `remove_group_session_participant_v2` | Marks one active assignment removed and records it. | Requires current version. |
| `duplicate_group_session_v2` | New canonical session, copied active assignments, lineage and events. | Requires current source version. |
| `cancel_group_session_v2` | Logical cancellation and audit event. | Requires current version. |
| `delete_group_session_v2` | Logical deletion and audit event. | Requires current version. |

The React layer must call one service operation at a time. It must never
reconstruct these transactions by writing tables sequentially.

## Local verification

```sh
npm run test:groups-v2:sql
npm run generate:types:check
npm run test -- tests/services/group-session-service.test.ts tests/services/group-session-supabase-repository.test.ts tests/types/groups-v2.test.ts
```

The SQL command starts a disposable local PostgreSQL Docker container. It
applies L05 fixtures and L09 twice to prove idempotent DDL, then verifies
constraints, foreign keys, indexes, RLS reads, write grants, RPC lifecycle,
rollback on an invalid participant, audit, soft deletion and stale-version
rejection. It never uses Supabase credentials or a linked remote project.

## Future migration sequence

1. Keep `groupsV2` disabled while L05 accounts, organizations, memberships and
   coach-athlete access are provisioned and reconciled through an approved
   process.
2. Define an explicit business mapping from each legacy athlete and group to
   the V2 organization/membership model. Validate counts and exceptions before
   copying anything.
3. Add a read-only V2 comparison path behind `groupsV2`; compare only agreed
   non-sensitive operational facts and keep V1 authoritative.
4. Add an approved, narrow pilot UI that creates only V2 sessions. Do not
   dual-write V1 calendar rows.
5. Validate expected sessions, participants, permissions, errors, performance,
   audit and rollback for the pilot.
6. Plan the product migration of historical V1 copies only after business
   approval. Preserve source references and before/after counters.
7. Remove legacy only in a separate, explicitly approved contract phase.

## Rollback and prohibitions

To stop a future pilot, disable `NEXT_PUBLIC_FEATURE_GROUPS_V2` and redeploy
the caller. The V2 schema remains as evidence; it is not deleted. Before any
remote migration, create a backup, record object and row counters, test in a
non-production environment, verify RLS by role, and record the migration
identifier. Never run `supabase db push`, `db reset`, direct table DML,
destructive DDL, or a legacy/V2 dual write as part of the rollback.

## Remaining decisions

L09 intentionally leaves the following for future approved lots: a V2 group
membership product model, per-athlete completion and feedback, recurring
sessions, session templates, integrations, operational dashboards, retention
periods for audit events, and the business policy for historical migration.
They need product acceptance before a UI or data migration is designed.
