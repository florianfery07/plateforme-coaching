# Access Control V2 Foundation (L05)

## Scope and safety boundary

L05 introduces an additive authorization foundation beside MyRidePlan's legacy
access paths. It does not alter `public` legacy tables, their RLS policies,
existing RPCs, authentication behavior, or application screens. The public
`accessControlV2` feature flag remains disabled by default, and no current
application module imports the V2 access layer.

The migration is an artefact for a future approved deployment only. L05 does
not run `db push`, `db reset`, a remote migration, or a remote backfill.

## Current-state gap and migration strategy

| Current behavior | Target behavior | Risk | L05 migration response |
| --- | --- | --- | --- |
| A signed-in user without a legacy athlete row is treated as a coach in the React flow. | Server-side account state and explicit organization membership determine access. | Frontend-derived role selection can be manipulated and does not represent a durable authorization model. | Do not infer coaches during backfill; create only observed athlete account records. |
| Athlete and coach relationships are represented by legacy application data. | An explicit, time-aware coach-to-athlete relationship is scoped to an organization. | A broad migration could accidentally authorize the wrong coach. | Add `coach_athlete_access` without reading it from the legacy flow. |
| Legacy policies and a direct invite RPC remain in service. | New RLS and helpers protect only V2 tables and V2 RPC context. | Replacing legacy policies would interrupt the current platform. | Keep legacy policies untouched and isolate V2 in `access_control`. |
| Frontend feature flags choose product rollout. | Database helpers are the authorization source of truth. | A public flag must not become a permission. | The flag selects only a future UI path; database checks ignore it. |

The rollout sequence remains **EXPAND -> BACKFILL -> TEST -> PILOT ->
BASCULE -> CONTRACT**. L05 implements only EXPAND, a prepared conservative
BACKFILL, local TEST, and a PILOT mechanism that is inactive by default.

## Alternatives assessed

### A. Separate roles and relationships

New access-control tables are isolated from the legacy schema.

- Advantages: explicit tenant boundary, clean RLS ownership, reversible product
  rollout, supports teams and future AI scopes without overloading legacy data.
- Limits: dual-read/dual-write work will be needed during later migration lots.
- Migration and RLS: additive tables and policies only; legacy remains intact.
- Future compatibility: strong for multi-tenant teams, delegated access, and
  traceable AI authorizations.

### B. Add role columns to existing profiles

Roles and relationship fields would be added directly to legacy profile-like
tables.

- Advantages: fewer tables and an initially shorter read path.
- Limits: current legacy identity representations have drift and implicit role
  behavior; overloaded columns do not model multiple organization memberships
  or time-bounded delegations well.
- Migration and RLS: would mix V1 and V2 policy semantics on active resources.
- Future compatibility: weak for teams, assistants, and least-privilege AI.

### C. Hybrid model

Keep legacy entities as product records while using separate authorization
records for the V2 access boundary.

- Advantages: preserves the current application while establishing a durable
  server authorization model.
- Limits: needs carefully staged reconciliation in later lots.
- Migration and RLS: V2 policies can be observed without changing V1 policies.
- Future compatibility: combines safe migration with explicit multi-tenant and
  delegation capabilities.

**Decision:** use approach C. The new `access_control` schema is an isolated
authorization subsystem. Legacy data remains the product source of truth until
an approved pilot and later migration lots validate each transition.

## Additive data model

The approved migration is
`supabase/migrations/20260714000000_access_control_v2_foundation.sql`.

| Resource | Purpose | Safety characteristics |
| --- | --- | --- |
| `access_control.accounts` | Account status, platform role, migration observation. | A row is not an authorization grant; `auth.users` FK uses `RESTRICT`. |
| `access_control.organizations` | Future tenant boundary. | Independent of legacy teams and groups. |
| `access_control.organization_memberships` | Explicit organization-scoped roles. | Unique role membership, lifecycle state, and no cascade deletion. |
| `access_control.coach_athlete_access` | Explicit coach/assistant/practitioner access. | Same-organization composite FKs, validity dates, open-relation uniqueness, and a trigger requiring the matching active membership role. |
| `access_control.access_delegations` | Time-bounded, capability-limited delegation. | Same-organization FKs, expiry, revocation state, non-empty capabilities, and a trigger requiring an authorized active coach delegator. |
| `access_control.pilots` | Explicit user or organization allowlist. | Exactly one target and one active pilot per target. |

Every table has a primary key, foreign keys, timestamps, lifecycle state,
constraints, useful indexes, SQL comments, and `ON DELETE RESTRICT` for
relationships. Two `BEFORE INSERT OR UPDATE` triggers prevent a role-incompatible
coach relationship and a delegation from an unauthorized, inactive, or unlinked
delegator. L05 intentionally does not add an audit log: no V2 write flow exists
yet, so an incomplete audit log would create false confidence.

## Server authorization and RLS

The migration enables RLS only on the new V2 tables. It does not touch any
legacy RLS policy. `anon` has no schema usage or function execution rights.
`authenticated` can use the schema and execute only the listed helpers and
`public.get_access_context_v2()`.

Security-definer helpers have a fixed `search_path` and derive the acting user
from `auth.uid()`, never from a client-provided actor identifier:

- `current_account_is_active()`
- `current_user_is_platform_admin()`
- `current_user_is_active_member(uuid)`
- `current_user_can_access_athlete(uuid)`
- `current_user_can_manage_athlete(uuid)`
- `current_user_is_pilot()`

`get_access_context_v2()` returns a display/rollout context. Its permissions
are server-derived, but future mutations must still be authorized by database
policies or dedicated RPCs. A platform administrator is recognized separately
and is deliberately not given routine athlete access.

## Conservative backfill

`supabase/scripts/access-control-v2-backfill.sql` is a manual, idempotent
operator script. It opens a transaction, records before/after counters, and
only creates an `accounts` row with:

- `account_status = 'unverified'`
- `migration_state = 'observed_athlete'`

It does this only for a legacy `public.athletes.user_id` linked to an existing
`auth.users` identity. It creates no organization, membership, platform role,
coach relation, delegation, or pilot assignment. It reports missing identities,
duplicate legacy athlete identities, athlete/coach role conflicts, and all
legacy coach rows for manual review.

Before a future approved remote run:

1. Create a database backup and record relevant row counts.
2. Review the baseline and the target migration in a non-production
   environment.
3. Run the script manually with output captured in the change record.
4. Reconcile every anomaly before any account becomes active or receives a
   membership.
5. Compare the documented before/after counters, then retain the report with
   the migration evidence.

The script does not constitute a remote deployment instruction and must not be
run automatically from CI or application code.

`supabase/scripts/access-control-v2-verify.sql` is a separate `BEGIN READ
ONLY` verification script. It reports the V2 tables, policies, triggers,
functions, and aggregate lifecycle counters after an approved operation; it
never changes data or configuration.

## Pilot and rollback

V2 may be selected in a future caller only when both conditions hold:

1. `NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2` is explicitly enabled.
2. The server-derived context identifies an active V2 account and a current
   `access_control.pilots` assignment.

The public feature flag is a rollout switch, not a security permission. The
database helpers and policies remain authoritative. The L05 code is not yet
wired into `src/app/page.tsx`, so the current application cannot enter V2 by
accident in this lot.

To stop a future pilot, first disable its pilot record or disable the public
feature flag in the deployed environment. The caller must then select legacy.
Do not delete records as a rollback method. A migration rollback is not part of
L05; any corrective remote change requires a separately reviewed additive
migration and backup evidence.

## Local validation

Run the isolated SQL validation with:

```bash
node scripts/test-access-control-sql.mjs
```

It creates a disposable local PostgreSQL cluster in Docker, applies the V2
migration twice, runs the conservative backfill twice, and exercises RLS plus
authorization helpers. The scenario covers unauthenticated access, self access,
cross-athlete denial, assigned and unlinked coaches, archived memberships, a
platform administrator, valid and expired delegations, an ambiguous account,
role-incompatible and cross-organization relationship rejection, unauthorized
delegation rejection, and one-account RLS visibility.

The test simulates the minimal Supabase Auth contract (`auth.users` and
`auth.uid()`) because the local Supabase CLI/service stack is not configured in
this repository. It validates PostgreSQL syntax, constraints, RLS, and helper
logic, but does not validate GoTrue, Storage, Realtime, other schemas, or a
deployed Supabase project. A future approved staging verification must cover
those services before any pilot.

The TypeScript foundation is covered by:

```bash
npm run test -- tests/access/access-control-v2.test.ts
```

It verifies that the default flag does not call the RPC, V2 requires a valid
server pilot context, malformed RPC data fails closed, and UI helpers expose
only server-derived permissions.

## Dependencies for later lots

- **L06 (typing):** generate Supabase types after the migration is approved and
  available in a controlled database; replace no legacy type in L05.
- **L07 (application integration):** introduce one pilot-only read path, then
  route every sensitive mutation through dedicated server authorization.
- **Later data transition:** reconcile account anomalies, explicitly provision
  organizations and memberships, backfill relationships only after business
  validation, and add observability/audit records with real V2 write flows.
- **AI preparation:** the organization, relationship, delegation, and account
  status model provides a future least-privilege boundary; no AI capability is
  enabled by L05.
