import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

test(
  "classroom SQL enforces membership, private keys, server grading, fixed timers and idempotency",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const tutor = randomUUID(),
        student = randomUUID(),
        peer = randomUUID(),
        other = randomUUID();
      for (const id of [tutor, student, peer, other])
        await db.query("insert into auth.users(id) values($1)", [id]);
      await db.exec(
        "update public.darsino_profiles set onboarded=true,name='Sinov'",
      );
      for (const id of [tutor, other]) {
        await db.query(
          "update public.darsino_profiles set role='tutor' where id=$1",
          [id],
        );
        await db.query(
          "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
          [id, JSON.stringify({ subjects: ["Matematika"] })],
        );
      }
      const group = (
        await db.query<{ id: string }>(
          "insert into public.darsino_offerings(tutor_id,capacity,data) values($1,10,$2) returning id",
          [
            tutor,
            JSON.stringify({
              title: "Algebra",
              subject: "Matematika",
              type: "group",
            }),
          ],
        )
      ).rows[0].id;
      await db.query(
        "insert into public.darsino_enrollments(student_id,offering_id) values($1,$2)",
        [student, group],
      );
      const as = async (id: string) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
      };
      const rpc = async (id: string, name: string, params: unknown[] = []) => {
        await as(id);
        return (
          await db.query<{ result: any }>(
            `select public.${name}(${params.map((_, i) => `$${i + 1}`).join(",")}) result`,
            params,
          )
        ).rows[0].result;
      };
      const admin = async (sql: string, params: unknown[] = []) => {
        await db.exec("reset role");
        return db.query<Record<string, any>>(sql, params);
      };
      assert.equal(
        (await rpc(peer, "oqi_classroom_snapshot")).groups.length,
        0,
      );
      const messageId = randomUUID();
      const message = await rpc(tutor, "oqi_group_message_send", [
        group,
        messageId,
        "Dars soat 18:00 da",
        true,
      ]);
      assert.deepEqual(
        await rpc(tutor, "oqi_group_message_send", [
          group,
          messageId,
          "Dars soat 18:00 da",
          true,
        ]),
        message,
      );
      await assert.rejects(
        rpc(tutor, "oqi_group_message_send", [
          group,
          messageId,
          "Boshqa matn",
          true,
        ]),
        /kaliti/,
      );
      await assert.rejects(
        rpc(peer, "oqi_group_messages_read", [group]),
        /ruxsat/,
      );
      await assert.rejects(
        rpc(student, "oqi_group_message_send", [
          group,
          randomUUID(),
          "E’lon",
          true,
        ]),
        /faqat/,
      );
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).groups[0].unread,
        1,
      );
      await rpc(student, "oqi_group_mark_read", [group, message.createdAt]);
      await rpc(student, "oqi_group_mark_read", [
        group,
        "2000-01-01T00:00:00Z",
      ]);
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).groups[0].unread,
        0,
      );
      const reply = await rpc(student, "oqi_group_message_send", [
        group,
        randomUUID(),
        "Tushunarli",
        false,
      ]);
      assert.equal(
        (await rpc(tutor, "oqi_group_messages_read", [group, reply.id, 1]))[0]
          .id,
        messageId,
      );
      await as(peer);
      assert.equal(
        (await db.query("select * from public.oqi_group_messages")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into public.oqi_group_messages(id,offering_id,sender_id,text) values($1,$2,$3,'bypass')",
          [randomUUID(), group, peer],
        ),
        /permission denied/,
      );
      const draft = {
        id: randomUUID(),
        offeringId: group,
        title: "Algebra mock",
        subject: "Matematika",
        source: "manual",
        fileId: null,
        questionCount: 2,
        minutes: 5,
        difficulty: "medium",
        scoring: "uniform",
        questions: [
          {
            prompt: "2+2?",
            options: ["4", "3", "1", "2"],
            correct: 0,
            answerKey: [0, 1],
          },
          { prompt: "3+3?", options: ["5", "6", "7", "8"] },
        ],
        answerKey: [0, null],
        status: "draft",
      };
      const save = (actor: string, value: object) =>
        rpc(actor, "oqi_mock_test_save", [JSON.stringify(value)]);
      await save(tutor, draft);
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).tests.length,
        0,
      );
      await assert.rejects(
        save(other, { ...draft, id: randomUUID() }),
        /O‘z guruhingiz/,
      );
      await assert.rejects(save(student, draft), /O‘z guruhingiz/);
      await assert.rejects(
        save(tutor, { ...draft, status: "published" }),
        /A–D/,
      );
      const published = { ...draft, answerKey: [0, 1], status: "published" };
      await save(tutor, published);
      const publicTest = (await rpc(student, "oqi_classroom_snapshot"))
        .tests[0];
      assert.equal("answerKey" in publicTest, false);
      assert.deepEqual(Object.keys(publicTest.questions[0]).sort(), [
        "options",
        "prompt",
      ]);
      await as(student);
      await assert.rejects(
        db.query("select answer_key from public.oqi_mock_tests"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "select public.oqi_mock_test_json(t) from public.oqi_mock_tests t",
        ),
        /permission denied/,
      );
      await assert.rejects(rpc(peer, "oqi_mock_begin", [draft.id]), /ruxsat/);
      await assert.rejects(rpc(tutor, "oqi_mock_begin", [draft.id]), /ruxsat/);
      const attempt = await rpc(student, "oqi_mock_begin", [draft.id]);
      assert.deepEqual(
        await rpc(student, "oqi_mock_begin", [draft.id]),
        attempt,
      );
      await save(tutor, published); // Exact network retry remains safe after a student starts.
      await assert.rejects(
        save(tutor, { ...published, title: "Changed test" }),
        /o‘zgartirib/,
      );
      await assert.rejects(
        rpc(student, "oqi_mock_submit", [draft.id, JSON.stringify([0, 1, 2])]),
        /soni/,
      );
      const result = await rpc(student, "oqi_mock_submit", [
        draft.id,
        JSON.stringify([0, null]),
      ]);
      assert.equal(result.correctCount, 1);
      assert.equal(result.percentage, 50);
      assert.equal(result.score, 1);
      assert.deepEqual(
        await rpc(student, "oqi_mock_submit", [
          draft.id,
          JSON.stringify([0, null]),
        ]),
        result,
      );
      await assert.rejects(
        rpc(student, "oqi_mock_submit", [draft.id, JSON.stringify([0, 1])]),
        /Natija saqlangan/,
      );
      assert.equal(
        (await rpc(tutor, "oqi_classroom_snapshot")).attempts[0].percentage,
        50,
      );
      assert.equal(
        (await rpc(peer, "oqi_classroom_snapshot")).attempts.length,
        0,
      );
      const dtm = {
        ...published,
        id: randomUUID(),
        questionCount: 30,
        scoring: "dtm",
        questions: Array(30).fill(draft.questions[0]),
        answerKey: Array(30).fill(0),
      };
      await save(tutor, dtm);
      await rpc(student, "oqi_mock_begin", [dtm.id]);
      const weighted = await rpc(student, "oqi_mock_submit", [
        dtm.id,
        JSON.stringify(Array.from({ length: 30 }, (_, i) => (i < 10 ? 0 : 1))),
      ]);
      assert.equal(weighted.correctCount, 10);
      assert.equal(weighted.score, 11);
      assert.equal(weighted.maxScore, 63);
      assert.equal(weighted.percentage, 17);
      const expired = { ...published, id: randomUUID() };
      await save(tutor, expired);
      await rpc(student, "oqi_mock_begin", [expired.id]);
      await admin(
        "update public.oqi_mock_attempts set started_at=now()-interval '6 minutes' where test_id=$1",
        [expired.id],
      );
      await assert.rejects(
        rpc(student, "oqi_mock_submit", [expired.id, "[0,1]"]),
        /vaqti yakunlandi/,
      );
      await admin(
        "insert into public.darsino_user_blocks(user_id,peer_id) values($1,$2)",
        [student, tutor],
      );
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).groups.length,
        0,
      );
      await assert.rejects(
        rpc(student, "oqi_group_messages_read", [group]),
        /ruxsat/,
      );
      await admin("delete from public.darsino_user_blocks");
      await admin(
        "update public.darsino_enrollments set active=false where student_id=$1",
        [student],
      );
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).tests.length,
        0,
      );
      await admin(
        "update public.darsino_enrollments set active=true where student_id=$1",
        [student],
      );
      await admin(
        "update public.darsino_tutors set verification='pending' where user_id=$1",
        [tutor],
      );
      await assert.rejects(
        rpc(tutor, "oqi_group_message_send", [
          group,
          randomUUID(),
          "Not approved",
          false,
        ]),
        /Tasdiqlangan/,
      );
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).groups.length,
        0,
      );
      await admin(
        "update public.darsino_tutors set verification='approved' where user_id=$1",
        [tutor],
      );
      const file = randomUUID();
      await admin(
        "insert into public.darsino_files(id,owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,reserved_size_bytes,state,offering_id) values($1,$2,'material','darsino-lesson-materials',$3,'mock.pdf','application/pdf',100,100,'ready',$4)",
        [file, tutor, `${tutor}/${file}.pdf`, group],
      );
      const fileTest = {
        ...published,
        id: randomUUID(),
        source: "file",
        fileId: file,
        questions: [],
      };
      await save(tutor, fileTest);
      assert.equal(
        (
          await admin(
            "select published from public.darsino_lesson_files where file_id=$1",
            [file],
          )
        ).rows[0].published,
        true,
      );
      await assert.rejects(
        save(tutor, { ...fileTest, id: randomUUID() }),
        /unique/,
      );
      await save(tutor, { ...fileTest, status: "draft" });
      assert.equal(
        (
          await admin(
            "select published from public.darsino_lesson_files where file_id=$1",
            [file],
          )
        ).rows[0].published,
        false,
      );
      await admin(
        "update public.darsino_profiles set is_suspended=true where id=$1",
        [tutor],
      );
      assert.equal(
        (await rpc(student, "oqi_classroom_snapshot")).tests.length,
        0,
      );
      await assert.rejects(rpc(tutor, "oqi_classroom_snapshot"), /Akkaunt/);
      await db.exec("reset role");
      await db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610260001_teacher_workspace.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.equal(
        (
          await db.query<{ n: number }>(
            "select count(*)::int n from public.oqi_group_messages",
          )
        ).rows[0].n,
        2,
      );
      await db.exec("set role anon");
      await assert.rejects(
        db.query("select public.oqi_classroom_snapshot()"),
        /permission denied/,
      );
    } finally {
      await db.close();
    }
  },
);
