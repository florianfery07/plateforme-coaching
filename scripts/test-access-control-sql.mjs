import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l05-${process.pid}`;
const database = "postgres";
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/scripts/access-control-v2-backfill.sql",
  "supabase/scripts/access-control-v2-backfill.sql",
  "supabase/tests/access-control-v2-foundation.sql",
  "supabase/scripts/access-control-v2-verify.sql",
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
  const sql = readFileSync(file, "utf8");
  return run(
    "docker",
    [
      "exec",
      "-i",
      "--user",
      "postgres",
      containerName,
      "psql",
      "--set",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      database,
    ],
    sql,
  );
}

try {
  run("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--entrypoint",
    "bash",
    "--user",
    "postgres",
    image,
    "bash",
    "-lc",
    "initdb -D /tmp/l05-postgres >/dev/null && pg_ctl -D /tmp/l05-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
  ]);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = spawnSync(
      "docker",
      ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", database],
      { encoding: "utf8" },
    );

    if (ready.status === 0) {
      break;
    }

    if (attempt === 119) {
      throw new Error("Isolated PostgreSQL test container did not become ready");
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  for (const file of files) {
    const output = executeSql(file);
    if (output.trim()) {
      process.stdout.write(output);
    }
  }

  console.log("Access-control V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["stop", containerName], { stdio: "ignore" });
}
