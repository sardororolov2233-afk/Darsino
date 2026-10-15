import {
  clubs,
  diagnostics,
  openLessons,
  SKILLS,
  type Skill,
} from "../data/learning";
import { localDate } from "./domain";
export type QuizAttempt = {
  id: string;
  testId: string;
  answers: number[];
  completedAt: string;
};
export type LearningState = {
  version: 1;
  attempts: QuizAttempt[];
  completedLessons: Record<string, string>;
  followedClubs: string[];
  recentSearches: string[];
};
export const emptyLearning = (): LearningState => ({
  version: 1,
  attempts: [],
  completedLessons: {},
  followedClubs: [],
  recentSearches: [],
});
export function readLearning(raw: string | null): LearningState {
  if (!raw) return emptyLearning();
  const value = JSON.parse(raw) as LearningState;
  if (
    value.version !== 1 ||
    !Array.isArray(value.attempts) ||
    !value.completedLessons ||
    !Array.isArray(value.followedClubs) ||
    !Array.isArray(value.recentSearches)
  )
    throw new Error("O‘quv progressi formati noto‘g‘ri.");
  const attempts = retainAttempts(
    value.attempts.filter((a) => {
      const test = diagnostics.find((t) => t.id === a?.testId);
      return (
        test &&
        typeof a.id === "string" &&
        typeof a.completedAt === "string" &&
        Number.isFinite(Date.parse(a.completedAt)) &&
        Array.isArray(a.answers) &&
        a.answers.length === test.questions.length &&
        a.answers.every(
          (v, i) =>
            Number.isInteger(v) &&
            v >= 0 &&
            v < test.questions[i].options.length,
        )
      );
    }),
  );
  return {
    version: 1,
    attempts,
    completedLessons: Object.fromEntries(
      Object.entries(value.completedLessons).filter(
        ([id, date]) =>
          openLessons.some((l) => l.id === id) &&
          typeof date === "string" &&
          Number.isFinite(Date.parse(date)),
      ),
    ),
    followedClubs: [
      ...new Set(
        value.followedClubs.filter((id) => clubs.some((c) => c.id === id)),
      ),
    ],
    recentSearches: value.recentSearches
      .filter((q) => typeof q === "string" && q.trim())
      .slice(0, 6)
      .map((q) => q.slice(0, 100)),
  };
}
export function scoreAttempt(attempt: QuizAttempt) {
  const test = diagnostics.find((t) => t.id === attempt.testId);
  return test
    ? test.questions.filter((q, i) => attempt.answers[i] === q.correct).length
    : 0;
}
// Keep recent history and each test's best result so earned XP never expires.
export function retainAttempts(attempts: QuizAttempt[]) {
  const best = new Map<string, QuizAttempt>();
  attempts.forEach((a) => {
    const previous = best.get(a.testId);
    if (!previous || scoreAttempt(a) >= scoreAttempt(previous))
      best.set(a.testId, a);
  });
  const keep = new Set(
    [...attempts.slice(-100), ...best.values()].map((a) => a.id),
  );
  return attempts.filter((a) => keep.has(a.id));
}
export function learningStats(
  state: LearningState,
  subject = "Umumiy",
  now = new Date(),
) {
  const latest = new Map<string, QuizAttempt>();
  state.attempts.forEach((a) => latest.set(a.testId, a));
  const skills = Object.fromEntries(
    SKILLS.map((s) => [s, { correct: 0, total: 0 }]),
  ) as Record<Skill, { correct: number; total: number }>;
  let correct = 0,
    total = 0;
  for (const [id, attempt] of latest) {
    const test = diagnostics.find((t) => t.id === id)!;
    if (subject !== "Umumiy" && test.subject !== subject) continue;
    test.questions.forEach((q, i) => {
      const hit = attempt.answers[i] === q.correct;
      skills[q.skill].total++;
      total++;
      if (hit) {
        skills[q.skill].correct++;
        correct++;
      }
    });
  }
  const best = new Map<string, number>();
  state.attempts.forEach((a) =>
    best.set(a.testId, Math.max(best.get(a.testId) || 0, scoreAttempt(a) * 20)),
  );
  const xp =
    [...best.values()].reduce((a, b) => a + b, 0) +
    Object.keys(state.completedLessons).length * 50;
  const activityDates = [
    ...state.attempts.map((a) => a.completedAt),
    ...Object.values(state.completedLessons),
  ];
  const days = new Set(activityDates.map((d) => localDate(new Date(d))));
  const today = localDate(now);
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00+05:00`);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(localDate(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const todayActivities = new Set([
    ...state.attempts
      .filter((a) => localDate(new Date(a.completedAt)) === today)
      .map((a) => `test:${a.testId}`),
    ...Object.entries(state.completedLessons)
      .filter(([, d]) => localDate(new Date(d)) === today)
      .map(([id]) => `lesson:${id}`),
  ]).size;
  return {
    correct,
    total,
    score: total ? Math.round((correct / total) * 100) : null,
    skills,
    xp,
    streak,
    todayActivities,
    level: Math.floor(xp / 200) + 1,
    completedTests: latest.size,
  };
}
export function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ`']/g, "")
    .replace(/[#_]/g, " ")
    .trim();
}
export function matchesSearch(text: string, query: string) {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
