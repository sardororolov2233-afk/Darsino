import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { demoMarketplace } from "../src/state/demo";
import { blankUser, type MarketCommand } from "../src/state/domain";
import { applyMarketCommand } from "../src/state/marketplace";
import {
  canRemind,
  groupPaymentRows,
  paymentMonth,
  paymentSummary,
} from "../src/state/payments";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

test("monthly records are scoped, idempotent, survive removal and notify students without repeated reminders", () => {
  const now = new Date("2026-10-20T07:00:00Z");
  let market = demoMarketplace();
  market.users.push({
    ...blankUser,
    id: "payment-student",
    name: "Ali Valiyev",
    onboarded: true,
  });
  market.enrollments.push({
    id: "payment-enrollment",
    offeringId: "ielts",
    studentId: "payment-student",
    active: true,
    createdAt: "2026-09-15T12:00:00Z",
  });
  const due = market.offerings.find((g) => g.id === "ielts")!.price;
  const run = (command: MarketCommand, actor = "dilnoza") => {
    market = applyMarketCommand(market, actor, command, now).market;
  };
  assert.equal(paymentMonth(new Date("2026-09-30T20:00:00Z")), "2026-10");
  const mark: MarketCommand = {
    type: "payment",
    offeringId: "ielts",
    studentId: "payment-student",
    month: "2026-10",
    paid: true,
  };
  for (const actor of ["akmal", "payment-student"])
    assert.throws(() => run(mark, actor));
  assert.throws(() => run({ ...mark, month: "2026-13" }), /oyi/);
  assert.throws(() => run({ ...mark, month: "2026-08" }), /qatnashmaydi/);
  const remind: MarketCommand = {
    type: "payment-reminder",
    offeringId: "ielts",
    month: "2026-10",
  };
  run(remind);
  assert.equal(
    market.notifications.filter((n) => n.title === "Oylik to‘lov eslatmasi")
      .length,
    1,
  );
  assert.throws(() => run(remind), /24 soat/);
  assert.equal(
    canRemind(market.payments![0], new Date(now.getTime() + 86400000)),
    true,
  );
  run(mark);
  run(mark);
  assert.equal(
    market.notifications.filter((n) => n.title === "To‘lov qayd etildi").length,
    1,
  );
  assert.equal(market.payments!.length, 1);
  assert.equal(paymentSummary(market, "dilnoza", "2026-10").received, due);
  assert.equal(paymentSummary(market, "dilnoza", "2026-09").received, 0);
  assert.throws(() => run(remind), /eslatma yo‘q/);
  run({ ...mark, paid: false });
  assert.equal(paymentSummary(market, "dilnoza", "2026-10").outstanding, due);
  run({ ...mark, month: "2026-11" });
  assert.equal(market.payments!.length, 2);
  run({
    type: "remove-participant",
    offeringId: "ielts",
    studentId: "payment-student",
  });
  assert.equal(groupPaymentRows(market, "ielts", "2026-11")[0].paid, true);
  assert.equal(groupPaymentRows(market, "ielts", "2026-12").length, 0);
});

test(
  "Postgres payment RPC protects records, shares only own rows, preserves auth wrappers and upgrades safely",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    const ids = {
      tutor: "20000000-0000-4000-8000-000000000061",
      other: "20000000-0000-4000-8000-000000000062",
      student: "10000000-0000-4000-8000-000000000061",
      peer: "10000000-0000-4000-8000-000000000062",
    };
    try {
      await applyMigrations(db);
      for (const id of Object.values(ids))
        await db.query("insert into auth.users(id) values($1)", [id]);
      await db.query(
        "update public.darsino_profiles set onboarded=true,name='Ali Valiyev',study_mode='Onlayn',study_support='Ustoz bilan'",
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
              price: 100000,
              modes: ["Onlayn"],
              bio: "Ustoz profili",
              proof: "Diplom",
              availability: ["14:00"],
            }),
          ],
        );
      }
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
            }),
          ],
        )
      ).rows[0].id;
      for (const id of [ids.student, ids.peer])
        await db.query(
          "insert into public.darsino_enrollments(offering_id,student_id,created_at) values($1,$2,'2026-09-15T12:00:00Z')",
          [group, id],
        );
      const as = async (id: string, command?: Record<string, unknown>) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
        return (
          await db.query<{ result: any }>(
            command
              ? "select public.darsino_mutate($1::jsonb) result"
              : "select public.darsino_snapshot() result",
            command ? [JSON.stringify({ actorId: id, ...command })] : [],
          )
        ).rows[0].result;
      };
      const mark = {
        type: "payment",
        offeringId: group,
        studentId: ids.student,
        month: "2026-10",
        paid: true,
      };
      for (const id of [ids.other, ids.student, ids.peer])
        await assert.rejects(as(id, mark));
      await assert.rejects(
        as(ids.tutor, { ...mark, actorId: ids.other }),
        /Akkaunt/,
      );
      await assert.rejects(as(ids.tutor, { ...mark, month: "2026-13" }), /oyi/);
      await assert.rejects(
        as(ids.tutor, { ...mark, month: "2026-08" }),
        /qatnashmaydi/,
      );
      await assert.rejects(as(ids.tutor, { ...mark, paid: "true" }), /holati/);
      let result = await as(ids.tutor, mark);
      assert.equal(result.market.payments[0].amount, 300000);
      assert.equal(result.user.studyMode, "Onlayn");
      await as(ids.tutor, mark);
      let student = await as(ids.student);
      assert.equal(student.market.payments.length, 1);
      assert.equal(
        student.market.notifications.filter(
          (n: any) => n.title === "To‘lov qayd etildi",
        ).length,
        1,
      );
      assert.equal((await as(ids.peer)).market.payments.length, 0);
      assert.equal((await as(ids.other)).market.payments.length, 0);
      await assert.rejects(
        db.query("select * from public.darsino_payments"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.darsino_record_payment('{}')"),
        /permission denied/,
      );
      const reminder = {
        type: "payment-reminder",
        offeringId: group,
        month: "2026-10",
      };
      result = await as(ids.tutor, reminder);
      assert.equal(result.market.payments.length, 2);
      assert.equal(
        (await as(ids.student)).market.notifications.filter(
          (n: any) => n.title === "Oylik to‘lov eslatmasi",
        ).length,
        0,
      );
      assert.equal(
        (await as(ids.peer)).market.notifications.filter(
          (n: any) => n.title === "Oylik to‘lov eslatmasi",
        ).length,
        1,
      );
      await assert.rejects(as(ids.tutor, reminder), /24 soat/);
      await as(ids.tutor, { ...mark, paid: false });
      await as(ids.tutor, { ...reminder, studentId: ids.student });
      await assert.rejects(
        as(ids.tutor, { ...reminder, studentId: ids.student }),
        /24 soat/,
      );
      student = await as(ids.student);
      assert.equal(student.market.payments[0].paid, false);
      assert.equal(student.market.payments[0].paidAt, null);
      await db.exec("reset role");
      await db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610200001_group_payments.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.equal((await as(ids.tutor)).market.payments.length, 2);
      await as(ids.tutor, { type: "read-notifications" });
      await as(ids.tutor, { ...mark, month: "2026-11" });
      await as(ids.tutor, {
        type: "remove-participant",
        offeringId: group,
        studentId: ids.student,
      });
      assert.equal((await as(ids.student)).market.payments.length, 2);
    } finally {
      await db.close();
    }
  },
);
