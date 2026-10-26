import { localDate, toLessonTime, type Marketplace } from "./domain";
import { groupPaymentRows } from "./payments";
import { teacherOverview } from "./teacher";
import { sharedResults } from "./assessments";
import { diagnostics } from "../data/learning";
import type { ClassroomSnapshot } from "./classroom";

export const WEEKDAYS = [
  { day: 1, short: "Du", label: "Dushanba" },
  { day: 2, short: "Se", label: "Seshanba" },
  { day: 3, short: "Chor", label: "Chorshanba" },
  { day: 4, short: "Pay", label: "Payshanba" },
  { day: 5, short: "Ju", label: "Juma" },
  { day: 6, short: "Sha", label: "Shanba" },
  { day: 0, short: "Yak", label: "Yakshanba" },
] as const;

export function shiftDay(day: string, amount: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Sanani tekshiring.");
  const date = new Date(`${day}T12:00:00+05:00`);
  if (!Number.isFinite(date.getTime()) || localDate(date) !== day)
    throw new Error("Sanani tekshiring.");
  return localDate(new Date(date.getTime() + amount * 86400000));
}
export const weekdayOf = (date: string) =>
  new Date(`${date}T12:00:00+05:00`).getUTCDay();

export function planWeeklyLessons(input: {
  firstDate: string;
  days: number[];
  times: Record<number, string>;
  count: number;
  minutes: number;
}) {
  shiftDay(input.firstDate, 0);
  const days = [...new Set(input.days)];
  if (
    !days.length ||
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    throw new Error("Kamida bitta dars kunini tanlang.");
  if (
    !Number.isInteger(input.count) ||
    input.count < 1 ||
    input.count > 50 ||
    !Number.isInteger(input.minutes) ||
    input.minutes < 15 ||
    input.minutes > 240
  )
    throw new Error("Darslar soni 1–50, davomiylik 15–240 daqiqa bo‘lsin.");
  const sessions: { startsAt: string; endsAt: string }[] = [];
  for (
    let offset = 0;
    sessions.length < input.count && offset < 366;
    offset++
  ) {
    const date = shiftDay(input.firstDate, offset),
      day = weekdayOf(date);
    if (days.includes(day))
      sessions.push(toLessonTime(date, input.times[day] || "", input.minutes));
  }
  if (sessions.length !== input.count)
    throw new Error("Dars jadvalini tekshiring.");
  return sessions;
}

export function dailyAttendance(
  market: Marketplace,
  tutorId: string,
  day: string,
) {
  const { sessions, enrollments } = teacherOverview(market, tutorId);
  const today = sessions.filter((s) => localDate(new Date(s.startsAt)) === day);
  const expected = today.flatMap((s) =>
    enrollments
      .filter(
        (e) =>
          e.offeringId === s.offeringId &&
          Date.parse(e.createdAt) <= Date.parse(s.startsAt),
      )
      .map((e) => ({ sessionId: s.id, studentId: e.studentId })),
  );
  const recorded = expected.flatMap((pair) =>
    market.attendance.filter(
      (a) => a.sessionId === pair.sessionId && a.studentId === pair.studentId,
    ),
  );
  return {
    sessions: today,
    expected: expected.length,
    marked: recorded.length,
    present: recorded.filter((a) => a.status === "present").length,
  };
}

export function teacherDebtors(
  market: Marketplace,
  tutorId: string,
  month: string,
  groupId = "all",
) {
  const rows = market.offerings
    .filter(
      (g) => g.tutorId === tutorId && (groupId === "all" || g.id === groupId),
    )
    .flatMap((group) =>
      groupPaymentRows(market, group.id, month)
        .filter((r) => !r.paid && r.amount > 0)
        .map((row) => ({ ...row, group })),
    );
  const people = new Map<
    string,
    { studentId: string; name: string; total: number; groups: typeof rows }
  >();
  for (const row of rows) {
    const prior = people.get(row.enrollment.studentId) || {
      studentId: row.enrollment.studentId,
      name: row.name,
      total: 0,
      groups: [],
    };
    prior.total += row.amount;
    prior.groups.push(row);
    people.set(prior.studentId, prior);
  }
  return [...people.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
}

export function teacherStudentProgress(
  market: Marketplace,
  tutorId: string,
  classroom: ClassroomSnapshot,
  groupId = "all",
  now = new Date(),
) {
  const overview = teacherOverview(market, tutorId, groupId);
  const legacy = sharedResults(market, tutorId, groupId);
  return [...overview.studentIds].map((studentId) => {
    const student = market.users.find((u) => u.id === studentId);
    const enrollments = overview.enrollments.filter(
      (e) => e.studentId === studentId,
    );
    const groups = overview.classes.filter((g) =>
      enrollments.some((e) => e.offeringId === g.id),
    );
    const sessions = overview.sessions.filter(
      (s) =>
        Date.parse(s.startsAt) <= now.getTime() &&
        enrollments.some(
          (e) =>
            e.offeringId === s.offeringId &&
            Date.parse(e.createdAt) <= Date.parse(s.startsAt),
        ),
    );
    const attendance = sessions.flatMap((s) =>
      market.attendance.filter(
        (a) => a.sessionId === s.id && a.studentId === studentId,
      ),
    );
    const results = legacy
      .filter((r) => r.studentId === studentId)
      .map((r) => {
        const test = diagnostics.find((t) => t.id === r.testId)!;
        const correct = test.questions.filter(
          (q, i) => q.correct === r.answers[i],
        ).length;
        return {
          id: r.messageId,
          title: test.title,
          correct,
          questions: test.questions.length,
          percentage: Math.round((correct * 100) / test.questions.length),
          date: "",
        };
      });
    for (const attempt of classroom.attempts.filter(
      (a) => a.studentId === studentId && a.completedAt,
    )) {
      const test = classroom.tests.find(
        (t) =>
          t.id === attempt.testId && groups.some((g) => g.id === t.offeringId),
      );
      if (test)
        results.push({
          id: attempt.id,
          title: test.title,
          correct: attempt.correctCount || 0,
          questions: test.questionCount,
          percentage: attempt.percentage || 0,
          date: attempt.completedAt!,
        });
    }
    const present = attendance.filter((a) => a.status === "present").length;
    return {
      studentId,
      name: student?.name || "Ism kiritilmagan",
      student,
      groups,
      results,
      score: results.length
        ? Math.round(
            (results.reduce((n, r) => n + r.percentage, 0) / results.length) *
              10,
          ) / 10
        : null,
      correct: results.reduce((n, r) => n + r.correct, 0),
      total: results.reduce((n, r) => n + r.questions, 0),
      present,
      expected: sessions.length,
      marked: attendance.length,
      attendancePercent: sessions.length
        ? Math.round((present * 100) / sessions.length)
        : null,
    };
  });
}
