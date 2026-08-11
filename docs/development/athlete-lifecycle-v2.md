# Athlete Lifecycle V2 Pilot

## Scope

L12 replaces the destructive legacy athlete deletion only for an approved V2
pilot. The pilot archives an athlete by setting `public.athletes.active` to
`false` through an atomic RPC and appends an audit event. It does not delete an
athlete, calendar row, feedback, group membership, history, or any other
dependent legacy record.

The legacy path remains unchanged whenever either public feature flag is
disabled or the current user is not an active V2 pilot.

## Local Activation

Use an isolated local Supabase stack and set both variables before starting
Next.js:

```dotenv
NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2=enabled
NEXT_PUBLIC_FEATURE_ATHLETE_LIFECYCLE_V2=enabled
```

The database remains authoritative: the RPC also requires an authenticated,
active account, an active pilot assignment, one explicit active legacy-athlete
mapping, and server-derived coach-athlete management access.

## Verification

For the browser pilot, reuse the existing local bootstrap. It applies the
historical baseline and all additive V2 migrations in an explicit local-only
order, including L12, then loads synthetic L10 coach and athlete data:

```sh
npm run local:groups-v2:bootstrap
```

Start the application only with CLI-emitted local variables, then enable both
flags for this local process:

```sh
eval "$(/opt/homebrew/bin/supabase status --output env)"
NEXT_PUBLIC_SUPABASE_URL="$API_URL" \\
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \\
NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2=enabled \\
NEXT_PUBLIC_FEATURE_ATHLETE_LIFECYCLE_V2=enabled \\
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Sign in with `l10-coach@example.test` and the synthetic local password from
`supabase/tests/groups-v2-local-fixture.sql`, archive `L10 Athlete One` from
the existing management screen, then restore it. The SQL proof below confirms
the atomic transition, audit event, idempotence, authorization, and unchanged
dependent rows without contacting a remote project.

Run the isolated SQL proof:

```sh
npm run test:athlete-lifecycle-v2:sql
```

It covers RLS, RPC privileges, authorization, mapping and organization guards,
idempotence, concurrent archive requests, restoration, and preservation of
dependent legacy data.

## Rollback

Set either flag to an explicit disabled value and restart Next.js. This returns
new interactions to the unchanged legacy path. An athlete already archived by
the pilot remains archived because that is a deliberate business-state change;
restore it through the approved V2 pilot while enabled.

Do not deploy this migration with `db push`, `db reset`, or `--linked` during
local validation. Production rollout requires the separate approved migration
procedure and a tested backup.
