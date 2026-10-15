import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyLearning,
  readLearning,
  learningStats,
  matchesSearch,
  type QuizAttempt,
} from "../src/state/learning";

test("radar starts unmeasured and latest attempts update skills without farming XP", () => {
  const state = emptyLearning();
  assert.equal(learningStats(state).score, null);
  const first: QuizAttempt = {
    id: "first",
    testId: "math-basics",
    answers: [1, 2, 1, 1, 1],
    completedAt: "2026-10-15T18:00:00+05:00",
  };
  state.attempts = [first];
  assert.equal(learningStats(state).score, 100);
  assert.equal(learningStats(state).xp, 100);
  state.attempts.push({ ...first, id: "retry", answers: [0, 0, 0, 0, 0] });
  const stats = learningStats(state);
  assert.equal(stats.score, 0);
  assert.equal(stats.xp, 100);
  assert.equal(stats.completedTests, 1);
  assert.equal(learningStats(state, "Ingliz tili").score, null);
});
test("activity goals count distinct activities and streaks use Tashkent dates", () => {
  const state = emptyLearning();
  state.completedLessons = { logarithms: "2026-10-14T20:10:00Z" };
  state.attempts = [
    {
      id: "a",
      testId: "math-basics",
      answers: [1, 2, 1, 1, 1],
      completedAt: "2026-10-14T19:10:00Z",
    },
    {
      id: "b",
      testId: "math-basics",
      answers: [1, 2, 1, 1, 1],
      completedAt: "2026-10-15T06:00:00Z",
    },
  ];
  const stats = learningStats(
    state,
    "Umumiy",
    new Date("2026-10-15T12:00:00Z"),
  );
  assert.equal(stats.todayActivities, 2);
  assert.equal(stats.streak, 1);
  assert.equal(stats.xp, 150);
  assert.equal(
    learningStats(state, "Umumiy", new Date("2026-10-16T12:00:00Z")).streak,
    1,
  );
  assert.equal(
    learningStats(state, "Umumiy", new Date("2026-10-17T12:00:00Z")).streak,
    0,
  );
});
test("invalid persisted attempts cannot inflate score and unknown catalogue entries are discarded", () => {
  const state = emptyLearning();
  state.attempts = [
    {
      id: "bad",
      testId: "math-basics",
      answers: [900],
      completedAt: "bad-date",
    },
  ];
  state.completedLessons = { unknown: "2026-10-15T00:00:00Z" };
  state.followedClubs = ["speaking", "unknown", "speaking"];
  const parsed = readLearning(JSON.stringify(state));
  assert.deepEqual(parsed.attempts, []);
  assert.deepEqual(parsed.completedLessons, {});
  assert.deepEqual(parsed.followedClubs, ["speaking"]);
  assert.throws(() => readLearning("{}"));
});
test("search handles multiple words, hashtags and Uzbek apostrophe variants", () => {
  assert.equal(
    matchesSearch(
      "Akmal Matematika Abituriyent Chilonzor",
      "matematika chilonzor",
    ),
    true,
  );
  assert.equal(matchesSearch("O‘qish va IELTS", "o'qish"), true);
  assert.equal(matchesSearch("Python va AI", "#Python_AI"), true);
  assert.equal(
    matchesSearch("Matematika Yunusobod", "matematika chilonzor"),
    false,
  );
});

test("earned XP survives pruning of more than 100 later attempts", () => {
  const state = emptyLearning();
  state.attempts = [
    {
      id: "best-ever",
      testId: "math-basics",
      answers: [1, 2, 1, 1, 1],
      completedAt: "2026-10-01T12:00:00Z",
    },
    ...Array.from({ length: 105 }, (_, i) => ({
      id: `retry-${i}`,
      testId: "math-basics",
      answers: [0, 0, 0, 0, 0],
      completedAt: "2026-10-15T12:00:00Z",
    })),
  ];
  const parsed = readLearning(JSON.stringify(state));
  assert.equal(learningStats(parsed).score, 0);
  assert.equal(learningStats(parsed).xp, 100);
  assert.equal(parsed.attempts.length, 101);
});
