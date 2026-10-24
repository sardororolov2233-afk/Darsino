import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

async function fixture() {
  const db = await supabaseFixture();
  await applyMigrations(db);
  const ids = {
    student: "10000000-0000-4000-8000-000000000091",
    peer: "10000000-0000-4000-8000-000000000092",
    tutor: "20000000-0000-4000-8000-000000000091",
    other: "20000000-0000-4000-8000-000000000092",
  };
  for (const id of Object.values(ids))
    await db.query("insert into auth.users(id) values($1)", [id]);
  await db.exec(
    "update public.darsino_profiles set onboarded=true,name='Schedule Test'",
  );
  for (const id of [ids.tutor, ids.other]) {
    await db.query(
      "update public.darsino_profiles set role='tutor' where id=$1",
      [id],
    );
    await db.query(
      "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved',$2)",
      [
        id,
        JSON.stringify({
          subjects: ["Ingliz tili"],
          price: 90000,
          modes: ["Onlayn"],
          bio: "Schedule test teacher",
          proof: "Private certificate",
          availability: ["15:00"],
        }),
      ],
    );
    await db.query(
      "insert into public.darsino_contacts(user_id,peer_id) values($1,$2),($2,$1)",
      [id, ids.student],
    );
  }
  const as = async (id: string) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const run = async (id: string, command?: Record<string, unknown>) => {
    await as(id);
    return (
      await db.query<{ result: any }>(
        command
          ? "select public.darsino_mutate($1::jsonb) result"
          : "select public.darsino_snapshot() result",
        command ? [JSON.stringify({ ...command, actorId: id })] : [],
      )
    ).rows[0].result;
  };
  const group = async (
    tutor: string,
    start: string,
    end: string,
    published = true,
  ) => {
    await db.exec("reset role");
    const id = (
      await db.query<{ id: string }>(
        "insert into public.darsino_offerings(tutor_id,published,capacity,data) values($1,$2,10,$3) returning id",
        [
          tutor,
          published,
          JSON.stringify({
            title: "Schedule group",
            subject: "Ingliz tili",
            type: "group",
            price: 90000,
            mode: "Onlayn",
            area: "Toshkent",
            location: "Private classroom",
            days: "Jadval bo‘yicha",
            time: "15:00",
            benefits: [],
          }),
        ],
      )
    ).rows[0].id;
    const session = (
      await db.query<{ id: string }>(
        "insert into public.darsino_sessions(offering_id,starts_at,ends_at) values($1,$2,$3) returning id",
        [id, `2099-01-01T${start}:00Z`, `2099-01-01T${end}:00Z`],
      )
    ).rows[0].id;
    return { id, session, tutor };
  };
  const apply = async (
    offering: Awaited<ReturnType<typeof group>>,
    student = ids.student,
  ) => {
    const request = await run(student, {
      type: "request",
      request: { kind: "group", groupId: offering.id, tutorId: offering.tutor },
    });
    return {
      request,
      approve: () =>
        run(offering.tutor, {
          type: "decide",
          requestId: request.id,
          decision: "approved",
          note: "",
        }),
    };
  };
  return { db, ids, run, group, apply, as };
}

test(
  "learner approvals reject overlaps across tutors, including private individual requests, but allow adjacent lessons",
  { timeout: 60000 },
  async () => {
    const { db, ids, run, group, apply } = await fixture();
    try {
      const first = await group(ids.tutor, "10:00", "11:00");
      const overlapping = await group(ids.other, "10:00", "11:00");
      const adjacent = await group(ids.other, "11:00", "12:00");
      await (await apply(first)).approve();
      const next = await apply(overlapping);
      await assert.rejects(
        next.approve(),
        /O‘quvchining bu vaqtda boshqa darsi/,
      );
      let result = await run(ids.student);
      assert.equal(
        result.market.enrollments.filter((e: any) => e.active).length,
        1,
      );
      assert.equal(
        result.market.applications.find((a: any) => a.id === next.request.id)
          .status,
        "pending",
      );
      const individual = await run(ids.student, {
        type: "request",
        request: {
          kind: "lesson",
          tutorId: ids.other,
          startsAt: "2099-01-01T10:00:00Z",
          endsAt: "2099-01-01T11:00:00Z",
        },
      });
      await assert.rejects(
        run(ids.other, {
          type: "decide",
          requestId: individual.id,
          decision: "approved",
          note: "",
        }),
        /O‘quvchining bu vaqtda boshqa darsi/,
      );
      await (await apply(adjacent)).approve();
      result = await run(ids.student);
      assert.equal(
        result.market.enrollments.filter((e: any) => e.active).length,
        2,
      );
      assert.equal(
        result.market.offerings.some((o: any) => o.type === "individual"),
        false,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "private invites reveal only authorized current/future schedule and cannot admit a conflicting learner",
  { timeout: 60000 },
  async () => {
    const { db, ids, run, group, apply } = await fixture();
    try {
      const first = await group(ids.tutor, "10:00", "11:00");
      const invited = await group(ids.other, "10:00", "11:00", false);
      const unrelated = await group(ids.other, "14:00", "15:00", false);
      await (await apply(first)).approve();
      await db.exec("reset role");
      await db.query(
        "insert into public.darsino_enrollments(offering_id,student_id) values($1,$2)",
        [invited.id, ids.peer],
      );
      const oldSession = (
        await db.query<{ id: string }>(
          "insert into public.darsino_sessions(offering_id,starts_at,ends_at) values($1,'2020-01-01T10:00:00Z','2020-01-01T11:00:00Z') returning id",
          [invited.id],
        )
      ).rows[0].id;
      const invite = await run(ids.other, {
        type: "group-invite",
        offeringId: invited.id,
        studentId: ids.student,
      });
      let result = await run(ids.student);
      assert.ok(result.market.offerings.some((o: any) => o.id === invited.id));
      assert.equal(
        result.market.sessions.filter((s: any) => s.offeringId === invited.id)
          .length,
        1,
      );
      assert.ok(
        result.market.sessions.some((s: any) => s.id === invited.session),
      );
      assert.equal(
        result.market.sessions.some(
          (s: any) => s.id === oldSession || s.id === unrelated.session,
        ),
        false,
      );
      assert.equal(
        result.market.enrollments.some((e: any) => e.studentId === ids.peer),
        false,
      );
      assert.equal(
        (await run(ids.peer)).market.sessions.some(
          (s: any) => s.id === unrelated.session,
        ),
        false,
      );
      await assert.rejects(
        run(ids.student, {
          type: "group-invite-decide",
          invitationId: invite.id,
          accept: true,
        }),
        /O‘quvchining bu vaqtda boshqa darsi/,
      );
      result = await run(ids.student);
      assert.equal(
        result.market.groupInvitations.find((i: any) => i.id === invite.id)
          .status,
        "pending",
      );
      assert.equal(
        result.market.enrollments.filter((e: any) => e.active).length,
        1,
      );
      await db.exec("reset role");
      await db.query(
        "update public.darsino_group_invitations set expires_at=now()-interval '1 minute' where id=$1",
        [invite.id],
      );
      assert.equal(
        (await run(ids.student)).market.sessions.some(
          (s: any) => s.id === invited.session,
        ),
        false,
      );
      await db.exec("reset role");
      await db.query(
        "update public.darsino_group_invitations set expires_at=now()+interval '1 day' where id=$1",
        [invite.id],
      );
      await db.query(
        "insert into public.darsino_user_blocks(user_id,peer_id) values($1,$2)",
        [ids.student, ids.other],
      );
      assert.equal(
        (await run(ids.student)).market.sessions.some(
          (s: any) => s.id === invited.session,
        ),
        false,
      );
      await db.exec("reset role");
      await db.query(
        "delete from public.darsino_user_blocks where user_id=$1",
        [ids.student],
      );
      await db.query(
        "update public.darsino_profiles set is_suspended=true where id=$1",
        [ids.other],
      );
      assert.equal(
        (await run(ids.student)).market.sessions.some(
          (s: any) => s.id === invited.session,
        ),
        false,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "rescheduling checks every active learner and rolls back conflicting edits and notifications",
  { timeout: 60000 },
  async () => {
    const { db, ids, run, group, apply } = await fixture();
    try {
      const first = await group(ids.tutor, "10:00", "11:00");
      const second = await group(ids.other, "12:00", "13:00");
      await (await apply(first)).approve();
      await (await apply(second)).approve();
      const before = await run(ids.student);
      await assert.rejects(
        run(ids.other, {
          type: "update-session",
          sessionId: second.session,
          startsAt: "2099-01-01T10:30:00Z",
          endsAt: "2099-01-01T11:30:00Z",
        }),
        /O‘quvchining bu vaqtda boshqa darsi/,
      );
      let result = await run(ids.student);
      assert.equal(
        result.market.sessions.find((s: any) => s.id === second.session)
          .startsAt,
        before.market.sessions.find((s: any) => s.id === second.session)
          .startsAt,
      );
      assert.equal(
        result.market.notifications.length,
        before.market.notifications.length,
      );
      await run(ids.other, {
        type: "update-session",
        sessionId: second.session,
        startsAt: "2099-01-01T11:00:00Z",
        endsAt: "2099-01-01T12:00:00Z",
      });
      result = await run(ids.student);
      assert.equal(
        result.market.notifications.filter(
          (n: any) => n.title === "Dars vaqti o‘zgardi",
        ).length,
        1,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "scheduling upgrade replays without replacing later wrappers, keeps helpers private and builds each snapshot once",
  { timeout: 60000 },
  async () => {
    const { db, ids, run } = await fixture();
    try {
      const before = (
        await db.query<{ definition: string }>(
          "select pg_get_functiondef('public.darsino_mutate(jsonb)'::regprocedure) definition",
        )
      ).rows[0].definition;
      await db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610230002_scheduling.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.equal(
        (
          await db.query<{ definition: string }>(
            "select pg_get_functiondef('public.darsino_mutate(jsonb)'::regprocedure) definition",
          )
        ).rows[0].definition,
        before,
      );
      await db.exec(`create table public.schedule_snapshot_counter(n integer); insert into public.schedule_snapshot_counter values(0);
      alter function public.darsino_snapshot_core() rename to schedule_original_snapshot_core;
      create function public.darsino_snapshot_core() returns jsonb language plpgsql security definer set search_path='' as $$
        begin update public.schedule_snapshot_counter set n=n+1; return public.schedule_original_snapshot_core(); end $$;
      revoke all on function public.darsino_snapshot_core() from public,anon,authenticated;`);
      const result = await run(ids.student, { type: "read-notifications" });
      assert.equal(result.user.id, ids.student);
      assert.ok(Array.isArray(result.market.payments));
      assert.ok(Array.isArray(result.market.groupInvitations));
      for (const query of [
        "select public.darsino_mutate_scheduling('{}')",
        "select public.darsino_mutate_schedule_base('{}')",
        "select public.darsino_snapshot_scheduling()",
        "select public.darsino_snapshot_schedule_base()",
        "select public.darsino_assert_student_available(null,null,null)",
      ])
        await assert.rejects(db.query(query), /permission denied/);
      await db.exec("reset role");
      assert.equal(
        (
          await db.query<{ n: number }>(
            "select n from public.schedule_snapshot_counter",
          )
        ).rows[0].n,
        1,
      );
      for (const signature of [
        "darsino_mutate_core(jsonb)",
        "darsino_account_command(jsonb)",
        "darsino_record_payment(jsonb)",
      ]) {
        const definition = (
          await db.query<{ definition: string }>(
            "select pg_get_functiondef($1::regprocedure) definition",
            [`public.${signature}`],
          )
        ).rows[0].definition;
        assert.match(
          definition,
          /select \* into actor from public\.darsino_profiles where id=me for no key update;/,
        );
      }
    } finally {
      await db.close();
    }
  },
);
