import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-p03-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/migrations/20260811000000_athlete_lifecycle_v2.sql",
  "supabase/migrations/20260830000000_athlete_goals_v2_foundation.sql",
  "supabase/migrations/20260830010000_athlete_goals_v2_state_read.sql",
  "supabase/tests/athlete-goals-v2-fixture.sql",
  "supabase/tests/pilotage-timeline-v2-fixture.sql",
  "supabase/migrations/20260906000000_coach_pilotage_timeline_v2.sql",
  "supabase/tests/pilotage-timeline-v2.sql",
];

function run(command, args, input) {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }
  return result.stdout;
}

function logs() {
  const result = spawnSync("docker", ["logs", containerName], { encoding: "utf8" });
  return [result.stdout, result.stderr].filter(Boolean).join("\n") || "No container logs available.";
}

function execute(file) {
  const output = run(
    "docker",
    ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    readFileSync(file, "utf8"),
  );
  if (output.trim()) process.stdout.write(output);
}

try {
  run("docker", [
    "run", "--detach", "--name", containerName, "--entrypoint", "bash", "--user", "postgres", image,
    "-lc", "initdb -D /tmp/p03-postgres >/dev/null && pg_ctl -D /tmp/p03-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
  ]);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = spawnSync("docker", ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", "postgres"], { encoding: "utf8" });
    if (ready.status === 0) break;
    if (attempt === 119) throw new Error(`Isolated PostgreSQL test container did not become ready\n${logs()}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  for (const file of files) execute(file);
  console.log("Pilotage timeline V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}
