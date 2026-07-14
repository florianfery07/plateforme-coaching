# Feature Flags

## Purpose

Feature flags let MyRidePlan introduce a replacement module next to a legacy
module, validate it progressively, and immediately return to the legacy path.
They are a deployment-control mechanism, not a product setting for end users.

The legacy behavior is always the default. A new path must remain disabled
until its flag is explicitly enabled for a controlled development or pilot
environment.

## Current Registry

The registry is defined in `src/lib/features/flags.ts`.

| Flag | Environment variable | Default | Stage | Purpose |
| --- | --- | --- | --- | --- |
| `groupsV2` | `NEXT_PUBLIC_FEATURE_GROUPS_V2` | `false` | `experimental` | Future replacement for groups. |
| `accessControlV2` | `NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2` | `false` | `pilot` | Pilot-only typed Auth and athlete-read verification beside legacy. |
| `reliableMutationsV2` | `NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2` | `false` | `experimental` | Future replacement for mutation reliability flows. |

`accessControlV2` is consumed only by the L07b session-restoration pilot. It
does not grant authorization and remains disabled by default. A flag-enabled
user stays on legacy unless the server returns an active V2 account with an
active pilot assignment and the typed reads match the legacy snapshot.

## Using a Flag

Import the typed API from `src/lib/features`:

```ts
import { isFeatureEnabled } from "@/lib/features";

if (isFeatureEnabled("groupsV2")) {
  // Use the isolated V2 path when that future lot explicitly adds it.
} else {
  // Preserve the existing legacy path.
}
```

Only declared flag keys are accepted by TypeScript. An invalid value received
at runtime is not considered enabled.

Add a flag to the central registry before using it. Its definition must include
a public environment-variable name, default value, stage, owner, purpose, and
removal condition. Use a domain-oriented camelCase key ending in `V2` only
when it represents an explicit successor to a legacy module.

## Local Activation and Rollback

Do not commit `.env.local`. To enable a flag locally, add one explicit value:

```dotenv
NEXT_PUBLIC_FEATURE_GROUPS_V2=enabled
```

Recognized enabled values are `true`, `1`, `on`, and `enabled`. Recognized
disabled values are `false`, `0`, `off`, and `disabled`, without regard to
case or surrounding whitespace. An absent or invalid value falls back to the
registry default.

Restart the Next.js development server after changing a `NEXT_PUBLIC_*`
variable. To return immediately to legacy behavior, remove the variable or set
it to an explicit disabled value, then restart the server.

Before a pilot, test both paths with the flag absent and explicitly enabled.
Start with a narrow, approved pilot environment. Keep the legacy path intact
until the replacement has its own functional, security, and migration evidence.

## Security Boundary

Feature flags are not authorization. `NEXT_PUBLIC_*` values can be inspected
and modified by a browser user, so they must never be used as the only guard
for data access, sensitive actions, roles, permissions, RLS policies, or server
validation. A feature must remain secure when its public flag is enabled,
disabled, or manipulated.

Flags contain no credentials, secrets, or personal data. They do not query
Supabase and cannot change remote configuration.

## Flag Lifecycle

1. Declare the flag disabled by default with its owner and removal condition.
2. Develop the new path beside the legacy path in a dedicated lot.
3. Test both paths with deterministic tests and a controlled pilot.
4. Roll out only after the new path has the required product, security, and
   operational validation.
5. Remove the flag and legacy path together in an approved cleanup lot once
   rollout is complete.

Avoid permanent flags, untracked environment variables, and string literals
outside the registry. Update this document whenever the registry changes.
