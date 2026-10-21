import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
import { defaultAccountSettings } from "../src/state/account";
import { paymentMonth, shiftMonth } from "../src/state/payments";

async function fixture() {
  const db = await supabaseFixture();
  await applyMigrations(db);
  const ids = {
    tutor: "20000000-0000-4000-8000-000000000081",
    student: "10000000-0000-4000-8000-000000000081",
    peer: "10000000-0000-4000-8000-000000000082",
  };
  for (const id of Object.values(ids))
    await db.query("insert into auth.users(id) values($1)", [id]);
  await db.exec(
    "update public.darsino_profiles set onboarded=true,name='Ali Valiyev'",
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
        subjects: ["Ingliz tili"],
        price: 300000,
        modes: ["Onlayn"],
        bio: "IELTS darslari",
        proof: "Diplom",
        availability: ["14:00"],
      }),
    ],
  );
  const group = (
    await db.query<{ id: string }>(
      "insert into public.darsino_offerings(tutor_id,capacity,data) values($1,10,$2) returning id",
      [
        ids.tutor,
        JSON.stringify({
          title: "IELTS guruhi",
          price: 300000,
          type: "group",
          subject: "Ingliz tili",
          benefits: [],
          mode: "Onlayn",
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
  const as = async (id: string) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const rpc = async (id: string, name: string, params: unknown[] = []) => {
    await as(id);
    return (
      await db.query<{ result: any }>(
        "select public." +
          name +
          "(" +
          params.map((_, i) => "$" + (i + 1)).join(",") +
          ") result",
        params,
      )
    ).rows[0].result;
  };
  const run = (id: string, command: Record<string, unknown>) =>
    rpc(id, "darsino_mutate", [JSON.stringify({ ...command, actorId: id })]);
  return { db, ids, group, rpc, run, as };
}
test(
  "Postgres protects IDs, consent, privacy, invitations and private helpers",
  { timeout: 60000 },
  async () => {
    const { db, ids, group, run, rpc } = await fixture();
    try {
      let result = await run(ids.student, {
        type: "contact-request",
        peerId: ids.tutor,
      });
      const requestId = result.id;
      assert.equal(result.market.contacts.length, 0);
      await assert.rejects(
        run(ids.peer, { type: "contact-decide", requestId, accept: true }),
      );
      await run(ids.tutor, { type: "contact-decide", requestId, accept: true });
      result = await run(ids.student, {
        type: "account-settings",
        publicId: "ali_privacy",
        settings: {
          ...defaultAccountSettings,
          language: "ru",
          discoverable: false,
          showArea: false,
          messagePolicy: "contacts",
          avatarVisibility: "nobody",
        },
      });
      assert.equal(result.user.publicId, "ali_privacy");
      assert.equal(result.market.accountSettings[ids.student].language, "ru");
      assert.equal(
        result.market.accountSettings[ids.student].allowContactRequests,
        true,
      );
      assert.equal(
        await rpc(ids.peer, "darsino_find_account", ["ali_privacy"]),
        null,
      );
      const found = await rpc(ids.tutor, "darsino_find_account", [
        "ali_privacy",
      ]);
      assert.equal(found.city, "");
      assert.equal(found.area, "");
      assert.equal(found.email, "");
      assert.equal(found.phone, "");
      assert.equal(found.avatarFileId, null);
      await assert.rejects(
        run(ids.peer, {
          type: "account-settings",
          publicId: "ali_privacy",
          settings: defaultAccountSettings,
        }),
        /ID band/,
      );
      result = await run(ids.tutor, {
        type: "group-invite",
        offeringId: group,
        studentId: ids.student,
      });
      const invitationId = result.id;
      assert.equal(result.market.enrollments.length, 0);
      assert.equal(
        (
          await run(ids.tutor, {
            type: "group-invite",
            offeringId: group,
            studentId: ids.student,
          })
        ).id,
        invitationId,
      );
      await assert.rejects(
        run(ids.peer, {
          type: "group-invite-decide",
          invitationId,
          accept: true,
        }),
      );
      result = await run(ids.student, {
        type: "group-invite-decide",
        invitationId,
        accept: true,
      });
      assert.equal(
        result.market.enrollments.filter((e: any) => e.active).length,
        1,
      );
      assert.equal(
        (
          await run(ids.student, {
            type: "group-invite-decide",
            invitationId,
            accept: true,
          })
        ).market.enrollments.length,
        1,
      );
      await run(ids.student, {
        type: "block-user",
        peerId: ids.tutor,
        blocked: true,
      });
      await assert.rejects(
        run(ids.tutor, {
          type: "message",
          conversationId: "dm:" + ids.student + ":" + ids.tutor,
          text: "Salom",
        }),
        /cheklangan/,
      );
      await assert.rejects(
        run(ids.tutor, {
          type: "group-invite",
          offeringId: group,
          studentId: ids.student,
        }),
      );
      await assert.rejects(
        db.query("select * from public.darsino_account_settings"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.darsino_account_preferences($1)", [
          ids.student,
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.darsino_snapshot_account_base()"),
        /permission denied/,
      );
    } finally {
      await db.close();
    }
  },
);
test(
  "rejoining permits correction of a recorded prior month",
  { timeout: 60000 },
  async () => {
    const { db, ids, group, run } = await fixture();
    try {
      const month = shiftMonth(paymentMonth(), -1);
      await db.query(
        "insert into public.darsino_enrollments(offering_id,student_id,created_at) values($1,$2,$3)",
        [group, ids.student, month + "-01T12:00:00Z"],
      );
      const payment = {
        type: "payment",
        offeringId: group,
        studentId: ids.student,
        month,
        paid: true,
      };
      await run(ids.tutor, payment);
      await run(ids.tutor, {
        type: "remove-participant",
        offeringId: group,
        studentId: ids.student,
      });
      const request = await run(ids.student, {
        type: "request",
        request: { kind: "group", groupId: group, tutorId: ids.tutor },
      });
      await run(ids.tutor, {
        type: "decide",
        requestId: request.id,
        decision: "approved",
        note: "",
      });
      const result = await run(ids.tutor, { ...payment, paid: false });
      assert.equal(result.market.enrollments.length, 1);
      assert.equal(result.market.payments[0].paid, false);
    } finally {
      await db.close();
    }
  },
);
test(
  "workspace revisions reject lost updates and other-account writes",
  { timeout: 60000 },
  async () => {
    const { db, ids, rpc } = await fixture();
    try {
      assert.equal(
        (
          await rpc(ids.student, "darsino_private_state_read", [
            "learning",
            ids.student,
          ])
        ).revision,
        0,
      );
      const state = {
        version: 1,
        attempts: [],
        completedLessons: {},
        followedClubs: [],
        recentSearches: ["algebra"],
      };
      assert.equal(
        (
          await rpc(ids.student, "darsino_private_state_write", [
            "learning",
            JSON.stringify(state),
            0,
            ids.student,
          ])
        ).revision,
        1,
      );
      await assert.rejects(
        rpc(ids.student, "darsino_private_state_write", [
          "learning",
          JSON.stringify(state),
          0,
          ids.student,
        ]),
        /WORKSPACE_CONFLICT/,
      );
      await assert.rejects(
        rpc(ids.peer, "darsino_private_state_read", ["learning", ids.student]),
        /Akkaunt/,
      );
      assert.equal(
        (
          await rpc(ids.peer, "darsino_private_state_read", [
            "learning",
            ids.peer,
          ])
        ).data,
        null,
      );
      assert.equal(
        (
          await rpc(ids.student, "darsino_private_state_read", [
            "learning",
            ids.student,
          ])
        ).data.recentSearches[0],
        "algebra",
      );
      await assert.rejects(
        rpc(ids.student, "darsino_private_state_write", [
          "teacher",
          "{}",
          0,
          ids.student,
        ]),
        /ustozlar/,
      );
    } finally {
      await db.close();
    }
  },
);
test(
  "AAL1 and revoked sessions cannot read private RPCs after TOTP is verified",
  { timeout: 60000 },
  async () => {
    const { db, ids, rpc } = await fixture();
    try {
      await db.exec(
        "create table auth.mfa_factors(user_id uuid,status text,factor_type text); create table auth.sessions(id uuid,user_id uuid)",
      );
      const sessionId = "90000000-0000-4000-8000-000000000081";
      await db.query(
        "insert into auth.mfa_factors values($1,'verified','totp')",
        [ids.student],
      );
      await db.query("insert into auth.sessions values($1,$2)", [
        sessionId,
        ids.student,
      ]);
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({ aal: "aal1", session_id: sessionId }),
      ]);
      await assert.rejects(rpc(ids.student, "darsino_snapshot"));
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({ aal: "aal2", session_id: sessionId }),
      ]);
      assert.equal(
        (await rpc(ids.student, "darsino_snapshot")).user.id,
        ids.student,
      );
      await db.exec("reset role");
      await db.query("delete from auth.sessions where id=$1", [sessionId]);
      await assert.rejects(rpc(ids.student, "darsino_snapshot"));
    } finally {
      await db.close();
    }
  },
);

test(
  "expired invitations cannot enroll and the last seat is checked at acceptance",
  { timeout: 60000 },
  async () => {
    const { db, ids, group, run } = await fixture();
    try {
      await db.query(
        "update public.darsino_offerings set capacity=1 where id=$1",
        [group],
      );
      for (const id of [ids.student, ids.peer])
        await db.query(
          "insert into public.darsino_contacts(user_id,peer_id) values($1,$2),($2,$1)",
          [ids.tutor, id],
        );
      const first = await run(ids.tutor, {
        type: "group-invite",
        offeringId: group,
        studentId: ids.student,
      });
      const second = await run(ids.tutor, {
        type: "group-invite",
        offeringId: group,
        studentId: ids.peer,
      });
      assert.equal(second.market.enrollments.length, 0);
      await db.exec("reset role");
      await db.query(
        "update public.darsino_group_invitations set expires_at=now()-interval '1 minute' where id=$1",
        [first.id],
      );
      await assert.rejects(
        run(ids.student, {
          type: "group-invite-decide",
          invitationId: first.id,
          accept: true,
        }),
        /muddati/,
      );
      await db.exec("reset role");
      await db.query(
        "update public.darsino_group_invitations set expires_at=now()+interval '1 day' where id=$1",
        [first.id],
      );
      await run(ids.student, {
        type: "group-invite-decide",
        invitationId: first.id,
        accept: true,
      });
      await assert.rejects(
        run(ids.peer, {
          type: "group-invite-decide",
          invitationId: second.id,
          accept: true,
        }),
        /o‘rin/,
      );
    } finally {
      await db.close();
    }
  },
);
