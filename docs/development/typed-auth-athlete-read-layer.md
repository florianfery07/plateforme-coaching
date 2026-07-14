# Typed Auth and Athlete Read Layer (L07a)

## Scope

L07a adds isolated, typed read-only building blocks for authentication context
and athlete lists. It does not change `src/app/page.tsx`, the legacy Supabase
client, UI state, screen behavior, feature flags, data, RLS, RPCs, or remote
Supabase configuration. No existing screen imports this layer.

The legacy application remains the only active production path. L07a is a
preparation step for a separately approved L07b integration.

## Observed Legacy Flow

| Step | Current code | Input | Output | Risk | Future responsibility |
| --- | --- | --- | --- | --- | --- |
| Initial data load | `page.tsx` `loadAllData()` | Browser Supabase client | Full athlete/workout/application state | Runs independently of authentication and uses broad `select("*")`. | Narrow read repositories. |
| Athlete mapping | `loadAllData()` | Raw athlete row | UI-specific object with defaults | SQL nulls are silently converted; mapping is coupled to UI helpers. | Domain mapper/service boundary. |
| Active filtering | `visibleAthletes` | In-memory athlete state | Rows where `active !== false` | Null/invalid values behave like active rows. | Typed active/archive partition. |
| Active selection | `activeId` fallback | Current selection and athlete array | Existing row, first row, or demo fallback | Selection policy is mixed with display state. | Remains legacy in L07a; L07b must preserve it explicitly. |
| Session restore | `restoreSession()` effect | `auth.getSession()` | Local `auth` state | Any authenticated user without an athlete row becomes coach. | Explicit typed context comparison. |
| Athlete identity | `athletes` query by `user_id` | Session user id | Athlete / archived-athlete state | Uses `select("*")`; error handling is console-only. | Auth repository with targeted fields. |
| Coach identity | Absence of athlete row | No explicit role evidence | `{ role: "coach" }` | Implicit privilege elevation. | Only explicit `user_roles.role = coach` is `legacy_coach`; otherwise unknown. |
| Reload after mutation | Multiple mutation handlers call `loadAllData()` | Mutation completion | Full refetch | Broad reloads and state decisions are in `page.tsx`. | Out of L07a scope. |
| Loading and errors | Defaults plus console errors | Async read failure | Stale/default UI state | No explicit loading or typed failure contract. | Non-integrated hooks expose typed lifecycle state. |

## Contracts and Services

`src/services/auth/` contains:

- `AuthRepository`, an injected port for session, athlete identity, and legacy
  role reads.
- `CurrentUserContext`: `unauthenticated`, `athlete`, `archived_athlete`,
  `legacy_coach`, `unknown_role`, `forbidden`, or `error`.
- `createAuthRepository`, which accepts the L06 typed client contract and uses
  targeted `id`, `active`, and `role` selects.

`src/services/athletes/` contains:

- `AthletesRepository`, an injected read-only list port.
- `AthletesLoadResult`: `success`, `empty`, `invalid_data`, `forbidden`, or
  `error`.
- `createAthletesRepository`, which reads only `id`, `name`, `email`, `sport`,
  `active`, and `color`, ordered by `created_at`.
- `loadAthletes`, which preserves database order, partitions active and archived
  rows, rejects invalid runtime data, and never selects an active athlete.

`ReadFailure` maps PostgreSQL `42501` to `forbidden`; other failures remain an
explicit `error`. No service uses exceptions as its normal result channel.

## Hooks

`useCurrentAuthContext` and `useAthletes` are non-integrated hooks. Their
repository dependency is passed by the caller, making them deterministic in
tests and preventing an implicit production client. They expose `idle`,
`loading`, and `resolved` lifecycle state plus explicit `refresh()`. They do no
mutation, persistence, selection, or automatic save, and ignore an in-flight
result after unmount.

## Legacy Comparison for L07b

`compareAthleteReadSnapshots` compares only non-sensitive operational facts:

- active athlete count and identifiers;
- archived identifiers;
- active-list order;
- current user identifier.

It does not log, transmit, or display data. L07a does not call it. If L07b
introduces shadow comparison, observations must remain local, short-lived, and
free of names, email addresses, workout details, or credentials.

## L07b Preconditions

L07b may begin only when all of these are explicitly approved:

1. One read-only, reversible integration point is selected in `page.tsx`.
2. The typed repository is constructed from the existing public client
   configuration without changing authentication or feature flags.
3. The new and legacy reads have matching active IDs, archived IDs, order, and
   current-user classification for an agreed test set, or every divergence has
   a documented business decision.
4. Loading, empty, forbidden, unknown-role, and error UI behavior is specified
   before changing a screen.
5. The old path remains available as an immediate fallback; no mutation is
   moved in the same change.

## Rollback and Limits

L07a has no runtime integration. Its rollback is therefore limited to removing
these unused modules in a future reviewed change. It does not alter the known
legacy role inference, demo defaults, broad reload behavior, or security model.
`user_roles` is used only as an explicit legacy signal for comparison and must
not be treated as the final L05 authorization model.
