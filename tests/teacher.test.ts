import { test } from "node:test";
import assert from "node:assert/strict";
import { demoMarketplace } from "../src/state/demo";
import {
  blankUser,
  nextDates,
  toLessonTime,
  dmId,
  publicGroups,
  type Message,
} from "../src/state/domain";
import {
  assessmentSummary,
  encodeAssessment,
  parseAssessment,
  validInvitation,
  type TestInvitation,
} from "../src/state/assessments";
import {
  teacherOverview,
  prepareRoomPlan,
  readTeacherWorkspace,
  CLUB_MARKER,
  isClubOffering,
} from "../src/state/teacher";
import { applyMarketCommand } from "../src/state/marketplace";
function fixture() {
  const market = demoMarketplace();
  market.users.push(
    {
      ...blankUser,
      id: "student-a",
      role: "student",
      name: "Ali",
      onboarded: true,
    },
    {
      ...blankUser,
      id: "student-b",
      role: "student",
      name: "Vali",
      onboarded: true,
    },
  );
  market.enrollments.push(
    {
      id: "enrolled-a",
      studentId: "student-a",
      offeringId: "ielts",
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "enrolled-b",
      studentId: "student-b",
      offeringId: "math",
      active: true,
      createdAt: new Date().toISOString(),
    },
  );
  return market;
}
const invite: TestInvitation = {
  kind: "invite",
  id: "invitation-a",
  tutorId: "dilnoza",
  studentId: "student-a",
  offeringId: "ielts",
  testId: "math-basics",
  title: "Haftalik test",
};
const message = (id: string, senderId: string, text: string): Message => ({
  id,
  senderId,
  conversationId: dmId("student-a", "dilnoza"),
  text,
  mine: false,
  time: "12:00",
});
test("teacher overview counts only owned active enrollments and recorded started attendance", () => {
  const m = fixture();
  m.sessions.push({
    ...m.sessions[0],
    id: "past",
    startsAt: "2020-01-01T10:00:00Z",
    endsAt: "2020-01-01T11:00:00Z",
  });
  m.attendance.push(
    { sessionId: "past", studentId: "student-a", status: "present" },
    { sessionId: m.sessions[0].id, studentId: "student-a", status: "absent" },
    { sessionId: "past", studentId: "student-b", status: "absent" },
  );
  const stats = teacherOverview(m, "dilnoza");
  assert.deepEqual([...stats.studentIds], ["student-a"]);
  assert.equal(stats.attendance.length, 1);
  assert.equal(stats.present, 1);
  assert.equal(teacherOverview(m, "dilnoza", "math").classes.length, 0);
});
test("radar accepts shared answers only from the invited student and genuine teacher conversation", () => {
  const m = fixture();
  const sent = message(
    "invitation-message",
    "dilnoza",
    encodeAssessment(invite),
  );
  m.messages.push(
    sent,
    message(
      "result",
      "student-a",
      encodeAssessment({
        kind: "result",
        invitationId: invite.id,
        answers: [1, 2, 0, 0, 0],
      }),
    ),
  );
  assert.ok(validInvitation(m, sent));
  assert.equal(assessmentSummary(m, "dilnoza").score, 40);
  assert.equal(assessmentSummary(m, "akmal").score, null);
  assert.equal(assessmentSummary(m, "dilnoza", "math").score, null);
  m.messages.push(
    message(
      "forged",
      "student-b",
      encodeAssessment({
        kind: "result",
        invitationId: invite.id,
        answers: [1, 2, 1, 1, 1],
      }),
    ),
  );
  assert.equal(assessmentSummary(m, "dilnoza").score, 40);
  m.messages.push(
    message(
      "later",
      "student-a",
      encodeAssessment({
        kind: "result",
        invitationId: invite.id,
        answers: [1, 2, 1, 1, 1],
      }),
    ),
  );
  assert.equal(assessmentSummary(m, "dilnoza").score, 100);
  m.enrollments[0].active = false;
  assert.equal(assessmentSummary(m, "dilnoza").score, null);
});
test("malformed payloads, impersonated invitations and invalid answer lengths cannot populate radar", () => {
  const m = fixture();
  assert.equal(parseAssessment("OQI_DIAGNOSTIC_V1:{broken"), null);
  assert.equal(
    validInvitation(m, message("fake", "student-a", encodeAssessment(invite))),
    null,
  );
  m.messages.push(
    message("real", "dilnoza", encodeAssessment(invite)),
    message(
      "bad",
      "student-a",
      encodeAssessment({
        kind: "result",
        invitationId: invite.id,
        answers: [1],
      }),
    ),
  );
  assert.equal(assessmentSummary(m, "dilnoza").score, null);
});
test("room plans reject foreign groups, insufficient seats, invalid dates and time conflicts", () => {
  const m = fixture();
  const input = {
    roomId: "study-hub",
    offeringId: "ielts",
    date: nextDates(1)[0],
    time: "09:00",
    hours: 2,
  };
  const plan = prepareRoomPlan(m, "dilnoza", [], input);
  assert.equal(plan.estimatedCost, 160000);
  assert.throws(() => prepareRoomPlan(m, "akmal", [], input), /O‘z guruhingiz/);
  assert.throws(
    () => prepareRoomPlan(m, "dilnoza", [], { ...input, roomId: "ziyo" }),
    /sig‘imi/,
  );
  assert.throws(
    () => prepareRoomPlan(m, "dilnoza", [], { ...input, date: "2026-02-30" }),
    /noto‘g‘ri/,
  );
  assert.throws(
    () =>
      prepareRoomPlan(m, "dilnoza", [{ ...plan, id: "existing" }], {
        ...input,
        time: "10:00",
      }),
    /boshqa rejasiga/,
  );
  assert.doesNotThrow(() =>
    prepareRoomPlan(m, "dilnoza", [{ ...plan, id: "existing" }], {
      ...input,
      time: "11:00",
    }),
  );
  assert.throws(() => readTeacherWorkspace("{}"));
});
test("free clubs publish with zero initial membership while ordinary lessons keep their price validation", () => {
  const m = fixture();
  const offering = {
    title: "English klub",
    subject: "Ingliz tili",
    type: "group" as const,
    capacity: 10,
    price: 0,
    mode: "Onlayn",
    area: "Yunusobod",
    location: "https://example.com/club",
    days: "Doimiy klub",
    benefits: [CLUB_MARKER],
    sessions: [toLessonTime(nextDates(1)[0], "10:00", 60)],
  };
  const result = applyMarketCommand(m, "dilnoza", {
    type: "offering",
    offering,
  });
  const club = publicGroups(result.market).find((g) => g.id === result.id)!;
  assert.ok(isClubOffering(club));
  assert.equal(club.price, 0);
  assert.equal(club.students, 0);
  assert.throws(() =>
    applyMarketCommand(m, "dilnoza", {
      type: "offering",
      offering: { ...offering, benefits: [] },
    }),
  );
  assert.throws(() =>
    applyMarketCommand(m, "dilnoza", {
      type: "offering",
      offering: { ...offering, price: -1 },
    }),
  );
});
