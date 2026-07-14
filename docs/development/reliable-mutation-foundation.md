# Reliable Mutation Foundation (L08a)

## Scope

L08a adds unused, local-only primitives for future reliable mutations. No
existing component imports them, and no legacy mutation, schema, RLS policy,
RPC, data or remote configuration changes. The legacy application remains the
only active path.

## Legacy inventory

This inventory is deliberately specific to the current repository and is
descriptive only. L08a does not redirect, wrap or change any of these calls;
the contract documented below remains reusable and project-neutral.

| Domain / category | Current files | Trigger and write | Pending / error / rollback | Debounce / concurrency / criticality |
| --- | --- | --- | --- | --- |
| Athlete profile (autosave-like) | `src/app/page.tsx` | Editable athlete fields; `update` | Varies by handler; no common rollback | No shared debounce; late response risk; high |
| Athlete lifecycle (explicit / sensitive) | `src/app/page.tsx` | Create, archive or delete athlete; `insert`, `delete` | Local state and error handling vary | Double action and authorization risk; critical |
| Invitation link (explicit / sensitive) | `src/app/page.tsx` | Invite action; `rpc` | Handler-specific feedback | Not retry-safe client-side; critical |
| Calendar session (explicit / deletion) | `src/app/page.tsx`, `src/components/calendar/Session.tsx` | Edit or delete a session; `update`, `delete` | Error checks are inconsistent; no shared restoration | Interacting edits and destructive action risk; high |
| Feedback and completion (autosave-like / multi-table) | `src/app/page.tsx`, `src/components/calendar/Session.tsx` | Feedback upsert then completion update | No reusable pending or rollback contract | Repeated input can overlap; multi-table sequence; high |
| Week notes and planning (autosave-like) | `src/app/page.tsx`, `src/components/athlete/WeekDetail.tsx` | Note/planning `upsert` | Handler-specific errors; no common rollback | Natural latest-wins candidate; medium |
| Workout library (explicit / deletion) | `src/app/page.tsx`, `src/components/library/LibraryPage.tsx` | Create/update/delete workout | UI feedback differs per screen | Duplicate click and destructive risk; high |
| Categories and library propagation (multi-table) | `src/app/page.tsx`, `src/components/library/Editable.tsx` | Rename category and related library data | Independent calls, no transaction | Partial update risk; high |
| Goals, observations and CP (explicit / sensitive) | `src/components/athlete/AthleteProfilePage.tsx`, `src/components/athlete/CP.tsx` | Create/update/delete athlete history | Local handler-specific behavior | Sensitive data and duplicate/delete risk; high |
| Proposals and programming (explicit / multi-table) | `src/app/page.tsx`, `src/components/calendar/Proposal.tsx` | Status update, insert and schedule | No shared compensation | Partial programming and stale status risk; high |
| Groups and group calendar (explicit / multi-table) | `src/lib/api/groups.ts`, `src/lib/api/RroupCalendar.ts` | Group CRUD, membership and calendar deletes | API-specific errors; no cross-call rollback | Independent delete sequences; high |
| Notifications (explicit) | `src/components/calendar/AthleteNotificationsBanner.tsx` | Mark notification seen; `update` | Local handler-specific behavior | Low frequency; lower criticality |

L08b must choose one small autosave mutation first. The recommended pilot is
**athlete week note autosave**: it is a single-table upsert, has a natural
resource key, and is lower risk than feedback, invitations or deletions.

## Architecture

`src/services/mutations/` is React-independent:

- `MutationState`: `idle`, `pending`, `success`, `error`, `superseded` and
  `cancelled`.
- `MutationError`: stable `network`, `validation`, `conflict`, `permission`,
  `timeout` or `unknown` categories, without a raw Supabase message.
- `createMutationExecutor()`: execution id, configurable timeout, controlled
  retry, duplicate rejection, per-resource-key serialization, latest-wins handling,
  optimistic rollback and local cancellation.
- `createDebouncedMutation()`: one active local write, latest pending intent,
  explicit `flush()` and `cancel()`.

`useReliableMutation()` is an optional React 19 adapter. It cancels the local
execution on unmount and exposes `mutate`, `pending`, `error`, `lastSuccess`,
`reset` and `cancel`. It is intentionally not imported by any screen in L08a.

## Semantics

- **Debounce** delays a burst and keeps its last pending value.
- **Throttle** would limit cadence; L08a does not implement it.
- **Serialization** ensures one local execution per explicit resource key runs
  at a time when configured as `serial`.
- **Latest-wins** marks an obsolete completion `superseded`; it does not undo a
  server write already accepted.
- **Cancellation** requests local abort but keeps a resource key locked until
  its active promise settles. This deliberately prevents a non-cooperative
  network call from being followed by a duplicate write.
- **Rollback** is optional. `onMutate` may return a local restoration callback;
  it runs once after a local failure, timeout or cancellation.
- **Confirmation callback** runs only after a successful remote operation. If
  it fails, the executor returns a safe local error but never rolls back the
  already-confirmed remote write.

Timeout and cancellation are local observations. They never prove that a
database write did not complete. Generic retries are disabled by default and
require an explicit `shouldRetry` predicate for a safely idempotent operation.
After a timeout, the local result may be returned while the resource key stays
locked until the underlying promise settles; this prevents a duplicate write
from overtaking an indeterminate request.

## Diagnostics

`createDevelopmentMutationDiagnostic()` records only mutation type, terminal
state, duration, timeout and rollback facts. Do not include an identifier,
email, name, payload, workout content, performance value, token or raw error
in a mutation type or diagnostic callback.

Diagnostics are best-effort observers. A diagnostic callback failure never
changes the typed mutation result or runs a rollback.

## Usage rules and anti-patterns

Use this foundation for a narrowly scoped, replay-safe client mutation with a
clear resource key and a reconciliation plan. Do not use it to:

- authorize a user or replace RLS;
- make a multi-table sequence atomic;
- retry generic inserts after a timeout;
- conceal a server error or log its raw payload; or
- move an existing mutation without its own approved L08b test plan.

Sensitive or multi-table actions need a server-side RPC/command with database
transactions, authorization and idempotency constraints. This local framework
does not replace those server guarantees.

## L08b success criteria

The first pilot must keep the legacy path available, use a single mutation
type/key, prove debounce and reconciliation behavior, show a safe user-facing
error, and include targeted regression tests. Any migration of feedback,
invites, deletions or multi-table work requires a separate server-authorized
design first.

## L08a verification note

The L08a targeted tests, the full local test suite, TypeScript checking and
targeted ESLint checking are expected to pass before this foundation is used.
The production build may be unable to complete in a sandbox that cannot reach
Google Fonts for the existing `Geist` assets. That environment-only failure is
not worked around in L08a and does not alter the application.
