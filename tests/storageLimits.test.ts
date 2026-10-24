import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
import type { FileAsset } from "../src/state/domain";

const owner = "20000000-0000-4000-8000-000000000094";
const maximumBytes = 2 * 1024 ** 3;
const verificationLimit = 10 * 1024 ** 2;
const migrationName = "202610230004_storage_limits.sql";
const migrationUrl = new URL(
  `../supabase/migrations/${migrationName}`,
  import.meta.url,
);

function storageActor(db: PGlite) {
  const asOwner = async () => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    await db.exec("set role authenticated");
  };
  const rpc = async <T = unknown>(name: string, values: unknown[] = []) => {
    await asOwner();
    return (
      await db.query<{ value: T }>(
        `select public.${name}(${values.map((_, i) => `$${i + 1}`).join(",")}) value`,
        values,
      )
    ).rows[0].value;
  };
  return {
    rpc,
    async setup() {
      await db.exec("reset role");
      await db.query("insert into auth.users(id) values($1)", [owner]);
      await rpc("darsino_mutate", [
        JSON.stringify({
          actorId: owner,
          type: "profile",
          role: "tutor",
          profile: {
            name: "Storage Limit Test",
            city: "Toshkent",
            area: "Yunusobod",
            interests: ["Ingliz tili"],
            goal: "IELTS / CEFR",
          },
          tutor: {
            subjects: ["Ingliz tili"],
            specialty: "IELTS",
            experience: 4,
            proof: "Certificate text",
            bio: "IELTS va umumiy ingliz tili darslari",
            price: 90000,
            modes: ["Onlayn"],
            availability: ["18:00"],
          },
        }),
      ]);
    },
    prepare: (size = 1) =>
      rpc<FileAsset>("darsino_prepare_upload", [
        "verification",
        "certificate.pdf",
        "application/pdf",
        size,
      ]),
    async upload(asset: FileAsset, size: number) {
      await asOwner();
      await db.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
        [
          asset.bucketId,
          asset.objectPath,
          owner,
          JSON.stringify({ size, mimetype: asset.mimeType }),
        ],
      );
    },
    async inspect() {
      await db.exec("reset role");
      return (
        await db.query<{
          bytes: number;
          actual: number;
          files: number;
        }>(
          `select
            (select coalesce(sum(reserved_size_bytes),0)::bigint from public.darsino_files where owner_id=$1 and state<>'deleted') bytes,
            (select coalesce(sum((metadata->>'size')::bigint),0)::bigint from storage.objects where owner_id=$1::text) actual,
            (select count(*)::integer from public.darsino_files where owner_id=$1 and state<>'deleted') files`,
          [owner],
        )
      ).rows[0];
    },
  };
}

test(
  "Storage reserves worst-case bytes before upload and releases them only after verification or completed deletion",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const actor = storageActor(db);
      await actor.setup();
      const assets: FileAsset[] = [];
      // More than one hourly window: uploaded but unfinalized objects must keep
      // their budget even when their pending-upload window has expired.
      const maximumReservations = Math.floor(maximumBytes / verificationLimit);
      for (let i = 0; i < maximumReservations; i++) {
        const asset = await actor.prepare(i === 0 ? 4 : 1);
        await actor.upload(asset, i === 0 ? 4 : verificationLimit);
        assets.push(asset);
        if ((i + 1) % 20 === 0) {
          await db.exec("reset role");
          await db.query(
            "update public.darsino_files set created_at=now()-interval '2 hours' where owner_id=$1 and state='pending'",
            [owner],
          );
        }
      }
      const before = await actor.inspect();
      assert.equal(before.bytes, maximumReservations * verificationLimit);
      assert.ok(before.actual <= before.bytes);
      assert.ok(before.bytes <= maximumBytes);
      await assert.rejects(actor.prepare(), /Akkaunt fayl limiti/);

      // A forged declaration cannot release its conservative charge.
      await assert.rejects(
        actor.rpc("darsino_finalize_upload", [assets[1].id]),
        /haqiqiy hajmi/,
      );
      assert.equal((await actor.inspect()).bytes, before.bytes);

      // A valid small upload releases the excess, including on a safe retry.
      await actor.rpc("darsino_finalize_upload", [assets[0].id]);
      await actor.rpc("darsino_finalize_upload", [assets[0].id]);
      assert.equal(
        (await actor.inspect()).bytes,
        before.bytes - verificationLimit + 4,
      );
      await actor.prepare();
      const fullAgain = await actor.inspect();
      assert.equal(fullAgain.bytes, before.bytes + 4);
      await assert.rejects(actor.prepare(), /Akkaunt fayl limiti/);

      // Merely beginning deletion cannot release the budget for retained bytes.
      await actor.rpc("darsino_begin_file_delete", [assets[1].id]);
      assert.equal((await actor.inspect()).bytes, fullAgain.bytes);
      await assert.rejects(actor.prepare(), /Akkaunt fayl limiti/);
      await assert.rejects(
        actor.rpc("darsino_forget_file", [assets[1].id]),
        /Storage API/,
      );
      assert.equal((await actor.inspect()).bytes, fullAgain.bytes);

      // Simulate Storage API's authenticated metadata deletion, then forget.
      await actor.rpc("darsino_begin_file_delete", [assets[1].id]);
      await db.query(
        "delete from storage.objects where bucket_id=$1 and name=$2",
        [assets[1].bucketId, assets[1].objectPath],
      );
      await actor.rpc("darsino_forget_file", [assets[1].id]);
      assert.equal(
        (await actor.inspect()).bytes,
        fullAgain.bytes - verificationLimit,
      );
      await actor.prepare();
      const end = await actor.inspect();
      assert.equal(end.bytes, fullAgain.bytes);
      assert.ok(end.actual <= end.bytes && end.bytes <= maximumBytes);
    } finally {
      await db.close();
    }
  },
);

test(
  "Storage retains its pending-upload and account file-count limits",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const actor = storageActor(db);
      await actor.setup();
      for (let i = 0; i < 20; i++) await actor.prepare();
      await assert.rejects(actor.prepare(), /Yuklanayotgan fayllar soni ko‘p/);
      await db.exec("reset role");
      await db.query(
        "update public.darsino_files set created_at=now()-interval '2 hours' where owner_id=$1",
        [owner],
      );
      await actor.prepare();

      // Isolate the file-count cap from byte usage and hourly pending count.
      await db.exec("reset role");
      await db.query(
        "update public.darsino_files set state='deleted' where owner_id=$1",
        [owner],
      );
      await db.query(
        `insert into public.darsino_files(owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,reserved_size_bytes,state)
          select $1::uuid,'verification','darsino-verifications',($1::uuid)::text||'/'||gen_random_uuid()::text||'.pdf','certificate.pdf','application/pdf',1,1,'ready'
          from generate_series(1,1000)`,
        [owner],
      );
      assert.equal((await actor.inspect()).bytes, 1000);
      await assert.rejects(actor.prepare(), /Akkaunt fayl limiti/);
    } finally {
      await db.close();
    }
  },
);

test(
  "Storage upgrade conservatively budgets existing uploads and preserves verified charges when reapplied",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      const folder = new URL("../supabase/migrations/", import.meta.url);
      for (const name of (await readdir(folder))
        .filter((name) => name.endsWith(".sql") && name < migrationName)
        .sort())
        await db.exec(await readFile(new URL(name, folder), "utf8"));
      const actor = storageActor(db);
      await actor.setup();
      const pending = await actor.prepare();
      await actor.upload(pending, verificationLimit);
      const deleting = await actor.prepare();
      await actor.upload(deleting, verificationLimit);
      await actor.rpc("darsino_begin_file_delete", [deleting.id]);
      const ready = await actor.prepare(4);
      await actor.upload(ready, 4);
      await actor.rpc("darsino_finalize_upload", [ready.id]);
      const deleted = await actor.prepare();
      await actor.rpc("darsino_begin_file_delete", [deleted.id]);
      await actor.rpc("darsino_forget_file", [deleted.id]);

      await db.exec("reset role");
      const migration = await readFile(migrationUrl, "utf8");
      await db.exec(migration);
      assert.equal((await actor.inspect()).bytes, 2 * verificationLimit + 4);
      await actor.rpc("darsino_begin_file_delete", [ready.id]);
      assert.equal((await actor.inspect()).bytes, 2 * verificationLimit + 4);
      await db.exec(migration);
      assert.equal((await actor.inspect()).bytes, 2 * verificationLimit + 4);
    } finally {
      await db.close();
    }
  },
);
