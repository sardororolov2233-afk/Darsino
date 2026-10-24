import { after, test } from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

const student = "10000000-0000-4000-8000-000000000051";
const other = "10000000-0000-4000-8000-000000000052";
const tutor = "20000000-0000-4000-8000-000000000051";
const key = "40000000-0000-4000-8000-000000000051";
const nextKey = "40000000-0000-4000-8000-000000000052";
const conversation = `dm:${student}:${tutor}`;

// Reuse the database schema, isolating every case with TRUNCATE. Besides being
// faster, this avoids repeatedly disposing large WASM instances in Node/V8.
let shared: Awaited<ReturnType<typeof supabaseFixture>> | undefined;
after(async () => {
  await shared?.close();
});
async function fixture() {
  if (!shared) {
    shared = await supabaseFixture();
    await applyMigrations(shared);
  }
  const db = shared;
  await db.exec("reset role; truncate auth.users, storage.objects cascade");
  for (const id of [student, other, tutor])
    await db.query("insert into auth.users(id) values($1)", [id]);
  await db.exec(
    "update public.darsino_profiles set onboarded=true,name='API Test'",
  );
  await db.query(
    "update public.darsino_profiles set role='tutor' where id=$1",
    [tutor],
  );
  await db.query(
    "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
    [
      tutor,
      JSON.stringify({
        subjects: ["Ingliz tili"],
        modes: ["Onlayn"],
        price: 90000,
      }),
    ],
  );
  const as = async (id: string, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
  };
  const command = async (id: string, value: Record<string, unknown>) => {
    await as(id);
    return (
      await db.query<{ result: any }>(
        "select public.darsino_mutate($1::jsonb) result",
        [JSON.stringify({ actorId: id, ...value })],
      )
    ).rows[0].result;
  };
  const count = async (table: string) => {
    await db.exec("reset role");
    return (
      await db.query<{ n: number }>(
        `select count(*)::int n from public.${table}`,
      )
    ).rows[0].n;
  };
  return { db, as, command, count };
}

test("committed message replays are scoped, immutable and produce one notification", async () => {
  const f = await fixture();
  try {
    const message = {
      type: "message",
      conversationId: conversation,
      text: "Salom, darsga tayyorman.",
      idempotencyKey: key,
    };
    const first = await f.command(student, message);
    const replay = await f.command(student, {
      idempotencyKey: key,
      text: message.text,
      conversationId: conversation,
      type: "message",
    });
    assert.equal(first.market.messages.length, 1);
    assert.equal(replay.market.messages[0].id, first.market.messages[0].id);
    assert.equal(await f.count("darsino_messages"), 1);
    assert.equal(await f.count("darsino_notifications"), 1);
    assert.equal(await f.count("darsino_mutation_receipts"), 1);
    await assert.rejects(
      f.command(student, { ...message, text: "A different intent" }),
      /boshqa amal/,
    );
    assert.equal(await f.count("darsino_messages"), 1);
    await f.command(other, {
      ...message,
      conversationId: `dm:${other}:${tutor}`,
    });
    assert.equal(await f.count("darsino_mutation_receipts"), 2);
    await assert.rejects(
      f.command(other, { ...message, actorId: student }),
      /Akkaunt/,
    );
    await assert.rejects(
      f.command(student, { ...message, idempotencyKey: null }),
      /identifikatori/,
    );
    await assert.rejects(
      f.command(student, { ...message, idempotencyKey: "invalid" }),
      /identifikatori/,
    );
    await assert.rejects(
      f.command(student, {
        ...message,
        idempotencyKey: nextKey,
        text: "a".repeat(70000),
      }),
      /juda katta/,
    );
    assert.equal(await f.count("darsino_mutation_receipts"), 2);
  } finally {
    await f.db.exec("rollback; reset role");
  }
});

test("favorite retries do not toggle twice and replays return the current scoped snapshot", async () => {
  const f = await fixture();
  try {
    const intent = { type: "favorite", id: tutor, idempotencyKey: key };
    assert.deepEqual(
      (await f.command(student, intent)).market.favorites[student],
      [tutor],
    );
    assert.deepEqual(
      (await f.command(student, intent)).market.favorites[student],
      [tutor],
    );
    assert.deepEqual(
      (await f.command(student, { ...intent, idempotencyKey: nextKey })).market
        .favorites[student],
      [],
    );
    assert.deepEqual(
      (await f.command(student, intent)).market.favorites[student],
      [],
    );
    assert.equal(await f.count("darsino_mutation_receipts"), 2);
    // Legacy clients can still call the same RPC without an idempotency field.
    await f.command(student, { type: "favorite", id: tutor });
    assert.equal(await f.count("darsino_favorites"), 1);
  } finally {
    await f.db.exec("rollback; reset role");
  }
});

test("failed transactions leave no receipt, and stored result IDs survive creation retries", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "insert into public.darsino_user_blocks(user_id,peer_id) values($1,$2)",
      [tutor, student],
    );
    const message = {
      type: "message",
      conversationId: conversation,
      text: "Dars haqida savol.",
      idempotencyKey: key,
    };
    await assert.rejects(f.command(student, message));
    assert.equal(await f.count("darsino_mutation_receipts"), 0);
    await f.db.query(
      "delete from public.darsino_user_blocks where user_id=$1",
      [tutor],
    );
    await f.command(student, message);
    assert.equal(await f.count("darsino_mutation_receipts"), 1);
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const endsAt = new Date(Date.now() + 90000000).toISOString();
    const offering = {
      type: "offering",
      idempotencyKey: nextKey,
      offering: {
        title: "IELTS speaking",
        subject: "Ingliz tili",
        type: "group",
        capacity: 5,
        price: 90000,
        mode: "Onlayn",
        area: "Yunusobod",
        location: "Onlayn xona",
        days: "Juma",
        benefits: [],
        sessions: [{ startsAt, endsAt }],
      },
    };
    const first = await f.command(tutor, offering);
    const retry = await f.command(tutor, offering);
    assert.ok(first.id);
    assert.equal(retry.id, first.id);
    assert.equal(await f.count("darsino_offerings"), 1);
    assert.equal(await f.count("darsino_sessions"), 1);
  } finally {
    await f.db.exec("rollback; reset role");
  }
});

test("file-message replay also notifies once and receipt maintenance stays server-only", async () => {
  const f = await fixture();
  try {
    await f.as(student);
    const file = (
      await f.db.query<{ result: any }>(
        "select public.darsino_prepare_upload('chat','notes.pdf','application/pdf',1,$1,null) result",
        [conversation],
      )
    ).rows[0].result;
    await f.db.exec("reset role");
    await f.db.query(
      "insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)",
      [
        file.bucketId,
        file.objectPath,
        JSON.stringify({ size: 1, mimetype: "application/pdf" }),
      ],
    );
    await f.as(student);
    await f.db.query("select public.darsino_finalize_upload($1)", [file.id]);
    await f.db.query(
      "select public.darsino_send_file_message($1,'Mana hujjat.')",
      [file.id],
    );
    await f.db.query(
      "select public.darsino_send_file_message($1,'Mana hujjat.')",
      [file.id],
    );
    assert.equal(await f.count("darsino_messages"), 1);
    assert.equal(await f.count("darsino_notifications"), 1);
    await f.command(student, {
      type: "favorite",
      id: tutor,
      idempotencyKey: key,
    });
    await assert.rejects(
      f.db.query("select * from public.darsino_mutation_receipts"),
      /permission denied/,
    );
    await assert.rejects(
      f.db.query("select public.darsino_prune_mutation_receipts(now())"),
      /permission denied/,
    );
    await assert.rejects(
      f.db.query("select public.darsino_mutate_idempotent_base('{}')"),
      /permission denied/,
    );
    await f.as(student, "service_role");
    await assert.rejects(
      f.db.query("select public.darsino_prune_mutation_receipts(now())"),
      /24/,
    );
    await f.db.exec("reset role");
    await f.db.exec(
      "update public.darsino_mutation_receipts set created_at=now()-interval '31 days'",
    );
    await f.as(student, "service_role");
    assert.equal(
      (
        await f.db.query<{ n: number }>(
          "select public.darsino_prune_mutation_receipts()::int n",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await f.db.exec("rollback; reset role");
  }
});

test("fresh receipt keys are bounded while replays stay free and payload padding is not persisted", async () => {
  const f = await fixture();
  try {
    await f.db.exec("begin"); // Freeze the database clock across rate-window assertions.
    const intent = {
      type: "read-notifications",
      idempotencyKey: key,
      ignoredPadding: "x".repeat(64000),
    };
    await f.command(student, intent);
    await f.db.exec("reset role");
    const receipt = (
      await f.db.query<{ size: number }>(
        "select octet_length(command_hash)::int size from public.darsino_mutation_receipts",
      )
    ).rows[0];
    assert.equal(receipt.size, 32);
    assert.equal(
      (
        await f.db.query<{ n: number }>(
          "select count(*)::int n from information_schema.columns where table_schema='public' and table_name='darsino_mutation_receipts' and column_name='command'",
        )
      ).rows[0].n,
      0,
    );
    await f.db.exec(
      "update public.darsino_account_limits set used=120 where bucket='mutation-minute'",
    );
    await f.command(student, intent); // No new rate debit for a successful replay.
    await f.db.exec("savepoint minute_limit");
    await assert.rejects(
      f.command(student, {
        type: "read-notifications",
        idempotencyKey: nextKey,
      }),
      /limiti/,
    );
    await f.db.exec("rollback to savepoint minute_limit");
    await f.db.exec("reset role");
    await f.db.exec(
      "update public.darsino_account_limits set used=0 where bucket='mutation-minute'; update public.darsino_account_limits set used=1000 where bucket='mutation-day'",
    );
    await f.db.exec("savepoint day_limit");
    await assert.rejects(
      f.command(student, {
        type: "read-notifications",
        idempotencyKey: nextKey,
      }),
      /limiti/,
    );
    await f.db.exec("rollback to savepoint day_limit");
    await f.command(student, intent);
    assert.equal(await f.count("darsino_mutation_receipts"), 1);
    await f.db.exec("commit");
  } finally {
    await f.db.exec("rollback; reset role");
  }
});
