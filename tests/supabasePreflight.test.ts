import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

const sql = () =>
  readFile(
    new URL("../supabase/admin/00_preflight.sql", import.meta.url),
    "utf8",
  );
type Row = Record<string, any>;

async function preflight(db: Awaited<ReturnType<typeof supabaseFixture>>) {
  await db.exec("begin read only");
  try {
    return (await db.exec(await sql())).flatMap(
      (result) => result.rows as Row[],
    );
  } finally {
    await db.exec("rollback");
  }
}

test(
  "read-only preflight tolerates empty, partial and absent CLI history schemas",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      let rows = await preflight(db);
      const managed = rows.find((row) => row.section === "managed_schemas")!;
      assert.equal(managed.auth_users_present, true);
      assert.equal(managed.storage_objects_present, true);
      assert.equal(
        rows.filter((row) => row.section === "core_relations").length,
        11,
      );
      assert.ok(
        rows
          .filter((row) => row.section === "core_relations")
          .every((row) => row.present === false),
      );
      let history = rows.find((row) => row.section === "migration_history")!;
      assert.equal(history.schema_present, false);
      assert.equal(history.table_present, false);
      assert.equal(history.row_count, null);
      assert.equal(
        rows.filter((row) => row.section === "migration_versions").length,
        0,
      );
      assert.equal(
        rows.filter((row) => row.section === "app_table_counts").length,
        0,
      );

      await db.exec("create schema supabase_migrations");
      rows = await preflight(db);
      history = rows.find((row) => row.section === "migration_history")!;
      assert.equal(history.schema_present, true);
      assert.equal(history.table_present, false);

      await db.exec(
        "create table supabase_migrations.schema_migrations(version text primary key)",
      );
      rows = await preflight(db);
      history = rows.find((row) => row.section === "migration_history")!;
      assert.equal(history.table_present, true);
      assert.equal(history.row_count, 0);
      assert.equal(history.version_column_present, true);
      assert.equal(history.name_column_present, false);
      await db.exec(
        "insert into supabase_migrations.schema_migrations(version) values('202610140001')",
      );
      rows = await preflight(db);
      assert.deepEqual(
        rows.filter((row) => row.section === "migration_versions"),
        [
          {
            section: "migration_versions",
            version: "202610140001",
            name: null,
          },
        ],
      );

      // An unrelated partial relation must not make preflight assume app columns
      // or claim that a migration version is installed from a positive row count.
      await db.exec(
        "create table public.darsino_profiles(unrelated text); insert into public.darsino_profiles values('private row text must stay private')",
      );
      rows = await preflight(db);
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_table_counts" &&
            row.table_name === "darsino_profiles",
        )?.row_count,
        1,
      );
      assert.equal(
        rows.filter((row) => row.section === "core_relations" && !row.present)
          .length,
        10,
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "feature_objects" &&
            row.name === "public.darsino_snapshot()",
        )?.present,
        false,
      );
      assert.ok(!JSON.stringify(rows).includes("private row text"));
    } finally {
      await db.close();
    }
  },
);

test(
  "preflight reports full app objects, counts and optional CLI versions without exposing records or migration SQL",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      await db.query("insert into auth.users(id) values($1)", [
        "10000000-0000-4000-8000-000000000298",
      ]);
      await db.exec(
        "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])",
      );
      await db.query(
        "insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)",
        [
          "202610230001",
          "backend_access",
          ["never reveal private migration SQL"],
        ],
      );
      const before = (
        await db.query<{ n: number }>("select count(*)::int n from pg_class")
      ).rows[0].n;
      const rows = await preflight(db);
      assert.ok(
        rows
          .filter((row) => row.section === "core_relations")
          .every((row) => row.present === true),
      );
      assert.ok(
        rows
          .filter((row) => row.section === "feature_objects")
          .every((row) => row.present === true),
      );
      assert.equal(
        rows.find((row) => row.section === "migration_history")?.row_count,
        1,
      );
      assert.deepEqual(
        rows.filter((row) => row.section === "migration_versions"),
        [
          {
            section: "migration_versions",
            version: "202610230001",
            name: "backend_access",
          },
        ],
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_table_counts" &&
            row.table_name === "darsino_profiles",
        )?.row_count,
        1,
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_table_counts" &&
            row.table_name === "darsino_files",
        )?.row_count,
        0,
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_table_counts" &&
            row.table_name === "darsino_profiles",
        )?.count_is_rls_scoped,
        false,
      );
      const publication = rows.filter(
        (row) => row.section === "realtime_tables",
      );
      assert.ok(
        publication.some((row) => row.tablename === "darsino_messages"),
      );
      assert.ok(
        publication.some((row) => row.tablename === "darsino_contact_requests"),
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_functions" &&
            row.function_name === "darsino_mutate",
        )?.authenticated_execute,
        true,
      );
      assert.equal(
        rows.find(
          (row) =>
            row.section === "app_functions" &&
            row.function_name === "darsino_mutate_idempotent_base",
        )?.authenticated_execute,
        false,
      );
      assert.ok(
        !JSON.stringify(rows).includes("never reveal private migration SQL"),
      );
      assert.ok(
        !JSON.stringify(rows).includes("10000000-0000-4000-8000-000000000298"),
      );
      assert.equal(
        (await db.query<{ n: number }>("select count(*)::int n from pg_class"))
          .rows[0].n,
        before,
      );
    } finally {
      await db.close();
    }
  },
);
