# Reliable Weekly Note Autosave Pilot (L08b)

## Scope

L08b pilots reliable autosave for the weekly-review editor in
`src/components/athlete/WeekDetail.tsx`. L14h extends that same existing pilot
to the weekly-note textarea in `src/components/calendar/CalendarPageOld.tsx`.
Both editors write one row in `athlete_week_notes` and reuse the same hook,
service and feature flag.

The legacy `updateWeekNote` in `src/app/page.tsx` remains the fallback whenever
the pilot is disabled. No group, session, feedback, goal, statistics,
invitation, deletion, table, RLS policy, RPC, migration or remote configuration
change is part of this pilot.

## Data Contract

The service accepts `{ athleteId, year, week, note }` and validates that the
identity, year, week and text shape are present. Empty text is valid. It uses
the existing unique key `(athlete_id, year, week)` and performs one explicit
upsert into `athlete_week_notes` with only these write columns:

- `athlete_id`
- `year`
- `week`
- `note`
- `updated_at`

The returned columns are explicitly selected; the service never uses
`select("*")` and never writes another relation. The schema snapshot confirms
the unique key, but does not export a foreign key from this table to athletes.

## Pilot Gate And Fallback

The V2 path requires both conditions:

1. `NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2=enabled`;
2. `NODE_ENV=development`.

The public flag only selects a local development path. It is not an
authorization boundary and L08b intentionally does not enable a remote pilot.
With the flag absent, invalid, disabled, or outside local development, both
weekly-note editors use their unchanged legacy upsert path. A single edit
chooses either legacy or V2; it never dual-writes.

To return immediately to legacy behavior, remove the variable or set it to
`disabled`, then restart the Next.js development server. Do not commit
`.env.local`.

## Reliability Behavior

The pilot composes the L08a mutation foundation with:

- a **500 ms debounce**: 300 ms is too sensitive to natural pauses, while
  800 ms delays useful feedback;
- a resource key based on athlete, year and week;
- `serial` execution and `latestWins` local outcomes;
- a blur `flush()` and cancellation at unmount or resource change;
- a 10-second local timeout;
- at most one automatic retry, only for a typed `network` error after 500 ms.

There is no automatic retry for timeout, permission, validation or conflict.
Timeout and cancellation are local observations, not proof that PostgreSQL did
not process an upsert. L08a keeps the resource key locked until an in-flight
operation actually settles.

## UI, Rollback And Reconciliation

In the local pilot only, each supported textarea can show `Enregistrement...`,
`Enregistre`, or `Echec de l'enregistrement` with an accessible retry action.
No provider error, SQL code, payload, athlete identifier or note text is shown.

The textarea updates its local draft immediately. It deliberately does not
roll back to an older note after a failure: that would discard useful text. The
draft remains visible, the hook retains it for manual retry, and a successful
typed response confirms the persisted value. Obsolete and cancelled outcomes
do not replace the current draft or show an error.

Development diagnostics record only the path (`legacy` or `v2`), lifecycle
event, typed error kind and retry count. They never record a note, user name,
email, identifier or provider error.

## Localhost Procedure

1. Keep the flag absent and start `npm run dev`; edit either weekly-note field.
   The legacy path must remain active and show no V2 status text.
2. In the untracked local `.env.local`, set:

   ```dotenv
   NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2=enabled
   ```

3. Restart the development server. In either supported weekly-note editor, test
   a slow edit, rapid typing, blur, a forced offline error, manual retry,
   changing athlete or week during a save, and a reload after a confirmed save.
4. Remove the variable or set it to `disabled`, restart, and confirm the
   legacy path resumes immediately.

No remote save was attempted while implementing L08b: automated tests use an
injected repository or service, and the localhost check made only a server-side
`HEAD /` request. Any future real local pilot must use an approved pilot account
and note, record the prior value, and restore it if the test changes it.

The L08b build command was attempted after the implementation. Its recorded
failure was limited to the sandbox being unable to download the existing Google
`Geist` font assets; L08b does not change fonts or work around that environment
restriction.

The local development server was started on port `3001` and `HEAD /` returned
`200 OK`. No browser interaction, authentication or save was performed. The
development output also reported an existing Tailwind resolution attempt toward
an unrelated local path outside this checkout; L08b does not alter dependencies
or resolve that environment anomaly.

## Limits And Generalization

This pilot does not fix the existing permissive RLS baseline, cross-tab races,
authorization, remote cancellation, transactions or referential integrity.
Those need dedicated security or server-side work. Do not generalize this
pattern to deletions, invitations, feedback, groups, sessions or multi-table
flows without a separate design and test plan.

## L14h Measurement

On the isolated local fixture, entering 12 characters in the legacy calendar
editor produced 12 writes, 12 network requests, no reads, no `loadAllData`, and
1,626 request bytes. The enabled L14h pilot produced one confirmed upsert, one
network request, no reads, no `loadAllData`, and 287 bytes including its selected
confirmation row. This is an 11-write and 11-request reduction for the same
input; the fixture row is deleted after each measurement.

Another mutation is eligible only after it has one clear resource key, one
write relation, safe error/reconciliation behavior, a disabled-by-default
fallback, and deterministic tests for both paths.
