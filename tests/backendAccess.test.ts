import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { supabaseFixture } from "./supabaseFixture";
import { defaultAccountSettings } from "../src/state/account";

const migrationName = "202610230001_backend_access.sql";
const migrationFolder = new URL("../supabase/migrations/", import.meta.url);
const accessMigration = () =>
  readFile(new URL(migrationName, migrationFolder), "utf8");

async function fixture() {
  const db = await supabaseFixture();
  // Exercise the actual vulnerable migration chain before applying the fix.
  // Later feature migrations have their own integration suites.
  for (const name of (await readdir(migrationFolder))
    .filter((name) => name.endsWith(".sql") && name < migrationName)
    .sort())
    await db.exec(await readFile(new URL(name, migrationFolder), "utf8"));
  const ids = {
    student: "10000000-0000-4000-8000-000000000231",
    outsider: "10000000-0000-4000-8000-000000000232",
    tutor: "20000000-0000-4000-8000-000000000231",
  };
  const sessions = new Map<string, string>();
  for (const id of Object.values(ids))
    await db.query("insert into auth.users(id) values($1)", [id]);
  await db.exec(
    "update public.darsino_profiles set onboarded=true,name='Audit User'",
  );
  await db.query(
    "update public.darsino_profiles set role='tutor' where id=$1",
    [ids.tutor],
  );
  await db.query(
    "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
    [
      ids.tutor,
      JSON.stringify({
        subjects: ["Matematika"],
        price: 100000,
        modes: ["Onlayn"],
      }),
    ],
  );
  const group = (
    await db.query<{ id: string }>(
      "insert into public.darsino_offerings(tutor_id,capacity,data) values($1,10,$2) returning id",
      [
        ids.tutor,
        JSON.stringify({
          title: "Matematika guruhi",
          price: 100000,
          type: "group",
          subject: "Matematika",
          benefits: [],
          mode: "Onlayn",
          area: "Yunusobod",
          days: "Dushanba",
          time: "14:00",
          location: "Onlayn",
        }),
      ],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.darsino_sessions(offering_id,starts_at,ends_at) values($1,'2099-12-01T09:00:00Z','2099-12-01T10:00:00Z')",
    [group],
  );
  const admin = () => db.exec("reset role");
  const as = async (id: string, claims?: Record<string, unknown>) => {
    await admin();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify(
        claims ?? {
          aal: "aal1",
          ...(sessions.has(id) ? { session_id: sessions.get(id) } : {}),
        },
      ),
    ]);
    await db.exec("set role authenticated");
  };
  const rpc = async (
    id: string,
    name: string,
    args: unknown[] = [],
    claims?: Record<string, unknown>,
  ): Promise<any> => {
    await as(id, claims);
    return (
      await db.query<{ result: any }>(
        `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) result`,
        args,
      )
    ).rows[0].result;
  };
  const run = (id: string, command: Record<string, unknown>) =>
    rpc(id, "darsino_mutate", [JSON.stringify({ ...command, actorId: id })]);
  const applyFix = async () => {
    await admin();
    await db.exec(await accessMigration());
  };
  const file = async (
    owner: string,
    purpose: "avatar" | "chat",
    conversation?: string,
  ) => {
    await admin();
    const id = (await db.query<{ id: string }>("select gen_random_uuid() id"))
      .rows[0].id;
    await db.query(
      "insert into public.darsino_files(id,owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,state,conversation_id) values($1,$2,$3,$4,$5,$6,$7,1,'ready',$8)",
      [
        id,
        owner,
        purpose,
        purpose === "avatar" ? "darsino-avatars" : "darsino-chat-files",
        `${owner}/${id}`,
        purpose === "avatar" ? "photo.jpg" : "notes.pdf",
        purpose === "avatar" ? "image/jpeg" : "application/pdf",
        conversation ?? null,
      ],
    );
    return id;
  };
  return { db, ids, group, sessions, admin, as, rpc, run, applyFix, file };
}

test(
  "only selected avatars are shared; privacy and blocks still apply",
  { timeout: 60000 },
  async () => {
    const f = await fixture();
    const { db, ids, rpc, run, file } = f;
    try {
      const oldAvatar = await file(ids.tutor, "avatar");
      const selectedAvatar = await file(ids.tutor, "avatar");
      const snapshot = () => rpc(ids.outsider, "darsino_snapshot");
      // Confirm that the regression test reaches the original disclosure.
      assert.ok(
        (await snapshot()).market.files.some((v: any) => v.id === oldAvatar),
      );
      assert.equal(
        (await rpc(ids.outsider, "darsino_get_file", [oldAvatar])).id,
        oldAvatar,
      );
      await rpc(ids.tutor, "darsino_set_avatar", [selectedAvatar]);
      await f.applyFix();
      const shared = (await snapshot()).market.files;
      assert.ok(shared.some((v: any) => v.id === selectedAvatar));
      assert.ok(!shared.some((v: any) => v.id === oldAvatar));
      await assert.rejects(rpc(ids.outsider, "darsino_get_file", [oldAvatar]));
      assert.equal(
        (await rpc(ids.tutor, "darsino_get_file", [oldAvatar])).id,
        oldAvatar,
      );
      const setPrivacy = (
        avatarVisibility: "everyone" | "contacts" | "nobody",
      ) =>
        run(ids.tutor, {
          type: "account-settings",
          publicId: "audit_tutor",
          settings: { ...defaultAccountSettings, avatarVisibility },
        });
      await setPrivacy("contacts");
      await assert.rejects(
        rpc(ids.outsider, "darsino_get_file", [selectedAvatar]),
      );
      const request = await run(ids.outsider, {
        type: "contact-request",
        peerId: ids.tutor,
      });
      await run(ids.tutor, {
        type: "contact-decide",
        requestId: request.id,
        accept: true,
      });
      assert.equal(
        (await rpc(ids.outsider, "darsino_get_file", [selectedAvatar])).id,
        selectedAvatar,
      );
      await assert.rejects(rpc(ids.outsider, "darsino_get_file", [oldAvatar]));
      await setPrivacy("nobody");
      await assert.rejects(
        rpc(ids.outsider, "darsino_get_file", [selectedAvatar]),
      );
      await setPrivacy("everyone");
      await run(ids.tutor, {
        type: "block-user",
        peerId: ids.outsider,
        blocked: true,
      });
      await assert.rejects(
        rpc(ids.outsider, "darsino_get_file", [selectedAvatar]),
      );
      await run(ids.tutor, {
        type: "block-user",
        peerId: ids.outsider,
        blocked: false,
      });
      await f.admin();
      await db.query(
        "update public.darsino_profiles set is_suspended=true where id=$1",
        [ids.tutor],
      );
      await assert.rejects(
        rpc(ids.outsider, "darsino_get_file", [selectedAvatar]),
      );
      assert.ok(
        !(await snapshot()).market.files.some(
          (v: any) => v.id === selectedAvatar,
        ),
      );
      await f.admin();
      await db.query(
        "update public.darsino_profiles set is_suspended=false where id=$1",
        [ids.tutor],
      );
      assert.equal(
        (await rpc(ids.outsider, "darsino_get_file", [selectedAvatar])).id,
        selectedAvatar,
      );
      await rpc(ids.tutor, "darsino_set_avatar", [null]);
      await assert.rejects(
        rpc(ids.outsider, "darsino_get_file", [selectedAvatar]),
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "blocking prevents group and individual requests and stale approvals in either direction",
  { timeout: 60000 },
  async () => {
    const f = await fixture();
    const { db, ids, group, run } = f;
    const lesson = {
      kind: "lesson",
      tutorId: ids.tutor,
      subtitle: "Matematika",
      startsAt: "2099-11-01T09:00:00Z",
      endsAt: "2099-11-01T10:00:00Z",
    };
    const groupRequest = { kind: "group", tutorId: ids.tutor, groupId: group };
    try {
      await run(ids.tutor, {
        type: "block-user",
        peerId: ids.student,
        blocked: true,
      });
      const baseline = await run(ids.student, {
        type: "request",
        request: lesson,
      });
      assert.ok(baseline.id);
      assert.equal(baseline.market.applications.length, 1);
      await f.applyFix();
      await assert.rejects(
        run(ids.student, { type: "request", request: lesson }),
        /cheklangan/,
      );
      await assert.rejects(
        run(ids.student, { type: "request", request: groupRequest }),
        /cheklangan/,
      );
      await assert.rejects(
        run(ids.tutor, {
          type: "decide",
          requestId: baseline.id,
          decision: "approved",
          note: "",
        }),
        /cheklangan/,
      );
      await run(ids.tutor, {
        type: "block-user",
        peerId: ids.student,
        blocked: false,
      });
      const pendingGroup = await run(ids.student, {
        type: "request",
        request: groupRequest,
      });
      assert.ok(pendingGroup.id);
      await run(ids.student, {
        type: "block-user",
        peerId: ids.tutor,
        blocked: true,
      });
      await assert.rejects(
        run(ids.student, { type: "request", request: lesson }),
        /cheklangan/,
      );
      await assert.rejects(
        run(ids.student, { type: "request", request: groupRequest }),
        /cheklangan/,
      );
      await assert.rejects(
        run(ids.tutor, {
          type: "decide",
          requestId: pendingGroup.id,
          decision: "approved",
          note: "",
        }),
        /cheklangan/,
      );
      await run(ids.student, {
        type: "block-user",
        peerId: ids.tutor,
        blocked: false,
      });
      const existing = await run(ids.student, {
        type: "request",
        request: lesson,
      });
      assert.equal(existing.id, baseline.id);
      const accepted = await run(ids.tutor, {
        type: "decide",
        requestId: pendingGroup.id,
        decision: "approved",
        note: "",
      });
      assert.equal(
        accepted.market.enrollments.filter((e: any) => e.active).length,
        1,
      );
      await f.as(ids.student);
      await assert.rejects(
        db.query("select public.darsino_mutate_access_base($1)", [
          JSON.stringify({
            type: "request",
            actorId: ids.student,
            request: lesson,
          }),
        ]),
        /permission denied/,
      );
      await assert.rejects(
        f.rpc(ids.student, "darsino_mutate", [
          JSON.stringify({
            type: "request",
            actorId: ids.tutor,
            request: lesson,
          }),
        ]),
        /Akkaunt/,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "file and text sends share one quota while file retries stay idempotent",
  { timeout: 60000 },
  async () => {
    const f = await fixture();
    const { db, ids, rpc } = f;
    const conversation = `dm:${ids.student}:${ids.tutor}`;
    const seedQuota = async (used: number) => {
      await f.admin();
      await db.query(
        "insert into public.darsino_account_limits(user_id,bucket,window_start,used) values($1,'message',to_timestamp(floor(extract(epoch from now())/60)*60),$2) on conflict(user_id,bucket) do update set window_start=excluded.window_start,used=excluded.used",
        [ids.student, used],
      );
    };
    const sendText = () =>
      f.run(ids.student, {
        type: "message",
        conversationId: conversation,
        text: "Salom",
      });
    // Expected failures use savepoints so all quota checks share PostgreSQL now().
    const rejected = async (operation: () => Promise<unknown>) => {
      await db.exec("savepoint expected_failure");
      await assert.rejects(operation, /limiti/);
      await db.exec(
        "rollback to savepoint expected_failure; release savepoint expected_failure",
      );
    };
    try {
      const baselineFile = await f.file(ids.student, "chat", conversation);
      await seedQuota(60);
      assert.ok(
        await rpc(ids.student, "darsino_send_file_message", [
          baselineFile,
          "Old bypass",
        ]),
      );
      await f.applyFix();
      const first = await f.file(ids.student, "chat", conversation);
      const second = await f.file(ids.student, "chat", conversation);
      await f.admin();
      await db.exec("begin");
      await seedQuota(59);
      const message = await rpc(ids.student, "darsino_send_file_message", [
        first,
        "Oxirgi ruxsat etilgan xabar",
      ]);
      assert.ok(message);
      assert.equal(
        await rpc(ids.student, "darsino_send_file_message", [
          first,
          "Retry ignored",
        ]),
        message,
      );
      await rejected(sendText);
      await rejected(() =>
        rpc(ids.student, "darsino_send_file_message", [
          second,
          "Cheklangan fayl",
        ]),
      );
      await f.admin();
      assert.equal(
        (
          await db.query<{ used: number }>(
            "select used from public.darsino_account_limits where user_id=$1 and bucket='message'",
            [ids.student],
          )
        ).rows[0].used,
        60,
      );
      assert.equal(
        (
          await db.query<{ n: number }>(
            "select count(*)::int n from public.darsino_message_files where file_id=$1",
            [first],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await db.query<{ n: number }>(
            "select count(*)::int n from public.darsino_notifications where user_id=$1 and title='Yangi fayl'",
            [ids.tutor],
          )
        ).rows[0].n,
        2,
      );
      await seedQuota(59);
      await sendText();
      await rejected(() =>
        rpc(ids.student, "darsino_send_file_message", [
          second,
          "Text filled bucket",
        ]),
      );
      await f.admin();
      await db.exec("commit");
    } finally {
      await db.close();
    }
  },
);

test(
  "managed sessions require matching claims and reject revoked sessions and downgraded MFA",
  { timeout: 60000 },
  async () => {
    const f = await fixture();
    const { db, ids, rpc } = f;
    const sessionId = "90000000-0000-4000-8000-000000000231";
    try {
      await db.exec(
        "create table auth.sessions(id uuid primary key,user_id uuid); create table auth.mfa_factors(user_id uuid,status text,factor_type text)",
      );
      assert.equal(
        (await rpc(ids.student, "darsino_snapshot")).user.id,
        ids.student,
      );
      await f.applyFix();
      await assert.rejects(rpc(ids.student, "darsino_snapshot"));
      await assert.rejects(
        rpc(ids.student, "darsino_snapshot", [], {
          aal: "aal1",
          session_id: "not-a-uuid",
        }),
      );
      await f.admin();
      await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [
        sessionId,
        ids.student,
      ]);
      f.sessions.set(ids.student, sessionId);
      assert.equal(
        (await rpc(ids.student, "darsino_snapshot")).user.id,
        ids.student,
      );
      await assert.rejects(
        rpc(ids.outsider, "darsino_snapshot", [], {
          aal: "aal1",
          session_id: sessionId,
        }),
      );
      await f.admin();
      await db.query(
        "insert into auth.mfa_factors(user_id,status,factor_type) values($1,'verified','totp')",
        [ids.student],
      );
      await assert.rejects(rpc(ids.student, "darsino_snapshot"));
      const elevated = { aal: "aal2", session_id: sessionId };
      assert.equal(
        (await rpc(ids.student, "darsino_snapshot", [], elevated)).user.id,
        ids.student,
      );
      await f.admin();
      await db.query("delete from auth.sessions where id=$1", [sessionId]);
      await assert.rejects(rpc(ids.student, "darsino_snapshot", [], elevated));
      await f.admin();
      await db.query(
        "update public.darsino_profiles set is_suspended=true where id=$1",
        [ids.tutor],
      );
      await assert.rejects(rpc(ids.tutor, "darsino_snapshot"));
    } finally {
      await db.close();
    }
  },
);
