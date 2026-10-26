import { test } from "node:test";
import assert from "node:assert/strict";
import { demoMarketplace } from "../src/state/demo";
import { blankUser, offeringScheduleLabel } from "../src/state/domain";
import {
  planWeeklyLessons,
  shiftDay,
  dailyAttendance,
  teacherDebtors,
  teacherStudentProgress,
} from "../src/state/teacherDashboard";
import {
  demoClassroomSnapshot,
  emptyClassroom,
  emptyDemoClassroom,
  gradeMock,
  normalizeMockDraft,
  type MockTest,
} from "../src/state/classroom";

test("weekly schedule keeps selected weekday times across months, leap years and Tashkent midnight", () => {
  assert.equal(shiftDay("2028-02-28", 1), "2028-02-29");
  assert.equal(
    offeringScheduleLabel({ days: "Du 18:00 · Chor 15:30", time: "18:00" }),
    "Du 18:00 · Chor 15:30",
  );
  assert.equal(
    offeringScheduleLabel({ days: "Du · Chor", time: "18:00" }),
    "Du · Chor · 18:00",
  );
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.throws(() => shiftDay("2026-02-30", 1));
  const sessions = planWeeklyLessons({
    firstDate: "2026-10-26",
    days: [1, 3, 1],
    times: { 1: "18:00", 3: "15:30" },
    count: 4,
    minutes: 90,
  });
  assert.deepEqual(
    sessions.map((s) => s.startsAt),
    [
      "2026-10-26T13:00:00.000Z",
      "2026-10-28T10:30:00.000Z",
      "2026-11-02T13:00:00.000Z",
      "2026-11-04T10:30:00.000Z",
    ],
  );
  assert.throws(() =>
    planWeeklyLessons({
      firstDate: "2026-10-26",
      days: [],
      times: {},
      count: 4,
      minutes: 90,
    }),
  );
  assert.throws(() =>
    planWeeklyLessons({
      firstDate: "2026-10-26",
      days: [1],
      times: { 1: "24:00" },
      count: 4,
      minutes: 90,
    }),
  );
});
function fixture() {
  const m = demoMarketplace();
  m.enrollments = [];
  m.attendance = [];
  m.messages = [];
  m.sessions = [];
  m.users.push(
    { ...blankUser, id: "alice", name: "Ali", onboarded: true },
    { ...blankUser, id: "bob", name: "Vali", onboarded: true },
  );
  const first = m.offerings.find((g) => g.id === "ielts")!;
  m.offerings.push({ ...first, id: "ielts-second", price: 200000 });
  for (const group of ["ielts", "ielts-second"])
    m.enrollments.push({
      id: group,
      offeringId: group,
      studentId: "alice",
      active: true,
      createdAt: "2026-09-01T00:00:00Z",
    });
  m.enrollments.push({
    id: "later",
    offeringId: "ielts",
    studentId: "bob",
    active: true,
    createdAt: "2026-10-27T00:00:00Z",
  });
  m.sessions.push({
    id: "lesson",
    offeringId: "ielts",
    title: "IELTS",
    mode: "Onlayn",
    startsAt: "2026-10-26T13:00:00Z",
    endsAt: "2026-10-26T14:00:00Z",
    location: "Onlayn",
  });
  return m;
}
test("teacher metrics count lesson attendance, unique debtors and unmeasured scores accurately", () => {
  const m = fixture();
  m.attendance.push({
    sessionId: "lesson",
    studentId: "alice",
    status: "present",
  });
  const attendance = dailyAttendance(m, "dilnoza", "2026-10-26");
  assert.equal(attendance.expected, 1);
  assert.equal(attendance.present, 1);
  const debts = teacherDebtors(m, "dilnoza", "2026-10");
  const alice = debts.find((r) => r.studentId === "alice")!;
  assert.equal(alice.groups.length, 2);
  assert.equal(
    alice.total,
    m.offerings.find((g) => g.id === "ielts")!.price + 200000,
  );
  const progress = teacherStudentProgress(
    m,
    "dilnoza",
    emptyClassroom(),
    "all",
    new Date("2026-10-26T15:00:00Z"),
  );
  assert.equal(progress.find((r) => r.studentId === "alice")!.score, null);
  assert.equal(
    progress.find((r) => r.studentId === "alice")!.attendancePercent,
    100,
  );
  assert.equal(progress.find((r) => r.studentId === "bob")!.expected, 0);
});
test("demo classroom strips answer keys and drafts from students while matching weighted grades", () => {
  const m = fixture(),
    store = emptyDemoClassroom();
  const test: MockTest = {
    id: "test",
    tutorId: "dilnoza",
    offeringId: "ielts",
    title: "Algebra",
    subject: "Ingliz tili",
    source: "file",
    fileId: "file",
    questionCount: 30,
    minutes: 80,
    difficulty: "medium",
    scoring: "dtm",
    questions: [],
    answerKey: Array(30).fill(0),
    status: "published",
    createdAt: "2026-10-26T00:00:00Z",
    updatedAt: "2026-10-26T00:00:00Z",
  };
  store.tests.push(test, { ...test, id: "draft", status: "draft" });
  assert.equal(demoClassroomSnapshot(store, m, "alice").tests.length, 1);
  assert.equal(
    "answerKey" in demoClassroomSnapshot(store, m, "alice").tests[0],
    false,
  );
  assert.equal(demoClassroomSnapshot(store, m, "dilnoza").tests.length, 2);
  assert.equal(demoClassroomSnapshot(store, m, "unknown").tests.length, 0);
  assert.deepEqual(
    gradeMock(
      test,
      Array.from({ length: 30 }, (_, i) => (i < 10 ? 0 : null)),
    ),
    { correctCount: 10, score: 11, maxScore: 63, percentage: 17 },
  );
  assert.throws(
    () => normalizeMockDraft({ ...test, answerKey: Array(30).fill(null) }),
    /kalitini/,
  );
  assert.throws(() => gradeMock(test, [0]), /Javoblar/);
});
