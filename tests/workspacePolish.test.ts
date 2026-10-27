import { test } from "node:test";
import assert from "node:assert/strict";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import { emptyClassroom } from "../src/state/classroom";
import { teacherFinance, financeHistory, csvCell } from "../src/state/finance";
import {
  studentWorkspace,
  studentResults,
} from "../src/state/studentWorkspace";
import { parseContactQr, contactLink, publicIdOf } from "../src/state/account";
function fixture() {
  const m = demoMarketplace();
  m.enrollments = [];
  m.sessions = [];
  m.attendance = [];
  m.payments = [];
  m.users.push({ ...blankUser, id: "learner", name: "Ali", onboarded: true });
  for (const id of ["ielts", "ielts-second"]) {
    if (id !== "ielts")
      m.offerings.push({
        ...m.offerings.find((g) => g.id === "ielts")!,
        id,
        price: 200000,
      });
    m.enrollments.push({
      id,
      studentId: "learner",
      offeringId: id,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
    });
  }
  m.sessions.push(
    {
      id: "past",
      offeringId: "ielts",
      title: "IELTS",
      startsAt: "2026-10-26T13:00:00Z",
      endsAt: "2026-10-26T14:00:00Z",
      mode: "Onlayn",
      location: "Online",
    },
    {
      id: "future",
      offeringId: "ielts",
      title: "IELTS",
      startsAt: "2026-10-28T13:00:00Z",
      endsAt: "2026-10-28T14:00:00Z",
      mode: "Onlayn",
      location: "Online",
    },
  );
  m.attendance.push({
    sessionId: "past",
    studentId: "learner",
    status: "present",
  });
  return m;
}
test("finance aggregates owned monthly dues and paid history without duplicating a debtor", () => {
  const m = fixture();
  let f = teacherFinance(m, "dilnoza", "2026-10");
  assert.equal(f.debtorCount, 1);
  assert.equal(f.rows.length, 2);
  const price = m.offerings.find((g) => g.id === "ielts")!.price;
  assert.equal(f.expected, price + 200000);
  m.payments!.push({
    offeringId: "ielts",
    studentId: "learner",
    month: "2026-10",
    amount: price,
    paid: true,
    paidAt: "2026-10-20T10:00:00Z",
    remindedAt: null,
    updatedAt: "2026-10-20T10:00:00Z",
  });
  f = teacherFinance(m, "dilnoza", "2026-10");
  assert.equal(f.received, price);
  assert.equal(f.outstanding, 200000);
  assert.equal(teacherFinance(m, "akmal", "2026-10").received, 0);
  assert.equal(teacherFinance(m, "dilnoza", "2026-10", "ielts").outstanding, 0);
  assert.equal(financeHistory(m, "dilnoza", "2026-10").at(-1)!.received, price);
  assert.deepEqual(
    financeHistory(m, "dilnoza", "2026-02").map((x) => x.month),
    ["2025-11", "2025-12", "2026-01", "2026-02"],
  );
});
test("student workspace mirrors only its own accepted classes, tests, attendance and payments", () => {
  const m = fixture(),
    c = emptyClassroom();
  c.tests.push({
    id: "mock",
    tutorId: "dilnoza",
    offeringId: "ielts",
    title: "IELTS",
    subject: "Ingliz tili",
    source: "manual",
    fileId: null,
    questionCount: 1,
    minutes: 5,
    difficulty: "medium",
    scoring: "uniform",
    questions: [],
    status: "published",
    createdAt: "2026-10-26",
    updatedAt: "2026-10-26",
  });
  let s = studentWorkspace(m, "learner", c, new Date("2026-10-27T10:00:00Z"));
  assert.equal(s.groups.length, 2);
  assert.equal(s.present, 1);
  assert.equal(s.attendancePercent, 100);
  assert.equal(s.next?.id, "future");
  assert.equal(s.pendingTests.length, 1);
  assert.ok(s.due > 0);
  assert.equal(studentWorkspace(m, "other", c).groups.length, 0);
  assert.equal(studentWorkspace(m, "other", c).tests.length, 0);
  c.attempts.push({
    id: "a",
    testId: "mock",
    studentId: "learner",
    startedAt: "2026-10-26T10:00:00Z",
    completedAt: "2026-10-26T10:01:00Z",
    answers: [0],
    correctCount: 1,
    score: 1,
    maxScore: 1,
    percentage: 100,
  });
  s = studentWorkspace(m, "learner", c);
  assert.equal(s.pendingTests.length, 0);
  assert.equal(studentResults("learner", c, [])[0].percentage, 100);
  assert.equal(studentResults("other", c, []).length, 0);
});
test("QR payload parsing accepts only complete O‘qi contact links and preserves the public ID", () => {
  const id = publicIdOf({ id: "teacher-id" });
  assert.equal(parseContactQr(contactLink(id)), id);
  assert.equal(parseContactQr("  " + contactLink(id) + "  "), id);
  for (const invalid of [
    "https://evil.test/",
    id,
    "javascript:alert(1)",
    "darsino://connect/bad",
    "darsino://connect/hello?redirect=evil",
    "darsino://connect/%ZZ",
    "darsino://connect/" + "a".repeat(400),
  ])
    assert.equal(parseContactQr(invalid), null);
});
test("CSV exports escape quotes and spreadsheet formula prefixes", () => {
  assert.equal(csvCell('Ali "Test"'), '"Ali ""Test"""');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell(" +SUM(A1)"), '"\' +SUM(A1)"');
  assert.equal(csvCell(123), '"123"');
});
