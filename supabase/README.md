# Supabase local layout

This directory records future, additive Supabase changes for MyRidePlan. Its
versioned content does not contain credentials, production data, or a
linked-project reference. The ignored `.temp/` directory is local Supabase CLI
metadata and is intentionally not part of the repository.

## Directory contract

- `baseline/` holds the immutable, read-only DDL export that describes the
  pre-migration remote state. It is deliberately outside `migrations/`.
- `migrations/` holds only additive changes created after the baseline is
  captured. Each migration is future deployment input, never proof that it has
  been applied remotely.
- `snapshots/` holds verification exports and manifests. A snapshot is evidence
  of a comparison; it is never an executable migration.
- `verify-baseline-layout.mjs` checks that the local layout still respects this
  separation. It never contacts Supabase or writes files.

The public-schema baseline was captured with a schema-only, read-only export.
Its file name, SHA-256 digest, scope, and capture record are in
`baseline/manifest.json`. See `../docs/supabase/baseline-operations.md` before
adding any SQL file.

`baseline/remote-schema.sql` is preserved byte-for-byte by `.gitattributes` so
its recorded SHA-256 remains stable. Do not reformat or normalize that file.

## Safety rules

1. Never put a baseline or a remote export in `migrations/`.
2. Never run `supabase db push`, `supabase db reset --linked`,
   `supabase migration repair`, or `supabase config push` without a separately
   approved change mission.
3. Never commit `.env` files, Supabase CLI `.temp/` metadata, database
   passwords, access tokens, service-role keys, backups containing data, or
   production URLs.
4. Do not add a migration until the captured baseline, its SHA-256 digest, and
   the expected remote migration history are reviewed.

Run the local structural check with:

```sh
node supabase/verify-baseline-layout.mjs
```
