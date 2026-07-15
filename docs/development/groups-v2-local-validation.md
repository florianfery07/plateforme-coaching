# Local Groups V2 pilot validation

This procedure builds an isolated local Supabase state for validating the
Groups V2 scheduling pilot. It does not use `.env.local`, does not link to a
remote Supabase project, and never deploys a migration.

## Bootstrap order

Run:

```sh
npm run local:groups-v2:bootstrap
```

The command creates only ignored local CLI configuration when required,
disables automatic CLI migrations locally, then applies this explicit order to
the Docker PostgreSQL container:

1. `supabase/baseline/remote-schema.sql` (historical legacy schema);
2. L05 Access Control V2 migration;
3. L09 Groups V2 migration;
4. L09bis legacy-to-Groups V2 bridge migration;
5. `supabase/tests/groups-v2-local-fixture.sql` (synthetic local data).

The baseline remains outside `supabase/migrations/`: it is historical DDL,
not a deployable migration. Re-running the bootstrap resets the local database
and reapplies the same deterministic inputs.

## Run the application locally

Start MyRidePlan with values emitted by the local CLI only:

```sh
eval "$(/opt/homebrew/bin/supabase status --output env)"
NEXT_PUBLIC_SUPABASE_URL="$API_URL" \\
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \\
NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2=enabled \\
NEXT_PUBLIC_FEATURE_GROUPS_V2=enabled \\
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Use the synthetic fixture accounts only. Do not copy remote variables into
this shell. Validate the Groups V2 pilot, then repeat after removing the two
feature-flag assignments to confirm immediate legacy fallback.

## Stop and clean up

Stop the development server, then run:

```sh
/opt/homebrew/bin/supabase stop --no-backup
```

This removes the local containers without changing any remote resource. The
next bootstrap recreates the isolated state from the checked-in baseline,
migrations, and synthetic fixture.

## Prohibited commands

Never use `supabase db push`, `supabase db reset --linked`, `--linked`, or
remote credentials for this validation. Do not put the baseline in the normal
migration history.
