import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
import type { MarketCommand } from "../src/state/domain";

const ids = {
  student: "10000000-0000-4000-8000-000000000001",
  other: "10000000-0000-4000-8000-000000000002",
  tutor: "20000000-0000-4000-8000-000000000001",
  stranger: "20000000-0000-4000-8000-000000000002",
  mod: "30000000-0000-4000-8000-000000000001",
};
const profile = {
  name: "Sardor Test",
  city: "Toshkent",
  area: "Yunusobod",
  interests: ["Ingliz tili"],
  goal: "IELTS",
};
const teacher = {
  subjects: ["Ingliz tili"],
  specialty: "IELTS",
  experience: 4,
  proof: "PRIVATE CERTIFICATE 12345",
  bio: "IELTS uchun individual va guruh darslari",
  price: 90000,
  modes: ["Onlayn"],
  availability: ["10:00"],
};

test(
  "Postgres RPC enforces the complete marketplace flow and data boundaries",
  { timeout: 60000 },
  async (t) => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      for (const [index, id] of Object.values(ids).entries())
        await db.query("insert into auth.users(id,phone) values($1,$2)", [
          id,
          `99890123456${index}`,
        ]);
      async function as(
        id: string,
        c?: MarketCommand | Record<string, unknown>,
      ) {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
        const { rows } = await db.query<{ result: any }>(
          c
            ? "select public.darsino_mutate($1::jsonb) result"
            : "select public.darsino_snapshot() result",
          c ? [JSON.stringify({ actorId: id, ...c })] : [],
        );
        return rows[0].result;
      }
      for (const id of [ids.student, ids.other])
        await as(id, { type: "profile", profile });
      await as(ids.tutor, {
        type: "profile",
        role: "tutor",
        profile: { ...profile, name: "Dilnoza Test" },
        tutor: teacher,
      });
      await as(ids.stranger, {
        type: "profile",
        role: "tutor",
        profile: { ...profile, name: "Other Tutor" },
        tutor: teacher,
      });
      await as(ids.mod);
      await db.exec("reset role");
      await db.query(
        "update public.darsino_profiles set role='moderator',onboarded=true,name='Moderator' where id=$1",
        [ids.mod],
      );
      const startsAt = new Date(Date.now() + 3 * 86400000).toISOString(),
        endsAt = new Date(Date.now() + 3 * 86400000 + 3600000).toISOString();
      const offering = {
        title: "IELTS small group",
        subject: "Ingliz tili",
        type: "group" as const,
        capacity: 1,
        price: 90000,
        mode: "Onlayn",
        area: "Yunusobod",
        location: "Zoom",
        days: "Haftalik",
        benefits: [],
        sessions: [{ startsAt, endsAt }],
      };
      await t.test(
        "pending tutors cannot publish or approve themselves",
        async () => {
          await assert.rejects(
            as(ids.tutor, { type: "offering", offering }),
            /moderator/,
          );
          await assert.rejects(
            as(ids.tutor, {
              type: "moderate",
              tutorId: ids.tutor,
              decision: "approved",
              note: "",
            }),
            /moderator/,
          );
          await assert.rejects(
            as(ids.student, { type: "profile", role: "moderator", profile }),
            /Rol/,
          );
          await as(ids.mod, {
            type: "moderate",
            tutorId: ids.tutor,
            decision: "approved",
            note: "Tekshirildi",
          });
          await as(ids.mod, {
            type: "moderate",
            tutorId: ids.stranger,
            decision: "approved",
            note: "",
          });
        },
      );
      await t.test(
        "a command from a stale account cannot act with a newer token",
        async () => {
          await assert.rejects(
            as(ids.student, { type: "read-notifications", actorId: ids.other }),
            /Akkaunt o‘zgardi/,
          );
        },
      );
      const published = await as(ids.tutor, { type: "offering", offering }),
        groupId = published.id;
      const request = {
        kind: "group",
        groupId,
        tutorId: ids.tutor,
        title: "FORGED PRICE",
        subtitle: "",
        time: "",
        price: 1,
      };
      const first = await as(ids.student, { type: "request", request }),
        second = await as(ids.other, { type: "request", request });
      await t.test(
        "pending requests remain outside My Lessons; price is owned by the teacher",
        async () => {
          assert.equal(first.market.enrollments.length, 0);
          assert.equal(first.market.applications[0].price, 90000);
          const duplicate = await as(ids.student, { type: "request", request });
          assert.equal(duplicate.id, first.id);
        },
      );
      await t.test("only the owning approved tutor can decide", async () => {
        await assert.rejects(
          as(ids.student, {
            type: "decide",
            requestId: first.id,
            decision: "approved",
            note: "",
          }),
          /moderator/,
        );
        await assert.rejects(
          as(ids.stranger, {
            type: "decide",
            requestId: first.id,
            decision: "approved",
            note: "",
          }),
          /huquq/,
        );
      });
      await as(ids.tutor, {
        type: "decide",
        requestId: first.id,
        decision: "approved",
        note: "Xush kelibsiz",
      });
      await t.test(
        "approval creates membership and a private notification; last-seat failure rolls back",
        async () => {
          const student = await as(ids.student);
          assert.equal(student.market.enrollments.length, 1);
          assert.ok(
            student.market.sessions.some((s: any) => s.offeringId === groupId),
          );
          assert.ok(
            student.market.notifications.some(
              (n: any) => n.title === "Arizangiz tasdiqlandi",
            ),
          );
          await assert.rejects(
            as(ids.tutor, {
              type: "decide",
              requestId: second.id,
              decision: "approved",
              note: "",
            }),
            /oxirgi o‘rin/,
          );
          const other = await as(ids.other);
          assert.equal(other.market.enrollments.length, 0);
          assert.equal(other.market.applications[0].status, "pending");
          await assert.rejects(
            as(ids.tutor, {
              type: "decide",
              requestId: first.id,
              decision: "approved",
              note: "",
            }),
            /allaqachon/,
          );
        },
      );
      await t.test(
        "schedule edits notify participants; pausing hides the listing but keeps member access",
        async () => {
          const member = await as(ids.student),
            session = member.market.sessions.find(
              (s: any) => s.offeringId === groupId,
            );
          const startsAt = new Date(Date.now() + 6 * 86400000).toISOString(),
            endsAt = new Date(
              Date.now() + 6 * 86400000 + 3600000,
            ).toISOString();
          await assert.rejects(
            as(ids.stranger, {
              type: "update-session",
              sessionId: session.id,
              startsAt,
              endsAt,
            }),
            /kelgusi/,
          );
          await as(ids.tutor, {
            type: "update-session",
            sessionId: session.id,
            startsAt,
            endsAt,
          });
          assert.ok(
            (await as(ids.student)).market.notifications.some(
              (n: any) => n.title === "Dars vaqti o‘zgardi",
            ),
          );
          await as(ids.tutor, {
            type: "offering-visibility",
            offeringId: groupId,
            published: false,
          });
          assert.ok(
            !(await as(ids.other)).market.offerings.some(
              (o: any) => o.id === groupId,
            ),
          );
          assert.ok(
            (await as(ids.student)).market.offerings.some(
              (o: any) => o.id === groupId,
            ),
          );
          await as(ids.tutor, {
            type: "offering-visibility",
            offeringId: groupId,
            published: true,
          });
        },
      );
      await t.test(
        "cancellation and rejection never create enrollment",
        async () => {
          await as(ids.other, { type: "cancel", requestId: second.id });
          const laterStart = new Date(Date.now() + 4 * 86400000).toISOString(),
            laterEnd = new Date(
              Date.now() + 4 * 86400000 + 3600000,
            ).toISOString();
          const pending = await as(ids.other, {
            type: "request",
            request: {
              kind: "lesson",
              tutorId: ids.tutor,
              title: "",
              subtitle: "",
              time: "",
              startsAt: laterStart,
              endsAt: laterEnd,
            },
          });
          await as(ids.tutor, {
            type: "decide",
            requestId: pending.id,
            decision: "rejected",
            note: "Boshqa vaqt tanlang",
          });
          assert.equal((await as(ids.other)).market.enrollments.length, 0);
        },
      );
      await t.test(
        "individual approval creates a private class and enforces schedule conflicts",
        async () => {
          const startsAt = new Date(Date.now() + 7 * 86400000).toISOString(),
            endsAt = new Date(
              Date.now() + 7 * 86400000 + 3600000,
            ).toISOString();
          const pending = await as(ids.other, {
            type: "request",
            request: {
              kind: "lesson",
              tutorId: ids.tutor,
              title: "",
              subtitle: "",
              time: "",
              startsAt,
              endsAt,
            },
          });
          await as(ids.tutor, {
            type: "decide",
            requestId: pending.id,
            decision: "approved",
            note: "",
          });
          const member = await as(ids.other),
            enrollment = member.market.enrollments[0];
          assert.equal(
            member.market.offerings.find(
              (o: any) => o.id === enrollment.offeringId,
            ).published,
            false,
          );
          assert.ok(
            !(await as(ids.student)).market.offerings.some(
              (o: any) => o.id === enrollment.offeringId,
            ),
          );
          await assert.rejects(
            as(ids.tutor, {
              type: "offering",
              offering: { ...offering, sessions: [{ startsAt, endsAt }] },
            }),
            /boshqa dars/,
          );
        },
      );
      await t.test(
        "snapshot hides proof, phones, other students, applications, and chats",
        async () => {
          const conversationId = `dm:${ids.student}:${ids.tutor}`;
          await as(ids.student, {
            type: "message",
            conversationId,
            text: "IELTS uchun yozdim",
          });
          await assert.rejects(
            as(ids.other, { type: "message", conversationId, text: "Forged" }),
            /huquq/,
          );
          const outsider = await as(ids.other);
          assert.equal(outsider.market.messages.length, 0);
          assert.equal(
            outsider.market.tutorProfiles.find(
              (p: any) => p.userId === ids.tutor,
            ).proof,
            "",
          );
          assert.equal(
            outsider.market.users.find((u: any) => u.id === ids.tutor).phone,
            "",
          );
          assert.ok(
            !outsider.market.users.some((u: any) => u.id === ids.student),
          );
          assert.ok(
            !outsider.market.applications.some((a: any) => a.id === first.id),
          );
          assert.equal((await as(ids.tutor)).market.messages.length, 1);
          assert.equal(
            (await as(ids.mod)).market.tutorProfiles.find(
              (p: any) => p.userId === ids.tutor,
            ).proof,
            teacher.proof,
          );
          await db.exec("set role authenticated");
          await assert.rejects(
            db.query("update public.darsino_profiles set role='moderator'"),
            /permission denied/,
          );
          await db.exec("reset role; set role anon");
          await assert.rejects(
            db.query("select public.darsino_snapshot()"),
            /permission denied/,
          );
        },
      );
      await t.test(
        "only completed, attended lessons accept one valid review",
        async () => {
          const s = (await as(ids.student)).market.sessions.find(
            (s: any) => s.offeringId === groupId,
          );
          await assert.rejects(
            as(ids.student, {
              type: "review",
              sessionId: s.id,
              rating: 5,
              text: "Yaxshi dars",
            }),
            /qatnashgan/,
          );
          await db.exec("reset role");
          await db.query(
            "update public.darsino_sessions set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",
            [s.id],
          );
          await assert.rejects(
            as(ids.stranger, {
              type: "attendance",
              sessionId: s.id,
              studentId: ids.student,
              status: "present",
            }),
            /o‘z dars/,
          );
          await as(ids.tutor, {
            type: "attendance",
            sessionId: s.id,
            studentId: ids.student,
            status: "present",
          });
          await assert.rejects(
            as(ids.other, {
              type: "review",
              sessionId: s.id,
              rating: 5,
              text: "Begona fikr",
            }),
            /qatnashgan/,
          );
          await as(ids.student, {
            type: "review",
            sessionId: s.id,
            rating: 5,
            text: "Juda foydali dars",
          });
          await assert.rejects(
            as(ids.student, {
              type: "review",
              sessionId: s.id,
              rating: 5,
              text: "Ikkinchi fikr",
            }),
            /unique constraint/,
          );
        },
      );
    } finally {
      await db.close();
    }
  },
);
