# Supabase baseline operations

## Purpose

L01 establishes the repository layout and captures the actual `public` schema
without changing the MyRidePlan application or the remote Supabase project.
The baseline is a **schema-only, read-only export** of the remote state before
the first repository-managed migration. Its digest and scope are recorded in
`supabase/baseline/manifest.json`.

## Three different artefacts

| Artefact | Location | Meaning | May be deployed? |
| --- | --- | --- | --- |
| Historical baseline | `supabase/baseline/` | Immutable schema-only DDL describing the remote state before repository-managed migrations. | No. |
| Future migration | `supabase/migrations/` | One additive, reviewed change created after the baseline. | Only through a separately approved deployment procedure. |
| Verification snapshot | `supabase/snapshots/` | Read-only evidence used to compare a remote schema with the baseline plus migrations. | No. |

Never place an export, a snapshot, or a file named `baseline`, `legacy`, or
`remote_schema` in `supabase/migrations/`. The layout checker rejects this.

## Capture record

An authorised operator linked the local project and ran this read-only command:

```sh
npx supabase db dump --linked --schema public --file supabase/baseline/remote-schema.sql
```

The local linkage metadata created by the CLI lives under `supabase/.temp/` and
is ignored by Git. Do not inspect, commit, or share it.

The baseline dump contains the raw line endings emitted by the CLI. Its
`.gitattributes` rule disables text normalization and whitespace checking for
that one file so the committed bytes retain the recorded SHA-256.

## Future read-only verification

When a future comparison is needed, an authorised operator may make a temporary
schema-only export outside Git:

```sh
supabase db dump --linked --schema public --file /tmp/myrideplan-schema-check.sql
diff -u supabase/baseline/remote-schema.sql /tmp/myrideplan-schema-check.sql
rm /tmp/myrideplan-schema-check.sql
```

Do **not** run `supabase db pull` for L01: depending on the CLI workflow it can
offer to repair remote migration history. Do not use
`supabase db push`, `supabase db reset --linked`, `supabase migration repair`,
or `supabase config push` without a separate, explicit deployment approval.

## Future migration procedure

1. Start from a reviewed captured baseline and a clean Git worktree.
2. Create one additive migration in `supabase/migrations/` using the naming
   format `YYYYMMDDHHMMSS_descriptive_slug.sql`.
3. Document compatibility, backfill, validation query, rollback or mitigation,
   and the feature flag/cutover plan.
4. Test against an isolated Supabase environment with fictitious data.
5. Obtain a verified, encrypted backup through the approved operations process.
   Do not create or commit a production data dump by default.
6. Record before/after row counts and integrity checks outside Git when they
   contain sensitive operational data.
7. Request a separate deployment mission. This repository documentation never
   authorises a remote migration.

## Types for L06

L01 does not change application types or remove `@ts-nocheck`. Once the
baseline is reviewed, L06 may
generate a reference file without changing runtime behaviour:

```sh
supabase gen types typescript --linked --schema public > supabase/baseline/database.generated.ts
```

The generated file must be reviewed for sensitive comments or names before it
is committed. It remains a reference until L06 deliberately integrates it into
the application.

## Local controls

Run these controls after any L01 documentation or layout change:

```sh
node supabase/verify-baseline-layout.mjs
git diff --check
git status --short
```

Build and application lint are not required for L01 because this lot does not
touch application sources, dependencies, or runtime configuration. The
repository's existing lint failures must not be reinterpreted as L01 failures.

## Recovery

If a local capture is incorrect before commit, delete only the uncommitted local
export, restore the manifest to `PENDING_READ_ONLY_EXPORT`, and repeat the
read-only capture after confirming the linked project. Never attempt to fix an
incorrect baseline by pushing it to the remote database.
