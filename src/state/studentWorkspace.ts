import type { Marketplace } from "./domain";
import { localDate } from "./domain";
import type { ClassroomSnapshot } from "./classroom";
import { diagnostics } from "../data/learning";
import { validInvitation } from "./assessments";
import { groupPaymentRows, paymentMonth } from "./payments";
import type { LearningState } from "./learning";
export function studentWorkspace(
  market: Marketplace,
  studentId: string,
  classroom: ClassroomSnapshot,
  now = new Date(),
) {
  const memberships = market.enrollments.filter(
    (e) => e.studentId === studentId && e.active,
  );
  const ids = new Set(memberships.map((e) => e.offeringId));
  const groups = market.offerings.filter((g) => ids.has(g.id));
  const sessions = market.sessions
    .filter((s) => ids.has(s.offeringId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = sessions.filter(
    (s) =>
      Date.parse(s.startsAt) <= now.getTime() &&
      memberships.some(
        (e) =>
          e.offeringId === s.offeringId &&
          Date.parse(e.createdAt) <= Date.parse(s.startsAt),
      ),
  );
  const records = past.flatMap((s) =>
    market.attendance
      .filter((a) => a.sessionId === s.id && a.studentId === studentId)
      .map((a) => ({ ...a, session: s })),
  );
  const tests = classroom.tests.filter(
    (t) => t.status === "published" && ids.has(t.offeringId),
  );
  const attempts = classroom.attempts.filter(
    (a) => a.studentId === studentId && tests.some((t) => t.id === a.testId),
  );
  const invitations = market.messages.flatMap((message) => {
    const invite = validInvitation(market, message);
    return invite?.studentId === studentId ? [{ message, invite }] : [];
  });
  const payments = groups.flatMap((group) =>
    groupPaymentRows(market, group.id, paymentMonth(now))
      .filter((r) => r.enrollment.studentId === studentId)
      .map((r) => ({ ...r, group })),
  );
  return {
    groups,
    memberships,
    sessions,
    next: sessions.find((s) => Date.parse(s.endsAt) >= now.getTime()),
    today: sessions.filter(
      (s) => localDate(new Date(s.startsAt)) === localDate(now),
    ),
    past,
    records,
    present: records.filter((a) => a.status === "present").length,
    attendancePercent: records.length
      ? Math.round(
          (records.filter((a) => a.status === "present").length * 100) /
            records.length,
        )
      : null,
    tests,
    attempts,
    invitations,
    pendingTests: tests.filter(
      (t) => !attempts.some((a) => a.testId === t.id && a.completedAt),
    ),
    payments,
    due: payments.filter((r) => !r.paid).reduce((sum, r) => sum + r.amount, 0),
    groupsUnread: classroom.groups
      .filter((g) => ids.has(g.id))
      .reduce((sum, g) => sum + g.unread, 0),
  };
}
export function studentResults(
  studentId: string,
  classroom: ClassroomSnapshot,
  attempts: {
    testId: string;
    answers: number[];
    completedAt: string;
    id: string;
  }[],
) {
  const legacy = attempts.flatMap((attempt) => {
    const test = diagnostics.find((d) => d.id === attempt.testId);
    if (!test) return [];
    const correct = test.questions.filter(
      (q, i) => q.correct === attempt.answers[i],
    ).length;
    return [
      {
        comparisonKey: "diagnostic:" + test.id,
        method: "Mustaqil diagnostika",
        score: correct,
        maxScore: test.questions.length,
        id: attempt.id,
        title: test.title,
        subject: test.subject,
        correct,
        total: test.questions.length,
        percentage: Math.round((correct * 100) / test.questions.length),
        date: attempt.completedAt,
      },
    ];
  });
  const mock = classroom.attempts
    .filter((a) => a.studentId === studentId && a.completedAt)
    .flatMap((a) => {
      const test = classroom.tests.find((t) => t.id === a.testId);
      return test
        ? [
            {
              comparisonKey: "mock:" + test.id + ":" + test.scoring,
              method:
                test.scoring === "dtm" ? "DTM vaznli ball" : "Guruh testi",
              score: a.score ?? a.correctCount ?? 0,
              maxScore: a.maxScore ?? test.questionCount,
              id: a.id,
              title: test.title,
              subject: test.subject,
              correct: a.correctCount || 0,
              total: test.questionCount,
              percentage: a.percentage || 0,
              date: a.completedAt!,
            },
          ]
        : [];
    });
  return [...legacy, ...mock].sort((a, b) => b.date.localeCompare(a.date));
}

// Compare repetitions of the same test and grading method, never unrelated tests.
export function comparableGrowth(results: ReturnType<typeof studentResults>) {
  const current = results[0];
  if (!current) return null;
  const previous = results
    .slice(1)
    .find((r) => r.comparisonKey === current.comparisonKey);
  return previous
    ? { current, previous, delta: current.percentage - previous.percentage }
    : null;
}
