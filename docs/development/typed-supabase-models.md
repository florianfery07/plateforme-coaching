# Typed Supabase Models (L06)

## Scope

L06 adds a reproducible type foundation without changing MyRidePlan's runtime
behavior. The legacy Supabase client in `src/lib/supabase.ts` and all current
application callers remain unchanged. `accessControlV2` remains disabled by
default and is not connected to `src/app/page.tsx`.

## Two type layers

`src/types/database.ts` is generated SQL-bound infrastructure. It describes
the controlled `public` baseline plus the L05 `access_control` schema with
tables, views, functions, enums, composite types, and foreign-key metadata.
Do not edit it manually.

The generated `Row`, `Insert`, and `Update` contracts preserve SQL nullability.
PostgreSQL RPC overloads are represented as exact alternative `Args` object
types; they are never widened into one all-optional argument object.

`src/types/domain/` is a small application-facing layer. It exposes stable,
readable summaries and adapters for athletes, workouts, feedback, groups, and
the V2 access context. Domain models deliberately hide most persistence fields
and preserve nullability rather than inventing defaults.

The current legacy source has no reliable coach table or server role source, so
`CoachSummary` has no row adapter. Assigning a coach from the absence of an
athlete row would repeat the authorization flaw identified in L04/L05.

## Typing inventory by domain

| Domain | L06 coverage | Deferred work |
| --- | --- | --- |
| Auth | `AuthenticatedUser` model; existing client remains untyped. | Typed session restoration and server role integration. |
| Athletes | Generated `athletes` row and `AthleteSummary` mapper. | Legacy profile form and mutation migration. |
| Workouts | Generated `calendar_workouts` row and `WorkoutSummary` mapper. | Calendar query adoption. |
| Feedbacks | Generated `workout_feedbacks` row and narrow mapper. | Legacy feedback mutations. |
| Groups | Generated group rows and `GroupSummary` mapper. | Group membership services and authorization transition. |
| Goals | Generated legacy goal-history row, V2 workflow/version rows and typed Goal V2 RPCs. | L16c will adopt the bounded `src/services/goals-v2/` domain for one explicit pilot only. |
| Observations | Generated observation row. | No domain model yet. |
| Tests | Generated test-history row. | No domain model yet. |
| Statistics | Generated source rows only. | Derived calculation contracts remain legacy. |
| Invitations | Generated `link_athlete_invite` RPC signature. | No adoption while the legacy security boundary remains unchanged. |
| Access control V2 | Generated six L05 tables and callable helpers; `AccessContextV2` reuses the existing strict parser. | Pilot-only read-path integration in L07. |

The baseline contains 19 `public` tables. L05 contributes six
`access_control` tables. L06 therefore generates 25 table contracts, ten
callable application functions, no views, no PostgreSQL enums, and no composite
types. Trigger functions and local extension functions are intentionally not
exposed as RPC contracts.

## Controlled generation

The source of truth is local and versioned:

1. `supabase/baseline/remote-schema.sql`, whose SHA-256 is recorded in
   `supabase/baseline/manifest.json`.
2. `supabase/migrations/20260714000000_access_control_v2_foundation.sql`.

Run:

```bash
npm run generate:types
```

The script starts a disposable PostgreSQL Docker container, creates only the
minimal local Auth contract needed by the DDL, applies the baseline and L05
migration, introspects `public` and `access_control`, writes
`src/types/database.ts`, then removes the container. It does not use Supabase
credentials, the linked project, network database access, `db push`, `db
reset`, or a remote migration.

Verify that the committed generated file matches the sources with:

```bash
npm run generate:types:check
```

After an approved future migration, update the controlled local source first,
run generation, inspect the generated diff, run typecheck and tests, then
commit the migration and generated output together. Never patch generated
types to mask a schema mismatch.

## Typed client strategy

`src/lib/supabase-typed.ts` exports `createTypedSupabaseClient`. It is a new,
isolated factory using `createClient<Database>()`; it does not replace the
legacy singleton. L07 may adopt it for one pilot-only read path after the V2
migration has been approved and deployed. L06 does not modify any existing
query or user flow.

## Typing debt strategy

L06 records a baseline of **48** `@ts-nocheck` source files and **0** explicit
`any` occurrences in `src` on 2026-07-14. This is a measurement, not an
approval of the current state.

No new `@ts-nocheck` may be added. New code must avoid `any`; an unavoidable
boundary starts as `unknown` and must be narrowed locally. Existing files are
removed from `@ts-nocheck` only when their direct dependencies, fixtures, and
targeted tests are ready.

Suggested removal order:

1. Isolated `src/lib` helpers and API modules after their database rows have
   dedicated adapters.
2. Small leaf components with stable props.
3. Feature slices: athlete profile, library, calendar, then groups.
4. `src/app/page.tsx` only after its services and state model are separated in
   later lots.

A file is considered typed only when it has no `@ts-nocheck`, no unjustified
`any`, explicit input/output types at Supabase boundaries, and its targeted
tests and lint rules pass.

## Naming conventions

- `*Row` means a generated database `Row` type.
- `*Summary` means a narrow UI/domain projection.
- `map*RowTo*` maps a trusted database row without changing values.
- `AccessContextV2` is server-derived and must not become a client-side
  authorization decision.
- SQL columns retain `snake_case`; domain fields are only renamed when doing
  so removes a real application concern.

## Dependencies

- **L07:** consume `createTypedSupabaseClient` in a single pilot-only V2 read
  path and preserve the legacy fallback.
- **L08:** use the row aliases and narrow adapters when extracting the first
  legacy service boundary, beginning with a small read-only domain rather than
  `page.tsx`.
