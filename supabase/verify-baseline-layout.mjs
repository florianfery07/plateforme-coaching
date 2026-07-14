import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const supabaseDir = join(root, "supabase");
const requiredDirectories = ["baseline", "migrations", "snapshots"];
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name === ".temp") return [];
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (!existsSync(supabaseDir)) {
  fail("Missing supabase directory.");
} else {
  for (const directory of requiredDirectories) {
    if (!existsSync(join(supabaseDir, directory))) {
      fail(`Missing supabase/${directory} directory.`);
    }
  }
}

const manifestPath = join(supabaseDir, "baseline", "manifest.json");
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const allowedStatuses = new Set(["PENDING_READ_ONLY_EXPORT", "CAPTURED"]);

    if (!allowedStatuses.has(manifest.capture_status)) {
      fail("Baseline manifest has an unsupported capture_status.");
    }

    if (manifest.data_included !== false) {
      fail("Baseline manifest must declare data_included as false.");
    }

    if (manifest.capture_status === "PENDING_READ_ONLY_EXPORT" && manifest.schema_file !== null) {
      fail("A pending baseline must not reference a schema file.");
    }

    if (manifest.capture_status === "CAPTURED") {
      const schemaFile = manifest.schema_file;
      const schemaPath = join(supabaseDir, "baseline", String(schemaFile));

      if (!/^[-a-z0-9_]+\.sql$/i.test(String(schemaFile))) {
        fail("Captured baseline must reference a local SQL file name.");
      } else if (!existsSync(schemaPath) || statSync(schemaPath).size === 0) {
        fail("Captured baseline schema file is missing or empty.");
      } else if (!/^[a-f0-9]{64}$/i.test(String(manifest.schema_sha256))) {
        fail("Captured baseline must declare a SHA-256 digest.");
      } else if (!Number.isInteger(manifest.schema_bytes) || statSync(schemaPath).size !== manifest.schema_bytes) {
        fail("Captured baseline byte count does not match its schema file.");
      } else if (sha256(schemaPath) !== manifest.schema_sha256) {
        fail("Captured baseline SHA-256 digest does not match its schema file.");
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(manifest.captured_on_utc))) {
        fail("Captured baseline must declare an ISO capture date.");
      }
    }
  } catch {
    fail("Baseline manifest is not valid JSON.");
  }
} else {
  fail("Missing supabase/baseline/manifest.json.");
}

const migrationsDir = join(supabaseDir, "migrations");
if (existsSync(migrationsDir)) {
  for (const entry of readdirSync(migrationsDir)) {
    if (entry === ".gitkeep") continue;
    const isMigration = /^\d{14}_[a-z0-9_]+\.sql$/i.test(entry);
    const isHistoricalExport = /(baseline|snapshot|remote[_-]?schema|legacy)/i.test(entry);

    if (!isMigration || isHistoricalExport) {
      fail(`Unsafe migration filename: supabase/migrations/${entry}`);
    }
  }
}

const prohibitedExtensions = /\.(pem|key|p12|pfx)$/i;
const prohibitedNames = /(^|\/)(\.env(?:\..+)?|service-account[^/]*\.json)$/i;
if (existsSync(supabaseDir)) {
  for (const file of walk(supabaseDir)) {
    const projectPath = relative(root, file);
    if (prohibitedExtensions.test(file) || prohibitedNames.test(projectPath)) {
      fail(`Sensitive artefact must not be stored in ${projectPath}.`);
    }

    if (statSync(file).size > 5 * 1024 * 1024) {
      fail(`Unexpectedly large local artefact: ${projectPath}`);
    }
  }
}

const gitignorePath = join(root, ".gitignore");
if (!existsSync(gitignorePath) || !readFileSync(gitignorePath, "utf8").includes("/supabase/.temp/")) {
  fail("Supabase CLI .temp metadata must be ignored by Git.");
}

if (failures.length) {
  console.error("Supabase baseline layout check failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log("Supabase baseline layout is valid.");
}
