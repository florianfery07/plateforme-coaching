# Tests

This directory is the default home for cross-feature and integration-oriented
tests. Co-located unit and component tests may live next to source files under
`src/`.

Use the following naming convention:

- `*.test.ts` for non-DOM unit tests;
- `*.test.tsx` for React component tests;
- `*.spec.ts` or `*.spec.tsx` when a specification-oriented name is clearer.

Vitest runs in `jsdom` and loads `tests/setup.ts`, which enables the
`@testing-library/jest-dom` matchers. Tests must be deterministic: do not use
the production Supabase project, production credentials, or live external
services. Introduce local fixtures, mocks, or an explicitly documented local
Supabase environment in the lot that adds the relevant tests.

Run `npm run test` once or `npm run test:watch` while writing tests.
