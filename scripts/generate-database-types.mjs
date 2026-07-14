import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const baselinePath = resolve(root, "supabase/baseline/remote-schema.sql");
const migrationPath = resolve(
  root,
  "supabase/migrations/20260714000000_access_control_v2_foundation.sql",
);
const outputPath = resolve(root, "src/types/database.ts");
const image = "public.ecr.aws/supabase/postgres:17.6.1.121";
const containerName = `myrideplan-l06-${process.pid}`;
const checkOnly = process.argv.includes("--check");

function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }

  return result.stdout;
}

function executeSql(sql) {
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
      "--tuples-only",
      "--no-align",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    sql,
  ).trim();
}

function waitForDatabase() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = spawnSync(
      "docker",
      [
        "exec",
        "--user",
        "postgres",
        containerName,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "postgres",
      ],
      { encoding: "utf8" },
    );

    if (ready.status === 0) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  throw new Error("The isolated PostgreSQL generator container did not become ready");
}

function databaseType(sqlType) {
  const normalized = sqlType.toLowerCase();

  if (normalized.endsWith("[]")) {
    return `${databaseType(normalized.slice(0, -2))}[]`;
  }

  if (normalized.startsWith("_")) {
    return `${databaseType(normalized.slice(1))}[]`;
  }

  if (
    [
      "integer",
      "bigint",
      "smallint",
      "numeric",
      "decimal",
      "real",
      "double precision",
      "int2",
      "int4",
      "int8",
      "float4",
      "float8",
    ].includes(normalized)
  ) {
    return "number";
  }

  if (["boolean", "bool"].includes(normalized)) {
    return "boolean";
  }

  if (["json", "jsonb"].includes(normalized)) {
    return "Json";
  }

  return "string";
}

function property(name, type, optional) {
  return `          ${JSON.stringify(name)}${optional ? "?" : ""}: ${type}`;
}

function renderTable(table, columns, relationships) {
  const row = columns
    .map((column) => property(column.name, `${databaseType(column.type)}${column.nullable ? " | null" : ""}`, false))
    .join(",\n");
  const insert = columns
    .map((column) =>
      property(
        column.name,
        `${databaseType(column.type)}${column.nullable ? " | null" : ""}`,
        column.nullable || column.hasDefault,
      ),
    )
    .join("\n");
  const update = columns
    .map((column) =>
      property(
        column.name,
        `${databaseType(column.type)}${column.nullable ? " | null" : ""}`,
        true,
      ),
    )
    .join("\n");

  const tableRelationships = relationships
    .map(
      (relationship) => `          {\n            foreignKeyName: ${JSON.stringify(relationship.name)}\n            columns: ${JSON.stringify(relationship.columns)}\n            isOneToOne: ${relationship.isOneToOne}\n            referencedRelation: ${JSON.stringify(relationship.referencedRelation)}\n            referencedColumns: ${JSON.stringify(relationship.referencedColumns)}\n          }`,
    )
    .join(",\n");

  return `      ${JSON.stringify(table)}: {\n        Row: {\n${row}\n        }\n        Insert: {\n${insert}\n        }\n        Update: {\n${update}\n        }\n        Relationships: [${tableRelationships ? `\n${tableRelationships}\n        ` : ""}]\n      }`;
}

function parseFunctionArguments(argumentsText) {
  if (!argumentsText) {
    return [];
  }

  return argumentsText.split(", ").map((argument) => {
    const [name, ...typeParts] = argument.trim().split(/\s+/);
    return { name, type: typeParts.join(" ") || "text" };
  });
}

function renderFunctions(functions) {
  const byName = new Map();

  for (const databaseFunction of functions) {
    const entry = byName.get(databaseFunction.name) ?? {
      overloads: 0,
      argumentSets: [],
      returnType: databaseFunction.returnType,
    };
    entry.overloads += 1;
    entry.argumentSets.push(parseFunctionArguments(databaseFunction.arguments));
    byName.set(databaseFunction.name, entry);
  }

  return [...byName.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, entry]) => {
      const args = entry.argumentSets
        .map((argumentSet) => {
          if (argumentSet.length === 0) {
            return "Record<string, never>";
          }

          const properties = argumentSet
            .map((argument) => property(argument.name, databaseType(argument.type), false))
            .join("\n");
          return `{\n${properties}\n        }`;
        })
        .join("\n        | ");
      return `      ${JSON.stringify(name)}: {\n        Args: ${args}\n        Returns: ${databaseType(entry.returnType)}\n      }`;
    })
    .join("\n");
}

function renderDatabaseType(columns, functions, relationships, sourceHashes) {
  const schemas = ["public", "access_control"];
  const schemaOutput = schemas
    .map((schema) => {
      const tables = new Map();
      for (const column of columns.filter((candidate) => candidate.schema === schema)) {
        const tableColumns = tables.get(column.table) ?? [];
        tableColumns.push(column);
        tables.set(column.table, tableColumns);
      }
      const tableOutput = [...tables.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([table, tableColumns]) =>
          renderTable(
            table,
            tableColumns,
            relationships.filter(
              (relationship) =>
                relationship.schema === schema && relationship.table === table,
            ),
          ),
        )
        .join("\n");
      const functionOutput = renderFunctions(
        functions.filter((candidate) => candidate.schema === schema),
      );

      return `  ${JSON.stringify(schema)}: {\n    Tables: {\n${tableOutput}\n    }\n    Views: Record<string, never>\n    Functions: {\n${functionOutput}\n    }\n    Enums: Record<string, never>\n    CompositeTypes: Record<string, never>\n  }`;
    })
    .join("\n");

  return `/*\n * GENERATED FILE. DO NOT EDIT MANUALLY.\n *\n * Source: supabase/baseline/remote-schema.sql (${sourceHashes.baseline})\n * Source: supabase/migrations/20260714000000_access_control_v2_foundation.sql (${sourceHashes.migration})\n * Regenerate: npm run generate:types\n */\n\nexport type Json =\n  | string\n  | number\n  | boolean\n  | null\n  | { [key: string]: Json | undefined }\n  | Json[];\n\nexport type Database = {\n${schemaOutput}\n};\n`;
}

const bootstrapSql = `
create extension if not exists pgcrypto;
create schema if not exists auth;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end;
$$;
create table if not exists auth.users (id uuid primary key, email text not null unique);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
`;

const baselineSql = readFileSync(baselinePath, "utf8");
const migrationSql = readFileSync(migrationPath, "utf8");
const sourceHashes = {
  baseline: createHash("sha256").update(baselineSql).digest("hex"),
  migration: createHash("sha256").update(migrationSql).digest("hex"),
};

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
    "-lc",
    "initdb -D /tmp/l06-postgres >/dev/null && pg_ctl -D /tmp/l06-postgres -o \"-c listen_addresses=''\" -w start >/dev/null && tail -f /dev/null",
  ]);
  waitForDatabase();
  executeSql(bootstrapSql);
  executeSql(baselineSql);
  executeSql(migrationSql);

  const columns = JSON.parse(
    executeSql(`
      select coalesce(json_agg(json_build_object(
        'schema', table_schema,
        'table', table_name,
        'name', column_name,
        'type', udt_name,
        'nullable', is_nullable = 'YES',
        'hasDefault', column_default is not null
      ) order by table_schema, table_name, ordinal_position), '[]')
      from information_schema.columns
      where table_schema in ('public', 'access_control');
    `),
  );
  const functions = JSON.parse(
    executeSql(`
      select coalesce(json_agg(json_build_object(
        'schema', namespace.nspname,
        'name', procedure.proname,
        'arguments', pg_get_function_identity_arguments(procedure.oid),
        'returnType', pg_get_function_result(procedure.oid)
      ) order by namespace.nspname, procedure.proname, procedure.oid), '[]')
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname in ('public', 'access_control')
        and procedure.prokind = 'f'
        and pg_get_function_result(procedure.oid) <> 'trigger'
        and not exists (
          select 1
          from pg_depend dependency
          join pg_extension extension on extension.oid = dependency.refobjid
          where dependency.classid = 'pg_proc'::regclass
            and dependency.objid = procedure.oid
            and dependency.refclassid = 'pg_extension'::regclass
            and dependency.deptype = 'e'
        );
    `),
  );
  const relationships = JSON.parse(
    executeSql(`
      select coalesce(json_agg(json_build_object(
        'schema', table_namespace.nspname,
        'table', table_relation.relname,
        'name', constraint_definition.conname,
        'columns', (
          select json_agg(column_definition.attname order by key_column.ordinality)
          from unnest(constraint_definition.conkey) with ordinality as key_column(attnum, ordinality)
          join pg_attribute column_definition
            on column_definition.attrelid = constraint_definition.conrelid
           and column_definition.attnum = key_column.attnum
        ),
        'isOneToOne', exists (
          select 1
          from pg_constraint uniqueness_constraint
          where uniqueness_constraint.conrelid = constraint_definition.conrelid
            and uniqueness_constraint.contype in ('p', 'u')
            and uniqueness_constraint.conkey = constraint_definition.conkey
        ),
        'referencedRelation', referenced_relation.relname,
        'referencedColumns', (
          select json_agg(column_definition.attname order by key_column.ordinality)
          from unnest(constraint_definition.confkey) with ordinality as key_column(attnum, ordinality)
          join pg_attribute column_definition
            on column_definition.attrelid = constraint_definition.confrelid
           and column_definition.attnum = key_column.attnum
        )
      ) order by table_namespace.nspname, table_relation.relname, constraint_definition.conname), '[]')
      from pg_constraint constraint_definition
      join pg_class table_relation on table_relation.oid = constraint_definition.conrelid
      join pg_namespace table_namespace on table_namespace.oid = table_relation.relnamespace
      join pg_class referenced_relation on referenced_relation.oid = constraint_definition.confrelid
      where constraint_definition.contype = 'f'
        and table_namespace.nspname in ('public', 'access_control');
    `),
  );
  const output = renderDatabaseType(
    columns,
    functions,
    relationships,
    sourceHashes,
  );

  if (checkOnly) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error("Generated database types are stale. Run npm run generate:types.");
    }
  } else {
    writeFileSync(outputPath, output);
  }
} finally {
  spawnSync("docker", ["stop", containerName], { stdio: "ignore" });
}
