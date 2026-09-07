import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-p05c-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/tests/workout-structures-v2-fixture.sql",
  "supabase/migrations/20260908000000_workout_structures_v2.sql",
  "supabase/migrations/20260909000000_structured_workout_library_create_v2.sql",
  "supabase/tests/workout-structures-v2.sql",
  "supabase/tests/structured-workout-library-v2.sql",
];
function run(command, args, input) { const result = spawnSync(command, args, { encoding: "utf8", input }); if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${[result.stdout, result.stderr].filter(Boolean).join("\n")}`); return result.stdout; }
function logs() { const result = spawnSync("docker", ["logs", containerName], { encoding: "utf8" }); return [result.stdout, result.stderr].filter(Boolean).join("\n") || "No container logs available."; }
function executeSqlAsync(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"]);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stderr }));
    child.stdin.end(sql);
  });
}
try {
  run("docker", ["run", "--detach", "--name", containerName, "--entrypoint", "bash", "--user", "postgres", image, "-lc", "initdb -D /tmp/p05-postgres >/dev/null && pg_ctl -D /tmp/p05-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null"]);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (spawnSync("docker", ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", "postgres"], { encoding: "utf8" }).status === 0) break;
    if (attempt === 119) throw new Error(`Isolated PostgreSQL test container did not become ready\n${logs()}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  for (const file of files) {
    const output = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], readFileSync(file, "utf8"));
    if (output.trim()) process.stdout.write(output);
  }
  const first = executeSqlAsync(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false); select public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"concurrent-a","kind":"free","durationSeconds":60,"isSpecific":false}]}', 2, '80000000-0000-0000-0000-000000000312'); select pg_sleep(0.3); commit;`);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const second = await executeSqlAsync(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false); select public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"concurrent-b","kind":"free","durationSeconds":120,"isSpecific":false}]}', 2, '80000000-0000-0000-0000-000000000313'); commit;`);
  const firstResult = await first;
  if (firstResult.status !== 0 || second.status === 0 || !second.stderr.includes("workout_structure_revision_conflict")) {
    throw new Error(`Concurrent library revisions did not preserve one current revision\n${firstResult.stderr}${second.stderr}`);
  }
  const currentCount = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], "select count(*) from public.workout_structures_v2 where library_workout_id = '70000000-0000-0000-0000-000000000301' and is_current;").trim();
  if (currentCount !== "1") throw new Error(`Concurrent library revisions left ${currentCount} current rows.`);
  console.log("Workout structures V2 SQL migration test passed.");
} finally { spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" }); }
