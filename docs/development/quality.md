# Quality Infrastructure

## Scope

This document defines the L02 quality foundation. It adds verification tooling
only; it does not change application behavior, business rules, visual output,
Supabase resources, or remote configuration.

The canonical Node.js runtime for CI is Node.js `20.19.0`. Local contributors
should use Node.js `20.19.0` or a newer supported runtime compatible with the
installed dependencies.

## Commands

| Command | Purpose | Owner | Expected L02 baseline |
| --- | --- | --- | --- |
| `npm run lint` | Run the existing ESLint configuration. | Developers | Currently fails on pre-existing lint findings; L02 deliberately does not suppress or fix them. |
| `npm run typecheck` | Check TypeScript without emitting files. | Developers | Passes at the L02 baseline, while existing `@ts-nocheck` files remain a known limitation. |
| `npm run test` | Run the Vitest test suite once. | QA | Passes when no tests exist, so the test structure can be introduced incrementally. |
| `npm run test:watch` | Run Vitest interactively. | Developers / QA | For local test authoring. |
| `npm run build` | Produce a production Next.js build. | DevOps | Must be evaluated in an environment able to fetch any build-time external assets. |
| `npm run check` | Run lint, typecheck, tests, and build in that order. | CI / DevOps | Executes every control even when an earlier control fails, then returns a non-zero status if any failed. |

`npm run check` is the single local and CI entry point. It never converts a
known failure into a success and never stops at lint, so it leaves evidence for
all controls in one run.

## Test Structure

Vitest is configured by `vitest.config.ts` with a `jsdom` environment for
React-facing tests. The setup file loads `@testing-library/jest-dom` matchers.

- Put cross-feature or integration-oriented tests in `tests/`.
- Put focused unit or component tests next to the source under `src/`.
- Use `*.test.ts(x)` or `*.spec.ts(x)` names so Vitest discovers them.
- Keep tests deterministic. Do not call the production Supabase project or
  live third-party services from the test suite.

No business test is introduced in L02. Test coverage belongs to later lots,
where fixtures and mocks can be selected with the affected module.

## Continuous Integration

`.github/workflows/quality.yml` runs on pushes, pull requests, and manual
dispatches. It has only `contents: read` permission, uses `npm ci` from the
lockfile, and invokes exactly `npm run check`.

The workflow intentionally reports the current lint debt as a failing check.
This is visibility, not a lint-cleanup initiative. Do not weaken the workflow,
add broad ignores, or use `|| true` to make a red control appear green.

## Register of Controls

| Control | Trigger | Evidence | Blocking rule | L02 status |
| --- | --- | --- | --- | --- |
| Dependency reproducibility | CI | Successful `npm ci` | Blocks CI when the lockfile is inconsistent. | Active |
| Static analysis | `npm run lint` | ESLint output | Blocks CI on findings. Existing findings remain visible. | Active, known failing baseline |
| Type safety | `npm run typecheck` | TypeScript output | Blocks CI on compiler errors. | Active |
| Automated tests | `npm run test` | Vitest output | Blocks CI when discovered tests fail. | Active, empty-suite tolerant |
| Production build | `npm run build` | Next.js build output | Blocks CI when the build fails. | Active |
| Aggregate quality gate | `npm run check` | Combined output and exit code | Blocks CI when any constituent control fails. | Active |

## Adding a Future Control

1. Add the narrow command to `package.json`.
2. Add it to `scripts/quality-checks.mjs` in the intended execution order.
3. Document its owner, evidence, and blocking rule in this register.
4. Run `npm run check` locally and retain the outcome in the lot report.
5. Do not add credentials, production data, remote mutations, or application
   behavior to a generic quality control.

## Operational Rules

- Keep CI secrets out of this workflow unless a later approved lot has a
  documented, minimal-use case.
- Do not make a failing control green by disabling its checks.
- Do not use the production Supabase project for tests.
- Treat existing lint errors and `@ts-nocheck` usage as tracked technical debt;
  resolve them in a dedicated, reviewed lot rather than opportunistically.
- Before changing quality tooling, run `npm run check` and `git diff --check`.
