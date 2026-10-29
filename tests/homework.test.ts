import { test } from "node:test";
import assert from "node:assert/strict";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import {
  emptyHomework,
  saveAssignment,
  submitAssignment,
  reviewAssignment,
  homeworkSnapshot,
  type AssignmentDraft,
} from "../src/state/homework";
test("homework demo mirrors recipient boundaries, request idempotency and immutable resubmission history", () => {
  const m = demoMarketplace(),
    s = emptyHomework();
  for (const id of ["student", "peer"]) {
    m.users.push({ ...blankUser, id, name: id, onboarded: true });
    m.enrollments.push({
      id,
      offeringId: "ielts",
      studentId: id,
      active: true,
      createdAt: new Date().toISOString(),
    });
  }
  const d: AssignmentDraft = {
    id: "assignment",
    offeringId: "ielts",
    title: "Essay vazifasi",
    description: "Write an essay",
    subject: "Ingliz tili",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    recipientIds: ["student"],
    fileIds: [],
    revision: 0,
  };
  saveAssignment(s, m, "dilnoza", d);
  assert.equal(homeworkSnapshot(s, m, "student").assignments.length, 0);
  const published = { ...d, status: "published" as const, revision: 1 };
  saveAssignment(s, m, "dilnoza", published);
  saveAssignment(s, m, "dilnoza", published);
  assert.equal(s.events.length, 1);
  assert.equal(homeworkSnapshot(s, m, "peer").assignments.length, 0);
  assert.throws(
    () => submitAssignment(s, m, "peer", "peer-reply", d.id, "x", []),
    /ruxsat/,
  );
  submitAssignment(s, m, "student", "reply", d.id, "Birinchi javob", []);
  submitAssignment(s, m, "student", "reply", d.id, "Birinchi javob", []);
  assert.equal(s.submissions.length, 1);
  assert.throws(
    () => submitAssignment(s, m, "student", "reply2", d.id, "another", []),
    /tekshiruvda/,
  );
  assert.throws(
    () => reviewAssignment(s, m, "peer", "reply", "accepted", "ok"),
    /Faqat/,
  );
  reviewAssignment(
    s,
    m,
    "dilnoza",
    "reply",
    "changes_requested",
    "Xulosani tuzating",
  );
  submitAssignment(s, m, "student", "reply2", d.id, "Tuzatilgan javob", []);
  reviewAssignment(s, m, "dilnoza", "reply2", "accepted", "Yaxshi");
  assert.equal(s.submissions.length, 2);
  assert.equal(
    s.submissions.find((s) => s.id === "reply")?.feedback,
    "Xulosani tuzating",
  );
  assert.equal(homeworkSnapshot(s, m, "peer").submissions.length, 0);
  assert.equal(homeworkSnapshot(s, m, "student").events.length, 3);
});
