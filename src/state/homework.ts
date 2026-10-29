import type { Marketplace } from "./domain";
import { canAccessClass } from "./classroom";
export type Assignment = {
  id: string;
  offeringId: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  dueAt: string;
  status: "draft" | "published" | "archived";
  recipientIds: string[];
  fileIds: string[];
  revision: number;
  createdAt: string;
  publishedAt: string | null;
};
export type AssignmentDraft = Omit<
  Assignment,
  "teacherId" | "createdAt" | "publishedAt"
>;
export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  version: number;
  content: string;
  fileIds: string[];
  status: "submitted" | "accepted" | "changes_requested";
  feedback: string;
  submittedAt: string;
  reviewedAt: string | null;
};
export type HomeworkFile = {
  id: string;
  assignmentId: string;
  ownerId: string;
  scope: "task" | "answer";
  name: string;
  mime: string;
  sizeBytes: number;
  objectPath: string;
  state: "pending" | "ready" | "deleting" | "deleted";
  demoUri?: string;
};
export type HomeworkEvent = {
  id: string;
  assignmentId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};
export type HomeworkSnapshot = {
  assignments: Assignment[];
  submissions: Submission[];
  files: HomeworkFile[];
  events: HomeworkEvent[];
};
export type HomeworkStore = Omit<HomeworkSnapshot, "events"> & {
  events: (HomeworkEvent & { userId: string; eventKey: string })[];
};
export const emptyHomework = (): HomeworkStore => ({
  assignments: [],
  submissions: [],
  files: [],
  events: [],
});
export const HOMEWORK_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const HOMEWORK_LIMIT = 10 * 1024 * 1024;
export function readHomework(raw: string | null): HomeworkStore {
  if (!raw) return emptyHomework();
  const value = JSON.parse(raw);
  if (
    !["assignments", "submissions", "files", "events"].every((k) =>
      Array.isArray(value[k]),
    )
  )
    throw new Error("Vazifalar formati noto‘g‘ri.");
  return value;
}
export function normalizeAssignment(input: AssignmentDraft): AssignmentDraft {
  const value = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    recipientIds: [...new Set(input.recipientIds)].sort(),
    fileIds: [...new Set(input.fileIds)].sort(),
  };
  if (
    value.title.length < 3 ||
    value.title.length > 150 ||
    value.description.length > 10000 ||
    !Number.isFinite(Date.parse(value.dueAt)) ||
    !["draft", "published"].includes(value.status) ||
    value.recipientIds.length > 100 ||
    value.fileIds.length > 5
  )
    throw new Error("Vazifa nomi, muddat va fayllarni tekshiring.");
  return value;
}
export const ownsAssignments = (m: Marketplace, me: string, group: string) =>
  m.offerings.some((g) => g.id === group && g.tutorId === me) &&
  m.tutorProfiles.some((t) => t.userId === me && t.verification === "approved");
export function assignmentAccess(m: Marketplace, me: string, a: Assignment) {
  return (
    canAccessClass(m, me, a.offeringId) &&
    (a.teacherId === me ||
      (a.status !== "draft" &&
        (!a.recipientIds.length || a.recipientIds.includes(me))))
  );
}
export function latestSubmission(
  rows: Submission[],
  id: string,
  student: string,
) {
  return rows
    .filter((s) => s.assignmentId === id && s.studentId === student)
    .sort((a, b) => b.version - a.version)[0];
}
export function assignmentStatus(a: Assignment, s?: Submission) {
  return a.status === "draft"
    ? "Qoralama"
    : a.status === "archived"
      ? "Yopilgan"
      : s?.status === "accepted"
        ? "Qabul qilindi"
        : s?.status === "changes_requested"
          ? "Qayta ishlash"
          : s
            ? "Tekshiruvda"
            : "Bajarish kerak";
}
export function homeworkSnapshot(
  store: HomeworkStore,
  m: Marketplace,
  me: string,
): HomeworkSnapshot {
  const assignments = store.assignments.filter((a) =>
    assignmentAccess(m, me, a),
  );
  const ids = new Set(assignments.map((a) => a.id));
  const submissions = store.submissions.filter(
    (s) =>
      ids.has(s.assignmentId) &&
      (s.studentId === me ||
        assignments.some((a) => a.id === s.assignmentId && a.teacherId === me)),
  );
  const linked = new Set([
    ...assignments.flatMap((a) => a.fileIds),
    ...submissions.flatMap((s) => s.fileIds),
  ]);
  return {
    assignments: assignments.map((a) =>
      a.teacherId === me ? a : { ...a, recipientIds: [] },
    ),
    submissions,
    files: store.files.filter(
      (f) =>
        (f.ownerId === me && f.state !== "deleted") ||
        (f.state === "ready" && ids.has(f.assignmentId) && linked.has(f.id)),
    ),
    events: store.events
      .filter((e) => e.userId === me)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100),
  };
}
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
function event(
  store: HomeworkStore,
  userId: string,
  eventKey: string,
  a: Assignment,
  title: string,
) {
  if (!store.events.some((e) => e.userId === userId && e.eventKey === eventKey))
    store.events.unshift({
      id: eventKey + ":" + userId,
      userId,
      eventKey,
      assignmentId: a.id,
      title,
      body: a.title,
      read: false,
      createdAt: new Date().toISOString(),
    });
}
export function saveAssignment(
  store: HomeworkStore,
  m: Marketplace,
  me: string,
  input: AssignmentDraft,
) {
  const d = normalizeAssignment(input),
    old = store.assignments.find((a) => a.id === d.id);
  assert(
    ownsAssignments(m, me, d.offeringId),
    "O‘z guruhingiz va tasdiqlangan ustoz profili kerak.",
  );
  assert(
    m.offerings.some((g) => g.id === d.offeringId && g.subject === d.subject),
    "Guruh fanini tanlang.",
  );
  assert(
    d.recipientIds.every((id) =>
      m.enrollments.some(
        (e) => e.offeringId === d.offeringId && e.studentId === id && e.active,
      ),
    ),
    "Faqat guruhingizdagi o‘quvchini tanlang.",
  );
  if (old) {
    assert(
      old.teacherId === me && old.offeringId === d.offeringId,
      "Boshqa ustoz vazifasiga ruxsat yo‘q.",
    );
    if (
      Object.keys(d)
        .filter((k) => k !== "revision")
        .every(
          (k) =>
            JSON.stringify(old[k as keyof Assignment]) ===
            JSON.stringify(d[k as keyof AssignmentDraft]),
        )
    )
      return old.id;
    assert(
      old.status === "draft" && old.revision === d.revision,
      "Vazifa o‘zgargan yoki allaqachon e’lon qilingan. Yangilang.",
    );
  }
  assert(
    d.fileIds.every((id) =>
      store.files.some(
        (f) =>
          f.id === id &&
          f.assignmentId === d.id &&
          f.ownerId === me &&
          f.scope === "task" &&
          f.state === "ready",
      ),
    ),
    "Vazifaga tegishli tayyor fayllarni tanlang.",
  );
  if (d.status === "published")
    assert(Date.parse(d.dueAt) > Date.now(), "Muddat kelajakda bo‘lsin.");
  const a: Assignment = {
    ...d,
    teacherId: me,
    revision: (old?.revision || 0) + 1,
    createdAt: old?.createdAt || new Date().toISOString(),
    publishedAt: d.status === "published" ? new Date().toISOString() : null,
  };
  store.assignments = store.assignments.filter((v) => v.id !== a.id);
  store.assignments.unshift(a);
  if (a.status === "published")
    m.enrollments
      .filter(
        (e) =>
          e.offeringId === a.offeringId &&
          e.active &&
          (!a.recipientIds.length || a.recipientIds.includes(e.studentId)),
      )
      .forEach((e) =>
        event(store, e.studentId, "published:" + a.id, a, "Yangi uy vazifasi"),
      );
  return a.id;
}
export function submitAssignment(
  store: HomeworkStore,
  m: Marketplace,
  me: string,
  id: string,
  assignmentId: string,
  content: string,
  fileIds: string[],
) {
  const a = store.assignments.find((a) => a.id === assignmentId);
  assert(a && assignmentAccess(m, me, a), "Bu vazifaga ruxsat yo‘q.");
  assert(
    a!.teacherId !== me &&
      m.users.some((u) => u.id === me && u.role === "student"),
    "Faqat o‘quvchi javob topshiradi.",
  );
  const clean = content.trim(),
    files = [...new Set(fileIds)].sort(),
    old = store.submissions.find((s) => s.id === id);
  assert(
    clean.length <= 10000 &&
      (clean.length || files.length) &&
      files.length <= 5,
    "Javob yozing yoki 5 tagacha fayl biriktiring.",
  );
  if (old) {
    assert(
      old.studentId === me &&
        old.assignmentId === assignmentId &&
        old.content === clean &&
        JSON.stringify(old.fileIds) === JSON.stringify(files),
      "Javob kaliti boshqa amal uchun ishlatilgan.",
    );
    return id;
  }
  assert(a!.status === "published", "Vazifa topshirish uchun ochiq emas.");
  assert(
    files.every((id) =>
      store.files.some(
        (f) =>
          f.id === id &&
          f.assignmentId === assignmentId &&
          f.ownerId === me &&
          f.scope === "answer" &&
          f.state === "ready",
      ),
    ),
    "Faqat o‘z javob fayllaringizni biriktiring.",
  );
  const prior = latestSubmission(store.submissions, assignmentId, me);
  assert(
    !prior || prior.status === "changes_requested",
    "Javob tekshiruvda yoki qabul qilingan.",
  );
  store.submissions.unshift({
    id,
    assignmentId,
    studentId: me,
    version: (prior?.version || 0) + 1,
    content: clean,
    fileIds: files,
    status: "submitted",
    feedback: "",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  });
  event(store, a!.teacherId, "submitted:" + id, a!, "Uy vazifasi topshirildi");
  return id;
}
export function reviewAssignment(
  store: HomeworkStore,
  m: Marketplace,
  me: string,
  id: string,
  status: "accepted" | "changes_requested",
  feedback: string,
) {
  const s = store.submissions.find((s) => s.id === id),
    a = store.assignments.find((a) => a.id === s?.assignmentId);
  assert(
    a && a.teacherId === me && ownsAssignments(m, me, a.offeringId),
    "Faqat guruh ustozi javobni tekshiradi.",
  );
  const note = feedback.trim();
  assert(
    note.length <= 5000 && (status !== "changes_requested" || note.length),
    "Qayta ishlash uchun izoh yozing.",
  );
  if (s!.status === status && s!.feedback === note) return;
  assert(s!.status === "submitted", "Bu javob allaqachon tekshirilgan.");
  s!.status = status;
  s!.feedback = note;
  s!.reviewedAt = new Date().toISOString();
  event(
    store,
    s!.studentId,
    "reviewed:" + id,
    a!,
    status === "accepted"
      ? "Vazifangiz qabul qilindi"
      : "Vazifani qayta ishlang",
  );
}
