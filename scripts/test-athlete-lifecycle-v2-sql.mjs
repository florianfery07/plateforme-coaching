import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l12-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/migrations/20260811000000_athlete_lifecycle_v2.sql",
  "supabase/tests/athlete-lifecycle-v2-fixture.sql",
  "supabase/tests/athlete-lifecycle-v2.sql",
];

function run(command, args, input) {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }
  return result.stdout;
}

function executeSql(file) {
  return run(
    "docker",
    ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    readFileSync(file, "utf8"),
  );
}

function executeSqlAsync(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"]);
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stderr, stdout }));
    child.stdin.end(sql);
  });
}

function containerLogs() {
  const result = spawnSync("docker", ["logs", containerName], { encoding: "utf8" });
  return [result.stdout, result.stderr].filter(Boolean).join("\n") || "No container logs available.";
}

try {
  run("docker", [
    "run", "--detach", "--name", containerName, "--entrypoint", "bash", "--user", "postgres", image,
    "-lc", "initdb -D /tmp/l12-postgres >/dev/null && pg_ctl -D /tmp/l12-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
  ]);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = spawnSync("docker", ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", "postgres"], { encoding: "utf8" });
    if (ready.status === 0) break;
    if (attempt === 119) throw new Error(`Isolated PostgreSQL test container did not become ready\n${containerLogs()}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  for (const file of files) {
    const output = executeSql(file);
    if (output.trim()) process.stdout.write(output);
  }

  run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    delete from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021';
    update public.athletes set active = true where id = '10000000-0000-0000-0000-000000000021';
  `);
  const first = executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
    select public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
    select pg_sleep(0.4);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const second = await executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
    select public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
    commit;
  `);
  const firstResult = await first;
  if (firstResult.status !== 0 || second.status !== 0) {
    throw new Error(`Concurrent archive calls failed\n${firstResult.stderr}${second.stderr}`);
  }
  const proof = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    select json_build_object(
      'active', (select active from public.athletes where id = '10000000-0000-0000-0000-000000000021'),
      'archive_events', (select count(*) from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and event_type = 'archived'),
      'dependent_rows', (select count(*) from public.calendar_workouts where athlete_id = '10000000-0000-0000-0000-000000000021')
    );
  `).trim();
  if (proof !== '{"active" : false, "archive_events" : 1, "dependent_rows" : 1}') {
    throw new Error(`Concurrent archive left an unexpected state: ${proof}`);
  }
  console.log("Athlete lifecycle V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}
