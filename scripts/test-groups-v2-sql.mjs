import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l09-${process.pid}`;
const files = [
  "supabase/tests/access-control-v2-bootstrap.sql",
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
  "supabase/tests/access-control-v2-fixtures.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/migrations/20260714010000_groups_v2_foundation.sql",
  "supabase/tests/groups-v2-foundation.sql",
];

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    stdio: input === undefined ? "pipe" : undefined,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\\n");
    throw new Error(`${command} ${args.join(" ")} failed\\n${output}`);
  }

  return result.stdout;
}

function executeSql(file) {
  return run(
    "docker",
    [
      "exec", "-i", "--user", "postgres", containerName, "psql",
      "--set", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres",
    ],
    readFileSync(file, "utf8"),
  );
}

try {
  run("docker", [
    "run", "--detach", "--rm", "--name", containerName, "--entrypoint", "bash",
    "--user", "postgres", image, "bash", "-lc",
    "initdb -D /tmp/l09-postgres >/dev/null && pg_ctl -D /tmp/l09-postgres -o \\\"-c listen_addresses=''\\\" -w start >/dev/null && tail -f /dev/null",
  ]);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = spawnSync(
      "docker",
      ["exec", "--user", "postgres", containerName, "pg_isready", "-U", "postgres", "-d", "postgres"],
      { encoding: "utf8" },
    );
    if (ready.status === 0) break;
    if (attempt === 119) throw new Error("Isolated PostgreSQL test container did not become ready");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  for (const file of files) {
    const output = executeSql(file);
    if (output.trim()) process.stdout.write(output);
  }

  console.log("Groups V2 SQL migration test passed.");
} finally {
  spawnSync("docker", ["stop", containerName], { stdio: "ignore" });
}
