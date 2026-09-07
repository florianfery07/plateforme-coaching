import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-p04-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260715010000_groups_v2_mapping_bridge.sql",
  "supabase/migrations/20260811000000_athlete_lifecycle_v2.sql",
  "supabase/tests/workout-completion-v2-fixture.sql",
  "supabase/migrations/20260826000000_complete_workout_with_feedback_v2.sql",
  "supabase/migrations/20260907000000_athlete_feedback_v2.sql",
  "supabase/tests/athlete-feedback-v2-fixture.sql",
  "supabase/tests/athlete-feedback-v2.sql",
];
const workoutId = "11000000-0000-0000-0000-000000000155";
const athleteUserId = "00000000-0000-0000-0000-000000000001";

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
    "-lc", "initdb -D /tmp/p04-postgres >/dev/null && pg_ctl -D /tmp/p04-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
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

  const draftThenFinal = executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '${athleteUserId}', false);
    select public.save_workout_feedback_draft_v3('${workoutId}', '1h01', 6, 7, 3, 7, 4, 'Concurrent draft');
    select pg_sleep(0.4);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const finalAfterDraft = await executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '${athleteUserId}', false);
    select public.complete_workout_with_feedback_v3('${workoutId}', '1h02', 7, 8, 4, 8, 5, 'Concurrent final');
    commit;
  `);
  const draftThenFinalResult = await draftThenFinal;
  if (draftThenFinalResult.status !== 0 || finalAfterDraft.status !== 0) {
    throw new Error(`Draft/final concurrency failed\n${draftThenFinalResult.stderr}${finalAfterDraft.stderr}`);
  }

  const staleDraft = await executeSqlAsync(`
    begin;
    select set_config('request.jwt.claim.sub', '${athleteUserId}', false);
    select public.save_workout_feedback_draft_v3('${workoutId}', '2h00', 3, 4, 2, 3, 2, 'Stale draft');
    commit;
  `);
  if (staleDraft.status === 0 || !staleDraft.stderr.includes('athlete_feedback_draft_unavailable')) {
    throw new Error(`Finalized feedback accepted a stale draft\n${staleDraft.stderr}`);
  }

  const proof = run(
    "docker",
    ["exec", "-i", "--user", "postgres", containerName, "psql", "-At", "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    `select json_build_object('completed', (select completed from public.calendar_workouts where id = '${workoutId}'), 'feedback_rows', (select count(*) from public.workout_feedbacks where workout_id = '${workoutId}'), 'duration', (select real_duration from public.workout_feedbacks where workout_id = '${workoutId}'));`,
  ).trim();
  if (proof !== '{"completed" : true, "feedback_rows" : 1, "duration" : "1h02"}') {
    throw new Error(`Concurrent feedback left an unexpected state: ${proof}`);
  }

  console.log("Athlete feedback V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}
