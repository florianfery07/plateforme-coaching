# Pilot Typed Auth and Athlete Reads (L07b)

## Scope and safety boundary

L07b connects the L07a typed Auth and athlete-read layer to one pilot-only
decision during session restoration in `src/app/page.tsx`. It does not replace
the legacy Supabase client, `loadAllData()`, athlete selection, mutations,
groups, calendar, goals, statistics, Auth configuration, schema, RLS, RPCs or
remote Supabase configuration.

The pilot is disabled by default. Users without an explicitly enabled feature
flag remain on the exact legacy session path and make no V2 RPC or typed-read
call. No database migration, remote command, data write, policy update or
secret is part of L07b.

## Approaches assessed

### A. Decision logic directly in `page.tsx`

This would put feature eligibility, server context, typed readers, parity
comparison, fallback and diagnostics into a component that already owns broad
application state and legacy mutations. It would be difficult to test and to
roll back safely.

### B. Isolated pilot controller

`src/features/auth-athletes/pilot-read-controller.ts` receives only read
ports and a legacy expectation. It returns either the existing page auth shape
or a typed read decision. `pilot-read-service.ts` builds those read ports from
the L05 and L07a modules. `page.tsx` keeps its legacy calls and asks this one
orchestrator only after it has determined the current legacy role.

**Decision:** approach B. It keeps React state, Supabase construction,
comparison and fallback in separate, reviewable responsibilities.

## Activation contract

The controller selects its V2 decision only when every condition is true:

1. `NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2` is explicitly enabled.
2. A signed-in legacy session exists.
3. `public.get_access_context_v2()` returns a valid, server-derived context.
4. The context has `accountStatus: "active"` and `isPilot: true`.
5. The server context user matches the legacy session user.
6. The L07a typed Auth and athlete reads return valid, usable results.
7. The typed and legacy snapshots agree on current user, active count, active
   identifiers, archived identifiers and active ordering.
8. The typed Auth role is equivalent to the legacy expectation.

The public flag only asks the application to consider the pilot. The L05
server context remains the authorization source for active-account and pilot
eligibility. No client-side condition grants access.

## Comparison and fallback

The legacy shadow snapshot reads only `athletes.id` and `athletes.active`, in
the same `created_at` ascending order as the legacy list. L07a reads its
narrow typed athlete projection. The comparison uses only opaque identifiers,
archive state, order, count and current-user identity in memory; it does not
send, persist or render the comparison.

The following are critical divergences and force legacy immediately:

- different server and legacy users;
- a missing or unexpected athlete;
- an active/archive mismatch;
- a changed active-list order or count;
- an invalid, forbidden or failed typed read;
- an unknown typed role where legacy considers the user a coach;
- an unexpected typed athlete identity.

The fallback is silent for the user and returns the legacy auth state already
expected by the page. The typed path never elevates an `unknown_role` to
coach. When that condition occurs, no V2 state is persisted or displayed; the
pre-existing legacy fallback remains the only active application behavior.

## Current integration and UI states

`restoreSession()` keeps its existing `auth.getSession()` and legacy athlete
lookup. For an active athlete or a legacy coach it invokes the pilot
orchestrator only when the flag is enabled. The output is the existing page
shape: `{ role: "coach" }`, `{ role: "athlete", athleteId }`, or `null`.

| State | L07b behavior |
| --- | --- |
| Flag absent or disabled | Legacy only; no V2 call. |
| V2 loading | Existing session restoration remains in control; no new UI is added. |
| Valid active pilot with parity | The equivalent typed auth decision is accepted; the page receives the same auth shape. |
| Typed list empty | It remains an explicit typed `empty` result; L07b does not invent a selection or overwrite legacy state. |
| Unauthenticated | Existing AuthPage flow remains unchanged; no V2 call. |
| Unknown role, forbidden, malformed data or read error | Immediate silent legacy fallback. |
| Archived athlete | The existing legacy sign-out flow remains untouched; controller tests preserve archive separation without selecting an archived athlete. |

The pilot is intentionally **observation-only for the page athlete list**.
`loadAllData()` still supplies the full legacy athlete objects needed by the
current UI (profile, performance and goals). The L07a list does not yet carry
those fields, so using it as a replacement would risk data loss or changed
rendering. A later approved lot may add a compatible read projection and a
separate list-state pilot.

## Local diagnostic

`reportPilotReadDiagnostic()` emits only in development. It records one of:

- path: `legacy` or `v2`;
- a controlled fallback reason; and
- whether a critical divergence was observed.

It never includes a name, email, identifier, raw Supabase message, training
data, session content, credential or token. There is no external monitoring
service in L07b.

## Localhost procedure

Never version `.env.local` or copy a production secret into documentation.

1. Start with the flag absent, then run `npm run dev`. A signed-in user must
   follow legacy only.
2. To exercise the guard, add this local, untracked value and restart the
   development server:

   ```dotenv
   NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2=enabled
   ```

3. With no active V2 account or pilot assignment, the RPC guard must select
   legacy. Verify the development diagnostic contains only a controlled
   fallback category.
4. A valid pilot requires an already approved L05 deployment, an active V2
   account and a server-side `access_control.pilots` assignment in a controlled
   non-production environment. L07b creates none of these records. Test a
   coach and, where a controlled account exists, an active athlete.
5. To exercise errors, divergence, archived, empty and unknown-role states
   without touching a remote project, run the deterministic controller suite:

   ```bash
   npm run test -- tests/features/pilot-auth-athlete-read.test.ts
   ```

If the L05 schema or pilot mechanism is unavailable in the Supabase project
used by localhost, do not improvise a remote migration or pilot record. The
expected runtime result is a legacy fallback; use the test doubles for the
remaining scenarios.

## Rollback and future criteria

To stop the pilot immediately, remove
`NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2` or set it to `disabled`, then restart
the application. This prevents the V2 client and RPC from being called. The
legacy path remains intact; no data cleanup, migration rollback or remote
configuration change is required.

Before any later athlete-list bascule, require all of the following:

- a typed projection covering every field consumed by the current page;
- confirmed parity over an agreed controlled pilot dataset;
- explicit business treatment for unknown legacy roles;
- a separate UI-state and active-selection compatibility plan;
- verified RLS and server authorization in a non-production environment; and
- a reviewed rollback procedure with the legacy list still available.

## Limits and remaining debt

The legacy coach inference remains outside the typed pilot and is not a V2
authorization decision. The page still performs broad legacy reads and has
independent initial `loadAllData()` and session-restoration effects. L07b does
not remove this debt; it establishes a small, reversible evidence path for a
future approved migration.
