import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l11-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/migrations/20260716000000_secure_athlete_invites_v2.sql",
  "supabase/tests/athlete-invites-v2.sql",
];

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    stdio: input === undefined ? "pipe" : undefined,
  });
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

function containerLogs() {
  const result = spawnSync("docker", ["logs", containerName], { encoding: "utf8" });
  return [result.stdout, result.stderr].filter(Boolean).join("\n") || "No container logs available.";
}

function executeSqlText(sql) {
  return run(
    "docker",
    ["exec", "-i", "--user", "postgres", containerName, "psql", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    sql,
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

try {
  run("docker", [
    "run", "--detach", "--name", containerName, "--entrypoint", "bash", "--user", "postgres", image,
    "-lc", "initdb -D /tmp/l11-postgres >/dev/null && pg_ctl -D /tmp/l11-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
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
  executeSqlText(`
    insert into auth.users (id, email) values
      ('00000000-0000-0000-0000-000000000016', 'concurrent-a@example.test'),
      ('00000000-0000-0000-0000-000000000017', 'concurrent-b@example.test') on conflict do nothing;
    insert into public.athletes (id, active, email) values
      ('10000000-0000-0000-0000-000000000016', true, 'legacy-concurrent@example.test') on conflict do nothing;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  `);
  const token = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
    select public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000011')->>'token';
  `).trim().split("\n").at(-1);
  const first = executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000016', false);
    select public.consume_athlete_invite_v2('${token}');
    select pg_sleep(0.4);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const second = await executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000017', false);
    select public.consume_athlete_invite_v2('${token}');
    commit;
  `);
  const firstResult = await first;
  if (firstResult.status !== 0 || second.status === 0 || !`${second.stderr}${second.stdout}`.includes('invite_invalid_or_unavailable')) {
    throw new Error('Concurrent invitation consumption did not produce exactly one safe success.');
  }
  const concurrencyProof = run("docker", ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], `
    select json_build_object(
      'consumed_invites', (select count(*) from access_control.athlete_invites where legacy_athlete_id = '10000000-0000-0000-0000-000000000016' and status = 'consumed'),
      'athlete_memberships', (select count(*) from access_control.organization_memberships where user_id in ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000017') and role = 'athlete' and status = 'active'),
      'links', (select count(*) from access_control.legacy_athlete_links where legacy_athlete_id = '10000000-0000-0000-0000-000000000016' and status = 'active'),
      'coach_accesses', (select count(*) from access_control.coach_athlete_access access join access_control.legacy_athlete_links link on link.athlete_membership_id = access.athlete_membership_id where link.legacy_athlete_id = '10000000-0000-0000-0000-000000000016' and access.status = 'active')
    );
  `).trim();
  if (concurrencyProof !== '{"consumed_invites" : 1, "athlete_memberships" : 1, "links" : 1, "coach_accesses" : 1}') throw new Error(`Concurrent consumption left an unexpected durable state: ${concurrencyProof}`);
  console.log("Athlete invites V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}
