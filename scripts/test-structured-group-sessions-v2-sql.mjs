import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-p05f-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/tests/workout-structures-v2-fixture.sql",
  "supabase/migrations/20260908000000_workout_structures_v2.sql",
  "supabase/migrations/20260909000000_structured_workout_library_create_v2.sql",
  "supabase/migrations/20260910000000_structured_calendar_workouts_v2.sql",
  "supabase/migrations/20260911000000_structured_group_sessions_v2.sql",
  "supabase/tests/structured-group-sessions-v2.sql",
];
function run(command, args, input) {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${[result.stdout, result.stderr].filter(Boolean).join("\n")}`);
  return result.stdout;
}
function logs() {
  const result = spawnSync("docker", ["logs", containerName], { encoding: "utf8" });
  return [result.stdout, result.stderr].filter(Boolean).join("\n") || "No container logs available.";
}
try {
  run("docker", ["run", "--detach", "--name", containerName, "--entrypoint", "bash", "--user", "postgres", image, "-lc", "initdb -D /tmp/p05f-postgres >/dev/null && pg_ctl -D /tmp/p05f-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null"]);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (spawnSync("docker", ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", "postgres"], { encoding: "utf8" }).status === 0) break;
    if (attempt === 119) throw new Error(`Isolated PostgreSQL test container did not become ready\n${logs()}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  for (const file of files) {
    const output = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], readFileSync(file, "utf8"));
    if (output.trim()) process.stdout.write(output);
  }
  console.log("Structured Groups V2 SQL migration test passed.");
} finally { spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" }); }
