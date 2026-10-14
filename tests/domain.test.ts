import { test } from "node:test";
import { validPhone } from "../src/state/model";
import assert from "node:assert/strict";
import { applyMarketCommand } from "../src/state/marketplace";
import { demoAccount, demoMarketplace } from "../src/state/demo";
import {
  dmId,
  nextDates,
  publicGroups,
  publicTutors,
  toLessonTime,
  type Marketplace,
  type MarketCommand,
  type RequestInput,
} from "../src/state/domain";
const profile = {
  name: "Sardor Test",
  city: "Toshkent",
  area: "Yunusobod",
  interests: ["Ingliz tili"],
  goal: "IELTS / CEFR",
};
function student(m = demoMarketplace(), phone = "+998901234567") {
  const a = demoAccount(m, phone, "student");
  return {
    user: a.user,
    market: applyMarketCommand(a.market, a.user.id, {
      type: "profile",
      profile,
    }).market,
  };
}
function joinRequest(m: Marketplace, id: string, groupId = "ielts") {
  const g = m.offerings.find((g) => g.id === groupId)!;
  return applyMarketCommand(m, id, {
    type: "request",
    request: {
      kind: "group",
      groupId,
      tutorId: g.tutorId,
      title: g.title,
      subtitle: g.subject,
      time: g.time,
      price: g.price,
    },
  });
}
test("approval alone creates membership, schedule and student notification", () => {
  const { market, user } = student();
  const pending = joinRequest(market, user.id);
  assert.equal(pending.market.enrollments.length, 0);
  const approved = applyMarketCommand(pending.market, "dilnoza", {
    type: "decide",
    requestId: pending.id!,
    decision: "approved",
    note: "Xush kelibsiz",
  });
  assert.equal(
    approved.market.enrollments.filter(
      (e) => e.studentId === user.id && e.active,
    ).length,
    1,
  );
  assert.ok(
    approved.market.sessions.some(
      (s) => s.offeringId === approved.market.enrollments[0].offeringId,
    ),
  );
  assert.ok(
    approved.market.notifications.some(
      (n) => n.userId === user.id && n.title === "Arizangiz tasdiqlandi",
    ),
  );
  assert.equal(market.enrollments.length, 0, "source is immutable");
  assert.throws(
    () =>
      applyMarketCommand(approved.market, "dilnoza", {
        type: "decide",
        requestId: pending.id!,
        decision: "approved",
        note: "",
      }),
    /allaqachon/,
  );
});
test("student and another tutor cannot approve an application", () => {
  const { market, user } = student(),
    pending = joinRequest(market, user.id);
  for (const id of [user.id, "akmal"])
    assert.throws(() =>
      applyMarketCommand(pending.market, id, {
        type: "decide",
        requestId: pending.id!,
        decision: "approved",
        note: "",
      }),
    );
});
test("duplicate pending requests are idempotent; rejection and cancellation never enroll", () => {
  const { market, user } = student(),
    pending = joinRequest(market, user.id),
    again = joinRequest(pending.market, user.id);
  assert.equal(again.id, pending.id);
  assert.equal(again.market.applications.length, 1);
  const cancelled = applyMarketCommand(pending.market, user.id, {
    type: "cancel",
    requestId: pending.id!,
  });
  assert.equal(cancelled.market.enrollments.length, 0);
  const fresh = joinRequest(cancelled.market, user.id),
    rejected = applyMarketCommand(fresh.market, "dilnoza", {
      type: "decide",
      requestId: fresh.id!,
      decision: "rejected",
      note: "Guruh darajasi mos emas",
    });
  assert.equal(rejected.market.enrollments.length, 0);
  assert.equal(rejected.market.applications[0].status, "rejected");
});
test("the last group seat can only be filled once", () => {
  const a = student(),
    b = student(a.market, "+998901234568");
  b.market.offerings.find((o) => o.id === "ielts")!.reservedSeats = 11;
  const one = joinRequest(b.market, a.user.id),
    two = joinRequest(one.market, b.user.id);
  const first = applyMarketCommand(two.market, "dilnoza", {
    type: "decide",
    requestId: one.id!,
    decision: "approved",
    note: "",
  });
  assert.throws(
    () =>
      applyMarketCommand(first.market, "dilnoza", {
        type: "decide",
        requestId: two.id!,
        decision: "approved",
        note: "",
      }),
    /oxirgi o‘rin/,
  );
  assert.equal(
    publicGroups(first.market).find((g) => g.id === "ielts")!.spots,
    0,
  );
});
test("tutor onboarding requires moderation before publishing; public role cannot elevate", () => {
  const a = demoAccount(demoMarketplace(), "+998909999999", "tutor");
  const tutor = {
    subjects: ["Fizika"],
    specialty: "Mexanika",
    experience: 3,
    proof: "Diplom FZ-12345",
    bio: "Abituriyentlar uchun fizika darslari",
    price: 70000,
    modes: ["Onlayn"],
    availability: ["10:00"],
  };
  const p = applyMarketCommand(a.market, a.user.id, {
    type: "profile",
    profile: { ...profile, interests: ["Fizika"] },
    role: "tutor",
    tutor,
  });
  const command: MarketCommand = {
    type: "offering",
    offering: {
      title: "Fizika 2026",
      subject: "Fizika",
      type: "group",
      capacity: 10,
      price: 70000,
      mode: "Onlayn",
      area: "Yunusobod",
      location: "Zoom",
      days: "Haftalik",
      benefits: [],
      sessions: [toLessonTime(nextDates(1)[0], "10:00")],
    },
  };
  assert.throws(
    () => applyMarketCommand(p.market, a.user.id, command),
    /moderator/,
  );
  assert.throws(
    () =>
      applyMarketCommand(p.market, a.user.id, {
        type: "moderate",
        tutorId: a.user.id,
        decision: "approved",
        note: "",
      }),
    /moderator/,
  );
  const approved = applyMarketCommand(p.market, "demo-moderator", {
    type: "moderate",
    tutorId: a.user.id,
    decision: "approved",
    note: "",
  });
  assert.ok(applyMarketCommand(approved.market, a.user.id, command).id);
  assert.ok(publicTutors(approved.market).some((t) => t.id === a.user.id));
  const fresh = demoAccount(demoMarketplace(), "+998909999998", "student");
  assert.throws(
    () =>
      applyMarketCommand(fresh.market, fresh.user.id, {
        type: "profile",
        profile,
        role: "moderator",
      } as unknown as MarketCommand),
    /Rol/,
  );
});
test("individual lesson approval creates a private class, and overlapping schedules are rejected", () => {
  const { market, user } = student();
  const times = toLessonTime(nextDates(1)[0], "10:00");
  const request: RequestInput = {
    kind: "lesson",
    tutorId: "dilnoza",
    title: "Individual dars",
    subtitle: "Ingliz tili",
    time: "10:00",
    price: 90000,
    ...times,
  };
  const pending = applyMarketCommand(market, user.id, {
    type: "request",
    request,
  });
  const approved = applyMarketCommand(pending.market, "dilnoza", {
    type: "decide",
    requestId: pending.id!,
    decision: "approved",
    note: "",
  });
  const own = approved.market.offerings.find(
    (o) => o.id === approved.market.enrollments[0].offeringId,
  )!;
  assert.equal(own.type, "individual");
  assert.equal(own.published, false);
  assert.equal(own.duration, 60);
  assert.throws(
    () =>
      applyMarketCommand(approved.market, "dilnoza", {
        type: "offering",
        offering: {
          title: "Overlap",
          subject: "Ingliz tili",
          type: "group",
          capacity: 5,
          price: 90000,
          mode: "Onlayn",
          area: "Yunusobod",
          location: "Zoom",
          days: "Haftalik",
          benefits: [],
          sessions: [times],
        },
      }),
    /boshqa dars/,
  );
});
test("reviews require completed attendance and cannot be duplicated", () => {
  const a = student(),
    pending = joinRequest(a.market, a.user.id),
    approved = applyMarketCommand(pending.market, "dilnoza", {
      type: "decide",
      requestId: pending.id!,
      decision: "approved",
      note: "",
    });
  const s = approved.market.sessions.find((s) => s.offeringId === "ielts")!;
  assert.throws(
    () =>
      applyMarketCommand(approved.market, a.user.id, {
        type: "review",
        sessionId: s.id,
        rating: 5,
        text: "Juda foydali",
      }),
    /tugagandan/,
  );
  const after = new Date(new Date(s.endsAt).getTime() + 1000);
  assert.throws(
    () =>
      applyMarketCommand(
        approved.market,
        a.user.id,
        { type: "review", sessionId: s.id, rating: 5, text: "Juda foydali" },
        after,
      ),
    /qatnashgan/,
  );
  assert.throws(() =>
    applyMarketCommand(
      approved.market,
      "akmal",
      {
        type: "attendance",
        sessionId: s.id,
        studentId: a.user.id,
        status: "present",
      },
      after,
    ),
  );
  const attended = applyMarketCommand(
    approved.market,
    "dilnoza",
    {
      type: "attendance",
      sessionId: s.id,
      studentId: a.user.id,
      status: "present",
    },
    after,
  );
  const reviewed = applyMarketCommand(
    attended.market,
    a.user.id,
    { type: "review", sessionId: s.id, rating: 5, text: "Juda foydali" },
    after,
  );
  assert.equal(
    publicTutors(reviewed.market).find((t) => t.id === "dilnoza")!.rating,
    5,
  );
  assert.throws(
    () =>
      applyMarketCommand(
        reviewed.market,
        a.user.id,
        { type: "review", sessionId: s.id, rating: 5, text: "Yana bir fikr" },
        after,
      ),
    /qoldirgansiz/,
  );
});
test("direct messages belong to their actual participants; existing account keeps its role", () => {
  const { market, user } = student(),
    conversationId = dmId(user.id, "dilnoza");
  const sent = applyMarketCommand(market, user.id, {
    type: "message",
    conversationId,
    text: "Salom, IELTS haqida yozdim",
  });
  assert.equal(sent.market.messages[0].recipientId, "dilnoza");
  assert.throws(
    () =>
      applyMarketCommand(sent.market, "akmal", {
        type: "message",
        conversationId,
        text: "Begona",
      }),
    /huquq/,
  );
  assert.equal(
    demoAccount(sent.market, user.phone, "tutor").user.role,
    "student",
  );
  assert.equal(
    demoAccount(sent.market, "+998901111111", "student").user.role,
    "tutor",
  );
});
test("invalid calendar dates cannot produce shifted sessions", () => {
  assert.throws(() => toLessonTime("2027-02-30", "18:00"));
  assert.throws(() => toLessonTime("2027-02-28", "25:00"));
  assert.equal(
    toLessonTime("2027-02-28", "18:00").startsAt,
    "2027-02-28T13:00:00.000Z",
  );
});

test("phone validation supports local and international Uzbek numbers", () => {
  assert.ok(validPhone("901234567"));
  assert.ok(validPhone("+998 90 123 45 67"));
  assert.equal(validPhone("+997901234567"), false);
  assert.equal(validPhone("90123456"), false);
});
