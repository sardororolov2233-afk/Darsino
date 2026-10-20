import { diagnostics, SKILLS, type Skill } from "../data/learning";
import { dmId, type Marketplace, type Message } from "./domain";
const PREFIX = "OQI_DIAGNOSTIC_V1:";
export type TestInvitation = {
  kind: "invite";
  id: string;
  tutorId: string;
  studentId: string;
  offeringId: string;
  testId: string;
  title: string;
};
export type SharedTestResult = {
  kind: "result";
  invitationId: string;
  answers: number[];
};
export type AssessmentPayload = TestInvitation | SharedTestResult;
export const encodeAssessment = (payload: AssessmentPayload) =>
  PREFIX + JSON.stringify(payload);
export function parseAssessment(text: string): AssessmentPayload | null {
  if (!text.startsWith(PREFIX) || text.length > 2000) return null;
  try {
    const p = JSON.parse(text.slice(PREFIX.length)) as AssessmentPayload;
    const id = (v: unknown) =>
      typeof v === "string" && v.length > 0 && v.length <= 180;
    if (
      p.kind === "invite" &&
      [p.id, p.tutorId, p.studentId, p.offeringId, p.testId, p.title].every(
        id,
      ) &&
      diagnostics.some((t) => t.id === p.testId)
    )
      return p;
    if (
      p.kind === "result" &&
      id(p.invitationId) &&
      Array.isArray(p.answers) &&
      p.answers.length <= 30 &&
      p.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 10)
    )
      return p;
  } catch {}
  return null;
}
export function validInvitation(market: Marketplace, message: Message) {
  const p = parseAssessment(message.text);
  if (
    !p ||
    p.kind !== "invite" ||
    p.tutorId !== message.senderId ||
    message.conversationId !== dmId(p.studentId, p.tutorId)
  )
    return null;
  const group = market.offerings.find(
    (g) => g.id === p.offeringId && g.tutorId === p.tutorId,
  );
  if (
    !group ||
    !market.tutorProfiles.some(
      (profile) =>
        profile.userId === p.tutorId && profile.verification === "approved",
    ) ||
    !market.enrollments.some(
      (e) =>
        e.offeringId === group.id && e.studentId === p.studentId && e.active,
    )
  )
    return null;
  return p;
}
export function sharedResults(
  market: Marketplace,
  tutorId: string,
  offeringId = "all",
) {
  const invitations = new Map<
    string,
    { payload: TestInvitation; message: Message }
  >();
  market.messages.forEach((m) => {
    const p = validInvitation(market, m);
    if (
      p &&
      p.tutorId === tutorId &&
      (offeringId === "all" || p.offeringId === offeringId)
    )
      invitations.set(p.id, { payload: p, message: m });
  });
  const latest = new Map<
    string,
    {
      studentId: string;
      offeringId: string;
      testId: string;
      answers: number[];
      messageId: string;
    }
  >();
  market.messages.forEach((m) => {
    const p = parseAssessment(m.text);
    if (!p || p.kind !== "result") return;
    const invite = invitations.get(p.invitationId)?.payload;
    if (
      !invite ||
      m.senderId !== invite.studentId ||
      m.conversationId !== dmId(invite.studentId, tutorId)
    )
      return;
    const test = diagnostics.find((t) => t.id === invite.testId)!;
    if (
      p.answers.length !== test.questions.length ||
      p.answers.some((a, i) => a >= test.questions[i].options.length)
    )
      return;
    latest.set(`${invite.studentId}:${invite.testId}:${invite.offeringId}`, {
      studentId: invite.studentId,
      offeringId: invite.offeringId,
      testId: invite.testId,
      answers: p.answers,
      messageId: m.id,
    });
  });
  return [...latest.values()];
}
export function assessmentSummary(
  market: Marketplace,
  tutorId: string,
  offeringId = "all",
) {
  const results = sharedResults(market, tutorId, offeringId);
  const skills = Object.fromEntries(
    SKILLS.map((s) => [s, { correct: 0, total: 0 }]),
  ) as Record<Skill, { correct: number; total: number }>;
  let correct = 0,
    total = 0;
  for (const r of results) {
    const test = diagnostics.find((t) => t.id === r.testId)!;
    test.questions.forEach((q, i) => {
      skills[q.skill].total++;
      total++;
      if (r.answers[i] === q.correct) {
        skills[q.skill].correct++;
        correct++;
      }
    });
  }
  return {
    skills,
    correct,
    total,
    score: total ? Math.round((correct / total) * 100) : null,
    results,
  };
}
export function assessmentLabel(text: string) {
  const p = parseAssessment(text);
  return p?.kind === "invite"
    ? `Test topshirig‘i: ${p.title}`
    : p?.kind === "result"
      ? "Diagnostika natijasi ulashildi"
      : text;
}
