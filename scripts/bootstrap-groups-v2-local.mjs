import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const supabaseDirectory = resolve(root, "supabase");
const configPath = resolve(supabaseDirectory, "config.toml");
const supabase = process.env.SUPABASE_CLI
  ?? (existsSync("/opt/homebrew/bin/supabase") ? "/opt/homebrew/bin/supabase" : "supabase");
const databaseContainer = "supabase_db_plateforme-coaching";
const bootstrapFiles = [
  "supabase/baseline/remote-schema.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/migrations/20260716000000_secure_athlete_invites_v2.sql",
  "supabase/tests/groups-v2-local-fixture.sql",
  "supabase/tests/athlete-invites-v2-local-fixture.sql",
];

function run(command, args, input) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", input });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${[result.error?.message, result.stdout, result.stderr].filter(Boolean).join("\n")}`);
  }
  return result.stdout;
}

function configureLocalStartup() {
  if (!existsSync(configPath)) run(supabase, ["init"]);
  const config = readFileSync(configPath, "utf8");
  const migrationEnabledPattern = /(\[db\.migrations\][\s\S]*?\nenabled = )(true|false)/;
  if (!migrationEnabledPattern.test(config)) {
    throw new Error("Could not locate the local migration configuration.");
  }
  const localOnlyConfig = config.replace(
    migrationEnabledPattern,
    "$1false",
  );
  if (localOnlyConfig !== config) writeFileSync(configPath, localOnlyConfig);
}

function executeSql(path) {
  run(
    "docker",
    ["exec", "-i", databaseContainer, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    readFileSync(resolve(root, path), "utf8"),
  );
}

configureLocalStartup();
run(supabase, ["start"]);
run(supabase, ["db", "reset", "--local", "--no-seed"]);
for (const path of bootstrapFiles) executeSql(path);
run(
  "docker",
  ["exec", "-i", databaseContainer, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
  "notify pgrst, 'reload schema';\n",
);

const verification = run(
  "docker",
  ["exec", databaseContainer, "psql", "-tAc", "select to_regclass('public.athlete_groups') is not null and to_regclass('public.group_sessions_v2') is not null and to_regprocedure('public.resolve_legacy_group_bridge_v2(uuid)') is not null and to_regprocedure('public.consume_athlete_invite_v2(text)') is not null;", "-U", "postgres", "-d", "postgres"],
).trim();
if (verification !== "t") throw new Error("Local Groups V2 bootstrap verification failed.");

console.log("Groups V2 local bootstrap completed. Use only local Supabase status values for the app runtime.");
