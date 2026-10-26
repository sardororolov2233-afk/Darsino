import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyMigrations,
  seedTutorCertificate,
  supabaseFixture,
} from "./supabaseFixture";

test(
  "Postgres protects tutor coordinates, private video membership, assistant history and atomic quotas",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    const student = "10000000-0000-4000-8000-000000000011",
      outsider = "10000000-0000-4000-8000-000000000012",
      tutor = "20000000-0000-4000-8000-000000000011";
    const profile = {
      name: "Backend Test",
      city: "Toshkent",
      area: "Yunusobod",
      interests: ["Matematika"],
      goal: "DTM",
    };
    const teaching = {
      subjects: ["Matematika"],
      specialty: "DTM",
      experience: 4,
      proof: "Diplom 123",
      bio: "Matematika darslari uchun tajribali ustoz",
      price: 90000,
      modes: ["Oflayn"],
      availability: ["18:00"],
    };
    const as = async (id: string, role = "authenticated") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec(`set role ${role}`);
    };
    const rpc = async (
      id: string,
      name: string,
      values: unknown[] = [],
      role = "authenticated",
    ): Promise<any> => {
      await as(id, role);
      return (
        await db.query<{ value: any }>(
          `select public.${name}(${values.map((_, i) => `$${i + 1}`).join(",")}) value`,
          values,
        )
      ).rows[0].value;
    };
    const command = (id: string, c: Record<string, unknown>) =>
      rpc(id, "darsino_mutate", [JSON.stringify({ actorId: id, ...c })]);
    try {
      await applyMigrations(db);
      for (const id of [student, outsider, tutor])
        await db.query("insert into auth.users(id) values($1)", [id]);
      for (const id of [student, outsider])
        await command(id, { type: "profile", profile });
      await command(tutor, {
        type: "profile",
        role: "tutor",
        profile,
        tutor: { ...teaching, ...(await seedTutorCertificate(db, tutor)) },
      });
      await assert.rejects(
        rpc(student, "oqi_save_tutor_location", [41.3, 69.2, "Test manzil"]),
        /Faqat ustoz/,
      );
      await rpc(tutor, "oqi_save_tutor_location", [
        41.3,
        69.2,
        "Toshkent dars markazi",
      ]);
      await assert.rejects(
        rpc(tutor, "oqi_save_tutor_location", [91, 69.2, "Manzil"]),
        /Koordinata/,
      );
      assert.equal(
        (await rpc(student, "oqi_nearby_tutors", [[tutor]])).length,
        0,
      );
      await db.exec("reset role");
      await db.query(
        "update public.darsino_tutors set verification='approved' where user_id=$1",
        [tutor],
      );
      const near = await rpc(student, "oqi_nearby_tutors", [
        [tutor],
        41.3,
        69.2,
        5,
      ]);
      assert.equal(near[0].tutorId, tutor);
      assert.ok(near[0].distanceKm < 0.001);
      assert.deepEqual(
        await rpc(student, "oqi_nearby_tutors", [[tutor], 0, 0, 5]),
        [],
      );
      assert.deepEqual(await rpc(student, "oqi_nearby_tutors", [[]]), []);
      await assert.rejects(
        rpc(student, "oqi_nearby_tutors", [[tutor], null, 69, 5]),
        /Koordinata/,
      );
      await as(student);
      await assert.rejects(
        db.query("select * from public.oqi_tutor_locations"),
        /permission denied/,
      );

      const created = await command(tutor, {
        type: "offering",
        offering: {
          title: "Backend test guruhi",
          subject: "Matematika",
          type: "group",
          capacity: 10,
          price: 90000,
          mode: "Oflayn",
          area: "Yunusobod",
          location: "Dars markazi",
          days: "Dushanba",
          benefits: ["Video"],
          sessions: [
            {
              startsAt: "2099-01-01T10:00:00Z",
              endsAt: "2099-01-01T11:00:00Z",
            },
          ],
        },
      });
      const asset = await rpc(tutor, "darsino_prepare_upload", [
        "material",
        "lesson.mp4",
        "video/mp4",
        1024,
        null,
        created.id,
      ]);
      assert.ok(asset.objectPath.endsWith(".mp4"));
      await db.exec("reset role");
      assert.equal(
        (
          await db.query<{ public: boolean }>(
            "select public from storage.buckets where id='darsino-lesson-materials'",
          )
        ).rows[0].public,
        false,
      );
      await db.query(
        "insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)",
        [
          asset.bucketId,
          asset.objectPath,
          JSON.stringify({ size: 1024, mimetype: "video/mp4" }),
        ],
      );
      await rpc(tutor, "darsino_finalize_upload", [asset.id]);
      const materialId = await rpc(tutor, "darsino_attach_lesson_file", [
        asset.id,
        "Birinchi video",
      ]);
      await assert.rejects(
        rpc(student, "darsino_get_file", [asset.id]),
        /huquqi/,
      );
      const application = await command(student, {
        type: "request",
        request: { kind: "group", tutorId: tutor, groupId: created.id },
      });
      await command(tutor, {
        type: "decide",
        requestId: application.id,
        decision: "approved",
        note: "Qabul qilindi",
      });
      assert.equal(
        (await rpc(student, "darsino_get_file", [asset.id])).id,
        asset.id,
      );
      await assert.rejects(
        rpc(outsider, "darsino_get_file", [asset.id]),
        /huquqi/,
      );
      await rpc(tutor, "darsino_manage_lesson_file", [materialId, false]);
      await assert.rejects(
        rpc(student, "darsino_get_file", [asset.id]),
        /huquqi/,
      );
      await rpc(tutor, "darsino_manage_lesson_file", [materialId, true]);
      await command(tutor, {
        type: "remove-participant",
        offeringId: created.id,
        studentId: student,
      });
      await assert.rejects(
        rpc(student, "darsino_get_file", [asset.id]),
        /huquqi/,
      );

      const request1 = "40000000-0000-4000-8000-000000000001";
      const reservation = await rpc(student, "oqi_ai_begin_request", [
        request1,
        null,
        "Kasr nima?",
      ]);
      const convo = reservation.conversationId;
      await assert.rejects(
        rpc(outsider, "oqi_ai_history", [convo]),
        /topilmadi/,
      );
      await assert.rejects(
        rpc(tutor, "oqi_ai_begin_request", [request1, null, "Salom"]),
        /o‘quvchi/,
      );
      await assert.rejects(
        rpc(student, "oqi_ai_finish_request", [student, request1, "forged"]),
        /permission denied/,
      );
      await assert.rejects(
        rpc(student, "oqi_ai_begin_request", [
          "40000000-0000-4000-8000-000000000002",
          convo,
          "Yana",
        ]),
        /kuting/,
      );
      await rpc(
        student,
        "oqi_ai_finish_request",
        [student, request1, "Butunning qismi"],
        "service_role",
      );
      const saved = await rpc(student, "oqi_ai_history", [convo]);
      assert.deepEqual(
        saved.messages.map((m: any) => m.content),
        ["Kasr nima?", "Butunning qismi"],
      );
      assert.equal(
        (
          await rpc(student, "oqi_ai_begin_request", [
            request1,
            convo,
            "Kasr nima?",
          ])
        ).reply,
        "Butunning qismi",
      );
      await assert.rejects(
        rpc(outsider, "oqi_ai_begin_request", [
          "40000000-0000-4000-8000-000000000099",
          convo,
          "O‘zgalar suhbatiga",
        ]),
        /topilmadi/,
      );
      for (let i = 2; i <= 5; i++) {
        const reqId = `40000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
        await rpc(student, "oqi_ai_begin_request", [reqId, convo, "Savol"]);
        await rpc(
          student,
          "oqi_ai_finish_request",
          [student, reqId, i === 2 ? null : "Javob"],
          "service_role",
        );
      }
      assert.equal(
        (await rpc(student, "oqi_ai_history", [convo])).messages.length,
        8,
      );
      await assert.rejects(
        rpc(student, "oqi_ai_begin_request", [
          "40000000-0000-4000-8000-000000000006",
          convo,
          "Limit",
        ]),
        /daqiqada/,
      );
      // Expired pending requests are released; a rolling daily quota survives
      // new conversations and is distinct from the one-minute throttle.
      await db.exec("reset role");
      await db.query(
        "update public.oqi_ai_requests set created_at=now()-interval '2 minutes' where user_id=$1",
        [student],
      );
      const staleId = "40000000-0000-4000-8000-000000000006";
      await rpc(student, "oqi_ai_begin_request", [
        staleId,
        convo,
        "Javobsiz qolgan savol",
      ]);
      await db.exec("reset role");
      await db.query(
        "update public.oqi_ai_requests set created_at=now()-interval '70 seconds' where id=$1",
        [staleId],
      );
      const nextId = "40000000-0000-4000-8000-000000000007";
      await rpc(student, "oqi_ai_begin_request", [
        nextId,
        convo,
        "Yangi savol",
      ]);
      await rpc(
        student,
        "oqi_ai_finish_request",
        [student, nextId, "Yangi javob"],
        "service_role",
      );
      await db.exec("reset role");
      assert.equal(
        (
          await db.query<{ status: string }>(
            "select status from public.oqi_ai_requests where id=$1",
            [staleId],
          )
        ).rows[0].status,
        "failed",
      );
      await db.query(
        "insert into public.oqi_ai_requests(id,user_id,conversation_id,status,created_at) select gen_random_uuid(),$1,$2,'failed',now()-interval '2 minutes' from generate_series(1,23)",
        [student, convo],
      );
      await assert.rejects(
        rpc(student, "oqi_ai_begin_request", [
          "40000000-0000-4000-8000-000000000008",
          null,
          "Boshqa suhbatdagi limit",
        ]),
        /24 soatlik/,
      );
      await rpc(tutor, "oqi_delete_tutor_location");
      assert.equal(await rpc(tutor, "oqi_own_tutor_location"), null);
      assert.deepEqual(await rpc(outsider, "oqi_nearby_tutors", [[tutor]]), []);
      await db.exec("reset role");
      await db.query(
        "update public.darsino_profiles set is_suspended=true where id=$1",
        [outsider],
      );
      await assert.rejects(rpc(outsider, "oqi_ai_history"));
      await as(student);
      await assert.rejects(
        db.query("select * from public.oqi_ai_messages"),
        /permission denied/,
      );
      await as(student, "anon");
      await assert.rejects(
        db.query("select public.oqi_ai_history(null)"),
        /permission denied/,
      );
      await db.exec("reset role");
      await db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610160001_locations_ai.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.equal(
        (await rpc(student, "oqi_ai_history", [convo])).messages.length,
        10,
      );
    } finally {
      await db.close();
    }
  },
);
