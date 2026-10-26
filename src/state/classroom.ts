import { type Marketplace } from "./domain";

export type GroupMessage = {
  id: string;
  offeringId: string;
  senderId: string;
  senderName: string;
  text: string;
  announcement: boolean;
  createdAt: string;
};
export type GroupConversation = {
  id: string;
  title: string;
  subject: string;
  tutorId: string;
  memberCount: number;
  lastMessage: GroupMessage | null;
  announcement: GroupMessage | null;
  unread: number;
};
export type MockQuestion = { prompt: string; options: string[] };
export type MockDraft = {
  id: string;
  offeringId: string;
  title: string;
  subject: string;
  source: "file" | "manual" | "catalog";
  fileId: string | null;
  questionCount: number;
  minutes: number;
  difficulty: "easy" | "medium" | "advanced";
  scoring: "uniform" | "dtm";
  questions: MockQuestion[];
  answerKey: (number | null)[];
  status: "draft" | "published";
};
export type MockTest = Omit<MockDraft, "answerKey"> & {
  tutorId: string;
  answerKey?: (number | null)[];
  createdAt: string;
  updatedAt: string;
};
export type MockAttempt = {
  id: string;
  testId: string;
  studentId: string;
  startedAt: string;
  answers: (number | null)[] | null;
  correctCount: number | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  completedAt: string | null;
};
export type ClassroomSnapshot = {
  groups: GroupConversation[];
  tests: MockTest[];
  attempts: MockAttempt[];
};
export type DemoClassroom = {
  version: 1;
  messages: GroupMessage[];
  reads: Record<string, string>;
  tests: MockTest[];
  attempts: MockAttempt[];
};
export const emptyClassroom = (): ClassroomSnapshot => ({
  groups: [],
  tests: [],
  attempts: [],
});
export const emptyDemoClassroom = (): DemoClassroom => ({
  version: 1,
  messages: [],
  reads: {},
  tests: [],
  attempts: [],
});
export function readDemoClassroom(raw: string | null): DemoClassroom {
  if (!raw) return emptyDemoClassroom();
  const value = JSON.parse(raw) as DemoClassroom;
  if (
    value.version !== 1 ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.tests) ||
    !Array.isArray(value.attempts) ||
    !value.reads ||
    typeof value.reads !== "object"
  )
    throw new Error("Sinf ma’lumotlari formati noto‘g‘ri.");
  return value;
}
export function canAccessClass(
  market: Marketplace,
  actor: string,
  groupId: string,
) {
  const group = market.offerings.find((g) => g.id === groupId);
  if (!group) return false;
  if (group.tutorId === actor) return true;
  return (
    market.tutorProfiles.some(
      (p) => p.userId === group.tutorId && p.verification === "approved",
    ) &&
    !market.blocks?.some(
      (b) =>
        (b.userId === actor && b.peerId === group.tutorId) ||
        (b.peerId === actor && b.userId === group.tutorId),
    ) &&
    market.enrollments.some(
      (e) => e.offeringId === groupId && e.studentId === actor && e.active,
    )
  );
}
export function demoClassroomSnapshot(
  store: DemoClassroom,
  market: Marketplace,
  actor: string,
): ClassroomSnapshot {
  const groups = market.offerings
    .filter((g) => g.type === "group" && canAccessClass(market, actor, g.id))
    .map((g) => {
      const messages = store.messages.filter((m) => m.offeringId === g.id);
      const read = store.reads[`${actor}:${g.id}`] || "";
      return {
        id: g.id,
        title: g.title,
        subject: g.subject,
        tutorId: g.tutorId,
        memberCount: new Set(
          market.enrollments
            .filter((e) => e.offeringId === g.id && e.active)
            .map((e) => e.studentId),
        ).size,
        lastMessage: messages.at(-1) || null,
        announcement: messages.filter((m) => m.announcement).at(-1) || null,
        unread: messages.filter(
          (m) => m.senderId !== actor && m.createdAt > read,
        ).length,
      };
    });
  const tests = store.tests
    .filter(
      (t) =>
        t.tutorId === actor ||
        (t.status === "published" &&
          canAccessClass(market, actor, t.offeringId)),
    )
    .map((t) => {
      const { answerKey, ...publicTest } = t;
      return t.tutorId === actor ? t : publicTest;
    });
  const attempts = store.attempts.filter((a) =>
    store.tests.some(
      (t) =>
        t.id === a.testId &&
        (t.tutorId === actor ||
          (a.studentId === actor &&
            canAccessClass(market, actor, t.offeringId))),
    ),
  );
  return { groups, tests, attempts };
}
export function normalizeMockDraft(draft: MockDraft): MockDraft {
  if (draft.title.trim().length < 3 || draft.title.trim().length > 150)
    throw new Error("Test nomi 3–150 belgi bo‘lsin.");
  if (!draft.offeringId || !draft.subject)
    throw new Error("Guruh va fanni tanlang.");
  if (
    !Number.isInteger(draft.questionCount) ||
    draft.questionCount < 1 ||
    draft.questionCount > 50 ||
    !Number.isInteger(draft.minutes) ||
    draft.minutes < 5 ||
    draft.minutes > 240
  )
    throw new Error("Savollar soni 1–50, vaqt 5–240 daqiqa bo‘lsin.");
  if (draft.scoring === "dtm" && draft.questionCount !== 30)
    throw new Error("DTM ball tizimi 30 savol uchun.");
  if (
    draft.answerKey.length !== draft.questionCount ||
    draft.answerKey.some((a) =>
      a === null
        ? draft.status === "published"
        : !Number.isInteger(a) || a < 0 || a > 3,
    )
  )
    throw new Error("Har bir savolning javob kalitini belgilang.");
  if (draft.source === "file" && draft.status === "published" && !draft.fileId)
    throw new Error("Savollar faylini yuklang.");
  if (
    draft.source !== "file" &&
    (draft.questions.length !== draft.questionCount ||
      draft.questions.some(
        (q) =>
          !q.prompt.trim() ||
          q.prompt.length > 2000 ||
          q.options.length !== 4 ||
          q.options.some((s) => !s.trim() || s.length > 500),
      ))
  )
    throw new Error("Savol va to‘rtta javob variantini kiriting.");
  return {
    ...draft,
    title: draft.title.trim(),
    questions:
      draft.source === "file"
        ? []
        : draft.questions.map((q) => ({
            prompt: q.prompt.trim(),
            options: q.options.map((s) => s.trim()),
          })),
  };
}
export function gradeMock(test: MockTest, answers: (number | null)[]) {
  if (
    !test.answerKey ||
    answers.length !== test.questionCount ||
    answers.some((a) => a !== null && (!Number.isInteger(a) || a < 0 || a > 3))
  )
    throw new Error("Javoblar soni testga mos bo‘lsin.");
  let correctCount = 0,
    score = 0,
    maxScore = 0;
  answers.forEach((answer, i) => {
    const weight =
      test.scoring === "dtm" ? (i < 10 ? 1.1 : i < 20 ? 2.1 : 3.1) : 1;
    maxScore += weight;
    if (answer !== null && answer === test.answerKey![i]) {
      correctCount++;
      score += weight;
    }
  });
  return {
    correctCount,
    score: Math.round(score * 10) / 10,
    maxScore: Math.round(maxScore * 10) / 10,
    percentage: Math.round((score * 100) / maxScore),
  };
}
