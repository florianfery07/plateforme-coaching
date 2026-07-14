import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  ["lint", ["run", "lint"]],
  ["typecheck", ["run", "typecheck"]],
  ["test", ["run", "test"]],
  ["build", ["run", "build"]],
];

const failures = [];

for (const [name, args] of checks) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(npmCommand, args, { stdio: "inherit" });

  if (result.error || result.status !== 0) {
    failures.push(name);
  }
}

if (failures.length > 0) {
  console.error(`\nQuality checks failed: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nAll quality checks passed.");
}
