import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

const owner = "10000000-0000-4000-8000-000000000071";
const outsider = "10000000-0000-4000-8000-000000000072";
type Asset = {
  id: string;
  bucketId: string;
  objectPath: string;
};

test("Storage INSERT lifecycle locks preserve owner, state, expiry and deferred-metadata policies", async () => {
  const db = await supabaseFixture();
  const as = async (id: string, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
  };
  const prepare = async (): Promise<Asset> => {
    await as(owner);
    return (
      await db.query<{ asset: Asset }>(
        "select public.darsino_prepare_upload('avatar','avatar.png','image/png',1) asset",
      )
    ).rows[0].asset;
  };
  const canInsert = async (asset: Asset, actor = owner) => {
    await as(actor);
    return (
      await db.query<{ allowed: boolean }>(
        "select public.darsino_storage_insert($1,$2) allowed",
        [asset.bucketId, asset.objectPath],
      )
    ).rows[0].allowed;
  };
  const insert = (asset: Asset) =>
    db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
      asset.bucketId,
      asset.objectPath,
    ]);
  try {
    await applyMigrations(db);
    for (const id of [owner, outsider])
      await db.query("insert into auth.users(id) values($1)", [id]);
    const pending = await prepare();
    assert.equal(await canInsert(pending), true);
    assert.equal(await canInsert(pending, outsider), false);
    await assert.rejects(insert(pending), /row-level security/);
    await as("", "anon");
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.darsino_storage_insert($1,$2) allowed",
          [pending.bucketId, pending.objectPath],
        )
      ).rows[0].allowed,
      false,
    );
    await assert.rejects(insert(pending), /row-level security/);

    // Storage can create the object record before authoritative MIME/size are
    // available. Quota protection was already established by prepare_upload.
    await as(owner);
    await insert(pending);
    await assert.rejects(
      db.query("select public.darsino_finalize_upload($1)", [pending.id]),
      /haqiqiy hajmi/,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ bytes: number }>(
          "select reserved_size_bytes::int bytes from public.darsino_files where id=$1",
          [pending.id],
        )
      ).rows[0].bytes,
      2 * 1024 * 1024,
    );
    await db.query(
      "update storage.objects set metadata=$1 where bucket_id=$2 and name=$3",
      [
        JSON.stringify({ size: 1, mimetype: "image/png" }),
        pending.bucketId,
        pending.objectPath,
      ],
    );
    await as(owner);
    await db.query("select public.darsino_finalize_upload($1)", [pending.id]);
    assert.equal(
      await canInsert(pending),
      false,
      "ready objects stay immutable",
    );

    const expired = await prepare();
    await db.exec("reset role");
    await db.query(
      "update public.darsino_files set created_at=now()-interval '2 hours' where id=$1",
      [expired.id],
    );
    assert.equal(await canInsert(expired), false);
    await assert.rejects(insert(expired), /row-level security/);

    const deleting = await prepare();
    await db.query("select public.darsino_begin_file_delete($1)", [
      deleting.id,
    ]);
    assert.equal(await canInsert(deleting), false);
    await assert.rejects(insert(deleting), /row-level security/);
    await db.query("select public.darsino_forget_file($1)", [deleting.id]);
    assert.equal(
      await canInsert(deleting),
      false,
      "deleted reservations cannot upload",
    );
    await assert.rejects(insert(deleting), /row-level security/);
  } finally {
    await db.close();
  }
});

test("Storage lifecycle upgrade remains volatile, scoped and safely replayable", async () => {
  const db = await supabaseFixture();
  try {
    await applyMigrations(db);
    const metadata = () =>
      db.query<{
        volatility: string;
        definer: boolean;
        anon: boolean;
        authenticated: boolean;
      }>(
        `select p.provolatile volatility,p.prosecdef definer,
          has_function_privilege('anon',p.oid,'execute') anon,
          has_function_privilege('authenticated',p.oid,'execute') authenticated
        from pg_proc p where p.oid='public.darsino_storage_insert(text,text)'::regprocedure`,
      );
    const before = (await metadata()).rows;
    assert.deepEqual(before, [
      { volatility: "v", definer: true, anon: true, authenticated: true },
    ]);
    const policies = () =>
      db.query(
        "select polname,polpermissive,polcmd,polqual::text,polwithcheck::text from pg_policy where polrelid='storage.objects'::regclass order by polname",
      );
    const beforePolicies = (await policies()).rows;
    const migration = await readFile(
      new URL(
        "../supabase/migrations/202610230006_storage_lifecycle.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual((await metadata()).rows, before);
    assert.deepEqual((await policies()).rows, beforePolicies);
  } finally {
    await db.close();
  }
});
