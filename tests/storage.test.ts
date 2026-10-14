import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
import type { FileAsset } from "../src/state/domain";

const student = "10000000-0000-4000-8000-000000000001";
const outsider = "10000000-0000-4000-8000-000000000002";
const tutor = "20000000-0000-4000-8000-000000000001";
const otherTutor = "20000000-0000-4000-8000-000000000002";
const mod = "30000000-0000-4000-8000-000000000001";
const unconfirmed = "40000000-0000-4000-8000-000000000001";
const profile = {
  name: "SQL Test",
  city: "Toshkent",
  area: "Yunusobod",
  interests: ["Ingliz tili"],
  goal: "IELTS / CEFR",
};
const teacher = {
  subjects: ["Ingliz tili"],
  specialty: "IELTS",
  experience: 4,
  proof: "Certificate text",
  bio: "IELTS va umumiy ingliz tili darslari",
  price: 90000,
  modes: ["Onlayn"],
  availability: ["18:00"],
};

test(
  "Storage metadata RLS and file RPCs enforce actor, attachment and deletion boundaries",
  { timeout: 60000 },
  async (t) => {
    const db = await supabaseFixture();
    try {
      // A broad policy from a different app must not open Darsino's private buckets.
      await db.exec(
        "create policy another_app on storage.objects for all to public using(true) with check(true)",
      );
      await applyMigrations(db);
      for (const [i, id] of [
        student,
        outsider,
        tutor,
        otherTutor,
        mod,
        unconfirmed,
      ].entries())
        await db.query(
          "insert into auth.users(id,phone,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",
          [
            id,
            `99890123456${i}`,
            id === unconfirmed ? null : new Date().toISOString(),
            JSON.stringify({ role: "moderator" }),
          ],
        );
      const as = async (id: string) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
      };
      const rpc = async <T = any>(
        id: string,
        name: string,
        values: unknown[] = [],
      ) => {
        await as(id);
        const result = await db.query<{ value: T }>(
          `select public.${name}(${values.map((_, i) => `$${i + 1}`).join(",")}) as value`,
          values,
        );
        return result.rows[0].value;
      };
      const mutate = (id: string, command: Record<string, unknown>) =>
        rpc(id, "darsino_mutate", [
          JSON.stringify({ actorId: id, ...command }),
        ]);
      const prepare = (
        id: string,
        purpose: string,
        conversation: string | null = null,
        offering: string | null = null,
        mime = "application/pdf",
        size = 4,
      ) =>
        rpc<FileAsset>(id, "darsino_prepare_upload", [
          purpose,
          "test-file.pdf",
          mime,
          size,
          conversation,
          offering,
        ]);
      const objectCount = async (id: string, f: FileAsset) => {
        await as(id);
        return (
          await db.query(
            "select id from storage.objects where bucket_id=$1 and name=$2",
            [f.bucketId, f.objectPath],
          )
        ).rows.length;
      };
      const insertObject = async (
        id: string,
        f: FileAsset,
        size = f.sizeBytes,
      ) => {
        await as(id);
        await db.query(
          "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
          [
            f.bucketId,
            f.objectPath,
            id,
            JSON.stringify({ size, mimetype: f.mimeType }),
          ],
        );
      };
      const upload = async (
        id: string,
        purpose: string,
        conversation: string | null = null,
        offering: string | null = null,
        mime = "application/pdf",
      ) => {
        const f = await prepare(id, purpose, conversation, offering, mime);
        await insertObject(id, f);
        return rpc<FileAsset>(id, "darsino_finalize_upload", [f.id]);
      };
      for (const id of [student, outsider])
        await mutate(id, { type: "profile", profile });
      for (const id of [tutor, otherTutor])
        await mutate(id, {
          type: "profile",
          role: "tutor",
          profile,
          tutor: teacher,
        });
      await db.exec("reset role");
      await db.query(
        "update public.darsino_profiles set role='moderator',onboarded=true where id=$1",
        [mod],
      );
      for (const id of [tutor, otherTutor])
        await mutate(mod, {
          type: "moderate",
          tutorId: id,
          decision: "approved",
          note: "Tekshirildi",
        });

      await t.test(
        "Auth trigger ignores a forged role and unconfirmed/suspended accounts are blocked",
        async () => {
          assert.equal(
            (await rpc(student, "darsino_snapshot")).user.role,
            "student",
          );
          await assert.rejects(
            rpc(unconfirmed, "darsino_snapshot"),
            /Tasdiqlangan email/,
          );
          await assert.rejects(
            rpc(student, "darsino_snapshot_core"),
            /permission denied/,
          );
          await assert.rejects(
            rpc(student, "darsino_mutate_core", ["{}"]),
            /permission denied/,
          );
          await db.exec("reset role");
          await db.query(
            "update public.darsino_profiles set is_suspended=true where id=$1",
            [outsider],
          );
          await assert.rejects(
            rpc(outsider, "darsino_snapshot"),
            /Akkaunt faol/,
          );
          await db.exec("reset role");
          await db.query(
            "update public.darsino_profiles set is_suspended=false where id=$1",
            [outsider],
          );
        },
      );

      await t.test(
        "prepare restricts MIME, size, purpose, conversation and foreign owners",
        async () => {
          await assert.rejects(
            prepare(student, "avatar", null, null, "image/svg+xml"),
            /turi yoki hajmi/,
          );
          await assert.rejects(
            prepare(student, "avatar", null, null, "image/png", 2097153),
            /turi yoki hajmi/,
          );
          await assert.rejects(prepare(student, "verification"), /Repetitor/);
          await assert.rejects(
            prepare(outsider, "chat", `dm:${student}:${tutor}`),
            /Suhbatga/,
          );
          await assert.rejects(
            prepare(student, "avatar", "forged", null, "image/png"),
            /bog‘lanishi/,
          );
          await assert.rejects(
            rpc(student, "darsino_prepare_upload", [
              "avatar",
              "../evil.png",
              "image/png",
              4,
            ]),
            /nomi/,
          );
        },
      );

      await t.test(
        "only a reserved path uploads; finalize checks stored size and immutable objects resist broad policies",
        async () => {
          const f = await prepare(student, "avatar", null, null, "image/png");
          assert.equal(f.objectPath, `${student}/${f.id}.png`);
          await assert.rejects(
            rpc(student, "darsino_finalize_upload", [f.id]),
            /Storage fayli/,
          );
          await assert.rejects(insertObject(outsider, f), /row-level security/);
          await assert.rejects(
            insertObject(student, {
              ...f,
              objectPath: `${outsider}/forged.png`,
            }),
            /row-level security/,
          );
          await insertObject(student, f, 5);
          await assert.rejects(
            rpc(student, "darsino_finalize_upload", [f.id]),
            /haqiqiy hajmi/,
          );
          await db.exec("reset role");
          await db.query(
            "update storage.objects set metadata=$1 where name=$2",
            [JSON.stringify({ size: 4, mimetype: "image/png" }), f.objectPath],
          );
          assert.equal(
            (await rpc<FileAsset>(student, "darsino_finalize_upload", [f.id]))
              .state,
            "ready",
          );
          await rpc(student, "darsino_set_avatar", [f.id]);
          assert.equal(await objectCount(outsider, f), 0);
          await as(student);
          assert.equal(
            (
              await db.query(
                "update storage.objects set metadata='{}' where name=$1 returning id",
                [f.objectPath],
              )
            ).rows.length,
            0,
          );
          assert.equal(
            (
              await db.query(
                "delete from storage.objects where name=$1 returning id",
                [f.objectPath],
              )
            ).rows.length,
            0,
          );
          await assert.rejects(
            rpc(outsider, "darsino_set_avatar", [f.id]),
            /tegishli/,
          );
          const publicAvatar = await upload(
            tutor,
            "avatar",
            null,
            null,
            "image/jpeg",
          );
          await rpc(tutor, "darsino_set_avatar", [publicAvatar.id]);
          assert.equal(await objectCount(student, publicAvatar), 1);
          await as(student);
          await assert.rejects(
            db.query("select * from public.darsino_files"),
            /permission denied/,
          );
        },
      );

      let certificate: FileAsset;
      await t.test(
        "verification bytes are private; moderation updates the document without exposing it to students",
        async () => {
          certificate = await upload(tutor, "verification");
          const document = await rpc(tutor, "darsino_submit_document", [
            certificate.id,
            "certificate",
            "IELTS certificate",
          ]);
          assert.equal(
            await rpc(tutor, "darsino_submit_document", [
              certificate.id,
              "certificate",
              "IELTS certificate",
            ]),
            document,
          );
          assert.equal(
            (await rpc(tutor, "darsino_snapshot")).market.tutorProfiles.find(
              (p: any) => p.userId === tutor,
            ).verification,
            "pending",
          );
          assert.equal(await objectCount(student, certificate), 0);
          assert.equal(await objectCount(otherTutor, certificate), 0);
          assert.equal(await objectCount(mod, certificate), 1);
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [certificate.id]),
            /Bog‘langan/,
          );
          const moderated = await mutate(mod, {
            type: "moderate",
            tutorId: tutor,
            decision: "approved",
            note: "Asl hujjat tekshirildi",
          });
          assert.equal(moderated.market.tutorDocuments[0].status, "approved");
          assert.equal(
            (await rpc(student, "darsino_snapshot")).market.tutorDocuments
              .length,
            0,
          );
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [certificate.id]),
            /Bog‘langan/,
          );
        },
      );

      const start = Date.now() + 86400000;
      const offering = {
        title: "IELTS group",
        subject: "Ingliz tili",
        type: "group",
        capacity: 5,
        price: 90000,
        mode: "Onlayn",
        area: "Yunusobod",
        location: "https://example.com/class",
        days: "Haftalik",
        benefits: [],
        sessions: [
          {
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(start + 3600000).toISOString(),
          },
        ],
      };
      const group = await mutate(tutor, { type: "offering", offering });
      const groupId = group.id as string;
      const sessionId = group.market.sessions.find(
        (s: any) => s.offeringId === groupId,
      ).id;
      const application = await mutate(student, {
        type: "request",
        request: { kind: "group", tutorId: tutor, groupId },
      });
      let material: FileAsset;
      let attachment: string;
      await t.test(
        "materials require approved enrollment, correct session and owner; hidden material loses access",
        async () => {
          await assert.rejects(
            prepare(otherTutor, "material", null, groupId),
            /dars egasi/,
          );
          material = await upload(tutor, "material", null, groupId);
          await assert.rejects(
            rpc(tutor, "darsino_attach_lesson_file", [
              material.id,
              "Worksheet",
              "99999999-0000-4000-8000-000000000001",
            ]),
            /mos emas/,
          );
          attachment = await rpc(tutor, "darsino_attach_lesson_file", [
            material.id,
            "Worksheet",
            sessionId,
          ]);
          assert.equal(await objectCount(student, material), 0); // Pending is not enrollment.
          await mutate(tutor, {
            type: "decide",
            requestId: application.id,
            decision: "approved",
            note: "",
          });
          assert.equal(await objectCount(student, material), 1);
          assert.equal(await objectCount(outsider, material), 0);
          assert.equal(await objectCount(mod, material), 0);
          assert.equal(
            await rpc(tutor, "darsino_attach_lesson_file", [
              material.id,
              "Worksheet",
              sessionId,
            ]),
            attachment,
          );
          await assert.rejects(
            rpc(otherTutor, "darsino_manage_lesson_file", [
              attachment,
              false,
              false,
            ]),
            /tegishli emas/,
          );
          await rpc(tutor, "darsino_manage_lesson_file", [
            attachment,
            false,
            false,
          ]);
          assert.equal(await objectCount(student, material), 0);
          await rpc(tutor, "darsino_manage_lesson_file", [
            attachment,
            true,
            false,
          ]);
          assert.equal(await objectCount(student, material), 1);
          assert.equal(
            (await rpc(student, "darsino_snapshot")).market.lessonFiles.length,
            1,
          );
        },
      );

      await t.test(
        "covers follow listing/member visibility and can be unlinked before deletion",
        async () => {
          const cover = await upload(
            tutor,
            "cover",
            null,
            groupId,
            "image/png",
          );
          await assert.rejects(
            rpc(otherTutor, "darsino_set_cover", [groupId, cover.id]),
            /dars egasi/,
          );
          await rpc(tutor, "darsino_set_cover", [groupId, cover.id]);
          assert.equal(await objectCount(outsider, cover), 1);
          await mutate(tutor, {
            type: "offering-visibility",
            offeringId: groupId,
            published: false,
          });
          assert.equal(await objectCount(outsider, cover), 0);
          assert.equal(await objectCount(student, cover), 1);
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [cover.id]),
            /Bog‘langan/,
          );
          await rpc(tutor, "darsino_set_cover", [groupId, null]);
          await rpc(tutor, "darsino_begin_file_delete", [cover.id]);
          await as(tutor);
          await db.query("delete from storage.objects where name=$1", [
            cover.objectPath,
          ]);
          await rpc(tutor, "darsino_forget_file", [cover.id]);
          await mutate(tutor, {
            type: "offering-visibility",
            offeringId: groupId,
            published: true,
          });
        },
      );

      await t.test(
        "chat files become visible only to the actual recipient after a message is linked",
        async () => {
          const f = await upload(student, "chat", `dm:${student}:${tutor}`);
          assert.equal(await objectCount(tutor, f), 0);
          const message = await rpc(student, "darsino_send_file_message", [
            f.id,
            "Worksheet question",
          ]);
          assert.equal(
            await rpc(student, "darsino_send_file_message", [
              f.id,
              "Worksheet question",
            ]),
            message,
          );
          assert.equal(await objectCount(tutor, f), 1);
          assert.equal(await objectCount(outsider, f), 0);
          assert.equal(await objectCount(mod, f), 0);
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [f.id]),
            /topilmadi/,
          );
          await assert.rejects(
            rpc(student, "darsino_begin_file_delete", [f.id]),
            /Bog‘langan/,
          );
          const snapshot = await rpc(tutor, "darsino_snapshot");
          assert.deepEqual(
            snapshot.market.messages.find((m: any) => m.id === message)
              .attachmentIds,
            [f.id],
          );
        },
      );

      await t.test(
        "Realtime SELECT policies expose only each account's rows and forbid direct writes",
        async () => {
          await as(outsider);
          assert.equal(
            (await db.query("select * from public.darsino_enrollments")).rows
              .length,
            0,
          );
          assert.equal(
            (await db.query("select * from public.darsino_messages")).rows
              .length,
            0,
          );
          assert.equal(
            (
              await db.query(
                "select * from public.darsino_notifications where user_id<>$1",
                [outsider],
              )
            ).rows.length,
            0,
          );
          await as(tutor);
          assert.equal(
            (await db.query("select * from public.darsino_enrollments")).rows
              .length,
            1,
          );
          await as(student);
          assert.equal(
            (await db.query("select * from public.darsino_enrollments")).rows
              .length,
            1,
          );
          await assert.rejects(
            db.query("update public.darsino_enrollments set active=false"),
            /permission denied/,
          );
          await db.exec("set role anon");
          assert.equal(
            (
              await db.query(
                "select * from storage.objects where bucket_id like 'darsino-%'",
              )
            ).rows.length,
            0,
          );
          await assert.rejects(
            db.query("select public.darsino_snapshot()"),
            /permission denied/,
          );
        },
      );

      await t.test(
        "removing membership revokes material access; deletion reserves state before removing bytes",
        async () => {
          await mutate(tutor, {
            type: "remove-participant",
            offeringId: groupId,
            studentId: student,
          });
          assert.equal(await objectCount(student, material!), 0);
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [material!.id]),
            /Bog‘langan/,
          );
          await rpc(tutor, "darsino_manage_lesson_file", [
            attachment!,
            true,
            true,
          ]);
          await rpc(tutor, "darsino_begin_file_delete", [material!.id]);
          await assert.rejects(
            rpc(tutor, "darsino_attach_lesson_file", [
              material!.id,
              "Too late",
              sessionId,
            ]),
            /Tayyor fayl/,
          );
          await assert.rejects(
            rpc(tutor, "darsino_forget_file", [material!.id]),
            /Storage API/,
          );
          await as(tutor);
          assert.equal(
            (
              await db.query(
                "delete from storage.objects where name=$1 returning id",
                [material!.objectPath],
              )
            ).rows.length,
            1,
          );
          await rpc(tutor, "darsino_forget_file", [material!.id]);
          await rpc(tutor, "darsino_forget_file", [material!.id]); // Retrying a lost response is safe.
          await assert.rejects(
            rpc(tutor, "darsino_get_file", [material!.id]),
            /huquqi yo‘q/,
          );
          const stale = await prepare(
            student,
            "avatar",
            null,
            null,
            "image/png",
          );
          await db.exec("reset role");
          await db.query(
            "update public.darsino_files set created_at=now()-interval '2 hours' where id=$1",
            [stale.id],
          );
          await assert.rejects(
            insertObject(student, stale),
            /row-level security/,
          );
        },
      );

      await t.test(
        "rejected replacement documents can be removed while approved originals stay protected",
        async () => {
          const replacement = await upload(tutor, "verification");
          await rpc(tutor, "darsino_submit_document", [
            replacement.id,
            "diploma",
            "Replacement diploma",
          ]);
          await mutate(mod, {
            type: "moderate",
            tutorId: tutor,
            decision: "rejected",
            note: "Aniqroq nusxa kerak",
          });
          const snapshot = await rpc(tutor, "darsino_snapshot");
          assert.equal(
            snapshot.market.tutorDocuments.find(
              (d: any) => d.fileId === replacement.id,
            ).status,
            "rejected",
          );
          await assert.rejects(
            rpc(tutor, "darsino_begin_file_delete", [certificate!.id]),
            /Bog‘langan/,
          );
          await rpc(tutor, "darsino_begin_file_delete", [replacement.id]);
          await as(tutor);
          await db.query("delete from storage.objects where name=$1", [
            replacement.objectPath,
          ]);
          await rpc(tutor, "darsino_forget_file", [replacement.id]);
        },
      );

      await t.test(
        "all-in-one installer can be rerun without losing live rows or reopening helpers",
        async () => {
          const before = await rpc(student, "darsino_snapshot");
          await db.exec("reset role");
          await db.exec(
            await readFile(
              new URL(
                "../supabase/Darsino_Supabase_setup.sql",
                import.meta.url,
              ),
              "utf8",
            ),
          );
          const after = await rpc(student, "darsino_snapshot");
          assert.deepEqual(after.market.messages, before.market.messages);
          assert.deepEqual(
            after.market.applications,
            before.market.applications,
          );
          assert.equal(after.user.name, before.user.name);
          await assert.rejects(
            rpc(student, "darsino_snapshot_core"),
            /permission denied/,
          );
          await db.exec("reset role");
          const buckets = await db.query<{ public: boolean }>(
            "select public from storage.buckets where id like 'darsino-%'",
          );
          assert.equal(buckets.rows.length, 5);
          assert.ok(buckets.rows.every((b) => !b.public));
          await db.exec(
            await readFile(
              new URL("../supabase/admin/02_healthcheck.sql", import.meta.url),
              "utf8",
            ),
          );
        },
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "SQL Editor installer supports a fresh project and an existing baseline database",
  { timeout: 60000 },
  async () => {
    const setup = await readFile(
      new URL("../supabase/Darsino_Supabase_setup.sql", import.meta.url),
      "utf8",
    );
    for (const upgrade of [false, true]) {
      const db = await supabaseFixture();
      try {
        if (upgrade) {
          await db.exec(
            await readFile(
              new URL(
                "../supabase/migrations/202610140001_marketplace.sql",
                import.meta.url,
              ),
              "utf8",
            ),
          );
          await db.query(
            "insert into auth.users(id,phone) values($1,'998901234567')",
            [student],
          );
          await db.query(
            "insert into public.darsino_profiles(id,name) values($1,'Existing student')",
            [student],
          );
        }
        await db.exec(setup);
        await db.exec(setup);
        if (upgrade)
          assert.equal(
            (
              await db.query<{ name: string }>(
                "select name from public.darsino_profiles where id=$1",
                [student],
              )
            ).rows[0].name,
            "Existing student",
          );
        assert.equal(
          (await db.query("select id from storage.buckets")).rows.length,
          5,
        );
      } finally {
        await db.close();
      }
    }
    const partial = await supabaseFixture();
    try {
      await partial.exec("create table public.darsino_profiles(id uuid)");
      await assert.rejects(partial.exec(setup), /Incomplete Darsino schema/);
      await partial.exec("rollback");
      assert.equal(
        (await partial.query("select id from storage.buckets")).rows.length,
        0,
      );
    } finally {
      await partial.close();
    }
  },
);
