import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l16-${process.pid}`;
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
  "supabase/tests/athlete-goals-v2.sql",
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
    "-lc", "initdb -D /tmp/l16-postgres >/dev/null && pg_ctl -D /tmp/l16-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
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

  const requestId = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    select id from public.athlete_goal_requests_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and status = 'submitted' order by created_at desc limit 1;
  `).trim();
  const first = executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
    select public.accept_athlete_goal_request_v2('${requestId}', null);
    select pg_sleep(0.4);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const second = await executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000023', false);
    select public.accept_athlete_goal_request_v2('${requestId}', null);
    commit;
  `);
  const firstResult = await first;
  if (firstResult.status !== 0 || second.status !== 0) {
    throw new Error(`Concurrent goal review calls failed\n${firstResult.stderr}${second.stderr}`);
  }
  const proof = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    select json_build_object(
      'accepted_requests', (select count(*) from public.athlete_goal_requests_v2 where id = '${requestId}' and status = 'accepted'),
      'accepted_submissions', (select count(*) from public.athlete_goal_versions_v2 where request_id = '${requestId}' and source = 'athlete_submission' and review_outcome = 'accepted'),
      'legacy_goal_unchanged', (select short_goal = 'Legacy court' and medium_goal = 'Legacy moyen' and long_goal = 'Legacy long' from public.athletes where id = '10000000-0000-0000-0000-000000000021')
    );
  `).trim();
  if (proof !== '{"accepted_requests" : 1, "accepted_submissions" : 1, "legacy_goal_unchanged" : true}') {
    throw new Error(`Concurrent goal review left an unexpected durable state: ${proof}`);
  }
  console.log("Athlete goals V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}
