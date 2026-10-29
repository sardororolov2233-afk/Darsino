import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPasswordRecovery } from "../src/services/authFlow";
import {
  studentResults,
  comparableGrowth,
  studentWorkspace,
} from "../src/state/studentWorkspace";
import { emptyClassroom } from "../src/state/classroom";
import { emptyLearning, readLearning } from "../src/state/learning";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import { applyMarketCommand } from "../src/state/marketplace";
import { canContactMessage, readAccountSettings } from "../src/state/account";
test("password recovery validates locally, uses a PKCE redirect and ends the recovery session", async () => {
  const calls: string[] = [];
  const client = {
    auth: {
      resetPasswordForEmail: async (
        email: string,
        o: { redirectTo: string },
      ) => {
        calls.push(email + " " + o.redirectTo);
        return { error: null };
      },
      updateUser: async (p: { password: string }) => {
        assert.equal(p.password, "  new pass  ");
        calls.push("update");
        return { error: null };
      },
      signOut: async (o: { scope: string }) => {
        assert.equal(o.scope, "local");
        calls.push("signout");
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const a = createPasswordRecovery(client);
  await assert.rejects(a.request("bad", "darsino://auth/callback"));
  await assert.rejects(a.update("short", "short"));
  await a.request(" USER@EXAMPLE.TEST ", "darsino://auth/callback");
  await a.update("  new pass  ", "  new pass  ");
  assert.deepEqual(calls, [
    "user@example.test darsino://auth/callback",
    "update",
    "signout",
  ]);
});
test("learning decoding deduplicates retry IDs and growth compares only the same assessment", () => {
  const data = {
    ...emptyLearning(),
    attempts: [
      {
        id: "one",
        testId: "math-basics",
        answers: [0, 0, 0, 0, 0],
        completedAt: "2026-10-27T10:00:00Z",
      },
      {
        id: "one",
        testId: "math-basics",
        answers: [0, 0, 0, 0, 0],
        completedAt: "2026-10-27T10:00:00Z",
      },
    ],
  };
  assert.equal(readLearning(JSON.stringify(data)).attempts.length, 1);
  const results = studentResults("me", emptyClassroom(), [
    data.attempts[0],
    { ...data.attempts[0], id: "two", completedAt: "2026-10-28T10:00:00Z" },
  ]);
  assert.equal(comparableGrowth(results)?.delta, 0);
  assert.equal(
    comparableGrowth([
      { ...results[0], comparisonKey: "different" },
      results[1],
    ]),
    null,
  );
  const m = demoMarketplace();
  m.enrollments.push({
    id: "me",
    offeringId: "ielts",
    studentId: "me",
    active: true,
    createdAt: "2020-01-01T00:00:00Z",
  });
  assert.equal(
    studentWorkspace(m, "me", emptyClassroom(), new Date("2100-01-01"))
      .attendancePercent,
    null,
  );
});
test("new students receive private defaults and teacher communication still requires contact consent", () => {
  const m = demoMarketplace();
  m.users.push({ ...blankUser, id: "new-student" });
  const result = applyMarketCommand(m, "new-student", {
    type: "profile",
    profile: {
      name: "Ali Valiyev",
      city: "Toshkent",
      area: "Yunusobod",
      goal: "IELTS olish",
      interests: ["Ingliz tili"],
      studyMode: "Onlayn",
      studySupport: "Ustoz bilan",
    },
  }).market;
  const settings = readAccountSettings(result.accountSettings?.["new-student"]);
  assert.equal(settings.discoverable, false);
  assert.equal(settings.messagePolicy, "contacts");
  const me = result.users.find((u) => u.id === "new-student")!,
    teacher = result.users.find((u) => u.id === "dilnoza")!;
  assert.equal(canContactMessage(result, teacher, me), false);
  result.enrollments.push({
    id: "ok",
    offeringId: "ielts",
    studentId: me.id,
    active: true,
    createdAt: new Date().toISOString(),
  });
  assert.equal(canContactMessage(result, teacher, me), false);
  result.contacts = [
    { userId: me.id, peerId: teacher.id, createdAt: new Date().toISOString() },
    { userId: teacher.id, peerId: me.id, createdAt: new Date().toISOString() },
  ];
  assert.equal(canContactMessage(result, teacher, me), true);
});

test("lost homework finalization responses resume without uploading a second object", async () => {
  const { sendHomeworkFile, HomeworkUploadError } =
    await import("../src/services/homeworkFiles");
  let uploads = 0,
    finalizations = 0;
  const c = {
    storage: {
      from: () => ({
        upload: async () => {
          uploads++;
          return { error: null };
        },
      }),
    },
    rpc: async () => {
      finalizations++;
      return finalizations === 1
        ? { error: { message: "Network response lost" } }
        : { error: null };
    },
  } as unknown as SupabaseClient;
  const file = {
      id: "file",
      assignmentId: "assignment",
      ownerId: "student",
      scope: "answer" as const,
      name: "answer.pdf",
      mime: "application/pdf",
      sizeBytes: 4,
      objectPath: "student/file",
      state: "pending" as const,
    },
    pending = {
      file,
      input: {
        bytes: new ArrayBuffer(4),
        mimeType: "application/pdf",
        originalName: "answer.pdf",
      },
    };
  await assert.rejects(
    sendHomeworkFile(c, pending, () => {}),
    HomeworkUploadError,
  );
  assert.equal(
    (await sendHomeworkFile(c, pending, () => {}, true)).state,
    "ready",
  );
  assert.equal(uploads, 1);
  let requests = 0;
  await assert.rejects(
    sendHomeworkFile(
      c,
      pending,
      () => {
        requests++;
        throw new Error("Akkaunt o‘zgardi.");
      },
      true,
    ),
  );
  assert.equal(requests, 1);
  assert.equal(finalizations, 2);
});
