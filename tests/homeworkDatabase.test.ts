import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
test(
  "homework SQL isolates recipients and private files, preserves resubmissions and deduplicates notifications",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const teacher = randomUUID(),
        student = randomUUID(),
        peer = randomUUID(),
        other = randomUUID();
      for (const id of [teacher, student, peer, other])
        await db.query("insert into auth.users(id) values($1)", [id]);
      await db.exec(
        "update public.darsino_profiles set onboarded=true,name='Sinov'",
      );
      await db.query(
        "update public.darsino_profiles set role='tutor' where id=$1",
        [teacher],
      );
      await db.query(
        "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
        [teacher, JSON.stringify({ subjects: ["Matematika"] })],
      );
      const group = (
        await db.query<{ id: string }>(
          "insert into public.darsino_offerings(tutor_id,capacity,data) values($1,10,$2) returning id",
          [
            teacher,
            JSON.stringify({
              title: "Algebra",
              subject: "Matematika",
              type: "group",
            }),
          ],
        )
      ).rows[0].id;
      for (const id of [student, peer])
        await db.query(
          "insert into public.darsino_enrollments(student_id,offering_id) values($1,$2)",
          [id, group],
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
            `select public.${name}(${params.map((_, i) => "$" + (i + 1)).join(",")}) result`,
            params,
          )
        ).rows[0].result;
      };
      const task = {
        id: randomUUID(),
        offeringId: group,
        title: "Algebra mashqlari",
        description: "5 ta misolni yeching",
        subject: "Matematika",
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        status: "draft",
        recipientIds: [student],
        fileIds: [] as string[],
        revision: 0,
      };
      await assert.rejects(
        rpc(other, "oqi_assignment_save", [JSON.stringify(task)]),
        /O‘z guruhingiz/,
      );
      await rpc(teacher, "oqi_assignment_save", [JSON.stringify(task)]);
      assert.equal(
        (await rpc(student, "oqi_assignments_snapshot")).assignments.length,
        0,
      );
      const taskFile = await rpc(teacher, "oqi_assignment_file_prepare", [
        task.id,
        "task",
        "task.pdf",
        "application/pdf",
        4,
      ]);
      await as(teacher);
      await db.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
        [
          "oqi-homework",
          taskFile.objectPath,
          teacher,
          JSON.stringify({ size: 4, mimetype: "application/pdf" }),
        ],
      );
      await rpc(teacher, "oqi_assignment_file_ready", [taskFile.id]);
      const published = {
        ...task,
        status: "published",
        revision: 1,
        fileIds: [taskFile.id],
      };
      await rpc(teacher, "oqi_assignment_save", [JSON.stringify(published)]);
      await rpc(teacher, "oqi_assignment_save", [JSON.stringify(published)]);
      assert.equal(
        (await rpc(student, "oqi_assignments_snapshot")).assignments.length,
        1,
      );
      assert.equal(
        (await rpc(student, "oqi_assignments_snapshot")).events.length,
        1,
      );
      assert.equal(
        (await rpc(peer, "oqi_assignments_snapshot")).assignments.length,
        0,
      );
      assert.equal(
        (await rpc(other, "oqi_assignments_snapshot")).files.length,
        0,
      );
      await as(student);
      await assert.rejects(
        db.query("select recipient_ids from public.oqi_assignments"),
        /permission denied/,
      );
      await as(peer);
      assert.equal(
        (await db.query("select id from public.oqi_assignments")).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='oqi-homework'",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into public.oqi_assignment_submissions(id,assignment_id,student_id,version) values($1,$2,$3,1)",
          [randomUUID(), task.id, student],
        ),
        /permission denied/,
      );
      await assert.rejects(
        rpc(peer, "oqi_assignment_submit", [
          randomUUID(),
          task.id,
          "peer answer",
          [],
        ]),
        /ruxsat/,
      );
      await assert.rejects(
        rpc(student, "oqi_assignment_file_prepare", [
          task.id,
          "answer",
          "x.svg",
          "image/svg+xml",
          4,
        ]),
        /10 MB/,
      );
      const answerFile = await rpc(student, "oqi_assignment_file_prepare", [
        task.id,
        "answer",
        "answer.png",
        "image/png",
        4,
      ]);
      await assert.rejects(
        rpc(student, "oqi_assignment_file_ready", [answerFile.id]),
        /tugamagan/,
      );
      await as(student);
      await db.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
        [
          "oqi-homework",
          answerFile.objectPath,
          student,
          JSON.stringify({ size: 4, mimetype: "image/png" }),
        ],
      );
      await rpc(student, "oqi_assignment_file_ready", [answerFile.id]);
      await as(teacher);
      assert.equal(
        (
          await db.query("select * from storage.objects where name=$1", [
            answerFile.objectPath,
          ])
        ).rows.length,
        0,
      );
      const first = randomUUID();
      await rpc(student, "oqi_assignment_submit", [
        first,
        task.id,
        "Birinchi javob",
        [answerFile.id],
      ]);
      await rpc(student, "oqi_assignment_submit", [
        first,
        task.id,
        "Birinchi javob",
        [answerFile.id],
      ]);
      assert.equal(
        (await rpc(teacher, "oqi_assignments_snapshot")).submissions.length,
        1,
      );
      await as(teacher);
      assert.equal(
        (
          await db.query("select * from storage.objects where name=$1", [
            answerFile.objectPath,
          ])
        ).rows.length,
        1,
      );
      await as(peer);
      assert.equal(
        (
          await db.query("select * from storage.objects where name=$1", [
            answerFile.objectPath,
          ])
        ).rows.length,
        0,
      );
      await assert.rejects(
        rpc(student, "oqi_assignment_submit", [
          randomUUID(),
          task.id,
          "duplicate",
          [],
        ]),
        /tekshiruvda/,
      );
      await assert.rejects(
        rpc(other, "oqi_assignment_review", [first, "accepted", "ok"]),
        /Faqat/,
      );
      await assert.rejects(
        rpc(teacher, "oqi_assignment_review", [first, "changes_requested", ""]),
        /izoh/,
      );
      await rpc(teacher, "oqi_assignment_review", [
        first,
        "changes_requested",
        "3-misolni qayta ishlang",
      ]);
      await rpc(teacher, "oqi_assignment_review", [
        first,
        "changes_requested",
        "3-misolni qayta ishlang",
      ]);
      const second = randomUUID();
      await rpc(student, "oqi_assignment_submit", [
        second,
        task.id,
        "Tuzatilgan javob",
        [],
      ]);
      await rpc(teacher, "oqi_assignment_review", [
        second,
        "accepted",
        "Yaxshi!",
      ]);
      const view = await rpc(student, "oqi_assignments_snapshot");
      assert.equal(view.submissions.length, 2);
      assert.equal(view.submissions[0].status, "accepted");
      assert.equal(view.submissions[1].feedback, "3-misolni qayta ishlang");
      assert.equal(view.events.length, 3);
      assert.equal(
        (await rpc(teacher, "oqi_assignments_snapshot")).events.length,
        2,
      );
      await rpc(student, "oqi_assignment_events_read");
      assert.equal(
        (await rpc(student, "oqi_assignments_snapshot")).events.filter(
          (e: any) => !e.read,
        ).length,
        0,
      );
      await rpc(teacher, "oqi_assignment_archive", [task.id]);
      await assert.rejects(
        rpc(student, "oqi_assignment_submit", [
          randomUUID(),
          task.id,
          "third",
          [],
        ]),
        /ochiq emas/,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "new student defaults are private and unlinked homework uploads can be removed safely",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const me = randomUUID();
      await db.query("insert into auth.users(id) values($1)", [me]);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        me,
      ]);
      await db.exec("set role authenticated");
      const result = (
        await db.query<{ result: any }>(
          "select public.darsino_mutate($1::jsonb) result",
          [
            JSON.stringify({
              type: "profile",
              actorId: me,
              idempotencyKey: randomUUID(),
              role: "student",
              profile: {
                name: "Private Student",
                city: "Toshkent shahri",
                area: "Yunusobod tumani",
                goal: "IELTS olish",
                interests: ["Ingliz tili"],
                studyMode: "Onlayn",
                studySupport: "Ustoz bilan",
              },
            }),
          ],
        )
      ).rows[0].result;
      assert.equal(result.market.accountSettings[me].discoverable, false);
      assert.equal(result.market.accountSettings[me].showArea, false);
      assert.equal(result.market.accountSettings[me].messagePolicy, "contacts");
      await db.exec("reset role");
      const teacher = randomUUID();
      await db.query("insert into auth.users(id) values($1)", [teacher]);
      await db.query(
        "update public.darsino_profiles set onboarded=true,role='tutor' where id=$1",
        [teacher],
      );
      await db.query(
        "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
        [teacher, JSON.stringify({ subjects: ["Matematika"] })],
      );
      const group = (
        await db.query<{ id: string }>(
          "insert into public.darsino_offerings(tutor_id,capacity,data) values($1,10,$2) returning id",
          [
            teacher,
            JSON.stringify({
              title: "Class",
              subject: "Matematika",
              type: "group",
            }),
          ],
        )
      ).rows[0].id;
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        teacher,
      ]);
      await db.exec("set role authenticated");
      const id = randomUUID();
      await db.query("select public.oqi_assignment_save($1::jsonb)", [
        JSON.stringify({
          id,
          offeringId: group,
          title: "Draft task",
          description: "Private",
          subject: "Matematika",
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          status: "draft",
          recipientIds: [],
          fileIds: [],
          revision: 0,
        }),
      ]);
      const f = (
        await db.query<{ f: any }>(
          "select public.oqi_assignment_file_prepare($1,'task','draft.pdf','application/pdf',4) f",
          [id],
        )
      ).rows[0].f;
      await db.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
        [
          "oqi-homework",
          f.objectPath,
          teacher,
          JSON.stringify({ size: 4, mimetype: "application/pdf" }),
        ],
      );
      await db.query("select public.oqi_assignment_file_ready($1)", [f.id]);
      await db.query("select public.oqi_assignment_file_remove_begin($1)", [
        f.id,
      ]);
      await assert.rejects(
        db.query("select public.oqi_assignment_file_remove_end($1)", [f.id]),
        /Storage/,
      );
      await db.query(
        "delete from storage.objects where bucket_id='oqi-homework' and name=$1",
        [f.objectPath],
      );
      await db.query("select public.oqi_assignment_file_remove_end($1)", [
        f.id,
      ]);
      const snapshot = (
        await db.query<{ s: any }>("select public.oqi_assignments_snapshot() s")
      ).rows[0].s;
      assert.equal(snapshot.files.length, 0);
    } finally {
      await db.close();
    }
  },
);
