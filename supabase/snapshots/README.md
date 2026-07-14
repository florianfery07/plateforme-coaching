# Verification snapshots

Snapshots are read-only comparison artefacts. They are not migrations and must
never be copied into `../migrations/`.

After the baseline is captured, a snapshot may contain a schema-only export, a
SHA-256 digest, the capture timestamp, and the commands used. It must not
contain application data, credentials, database passwords, access tokens, or a
production URL.

No verification snapshot exists yet. The immutable baseline is
`../baseline/remote-schema.sql`; a future snapshot compares a fresh, temporary
schema-only export to that baseline without changing the remote project.
