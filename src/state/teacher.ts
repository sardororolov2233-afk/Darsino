import { type Marketplace, toLessonTime } from "./domain";
import { rooms } from "../data/catalog";
export const CLUB_MARKER = "O‘qi klubi";
export const isClubOffering = (offering: { benefits: string[] }) =>
  offering.benefits.includes(CLUB_MARKER);
export function teacherOverview(
  market: Marketplace,
  tutorId: string,
  offeringId = "all",
) {
  const classes = market.offerings.filter(
    (g) =>
      g.tutorId === tutorId && (offeringId === "all" || g.id === offeringId),
  );
  const ids = new Set(classes.map((g) => g.id));
  const enrollments = market.enrollments.filter(
    (e) => e.active && ids.has(e.offeringId),
  );
  const studentIds = new Set(enrollments.map((e) => e.studentId));
  const sessions = market.sessions.filter((s) => ids.has(s.offeringId));
  const started = new Set(
    sessions
      .filter((s) => Date.parse(s.startsAt) <= Date.now())
      .map((s) => s.id),
  );
  const attendance = market.attendance.filter(
    (a) =>
      started.has(a.sessionId) &&
      enrollments.some(
        (e) =>
          e.studentId === a.studentId &&
          market.sessions.some(
            (s) => s.id === a.sessionId && s.offeringId === e.offeringId,
          ),
      ),
  );
  return {
    classes,
    enrollments,
    studentIds,
    sessions,
    attendance,
    present: attendance.filter((a) => a.status === "present").length,
    pending: market.applications.filter(
      (a) => a.tutorId === tutorId && a.status === "pending",
    ).length,
    reserved: classes.reduce((n, c) => n + c.reservedSeats, 0),
  };
}
export type RoomPlan = {
  id: string;
  roomId: string;
  offeringId: string;
  startsAt: string;
  endsAt: string;
  estimatedCost: number;
};
export type TeacherWorkspace = { version: 1; roomPlans: RoomPlan[] };
export const emptyTeacherWorkspace = (): TeacherWorkspace => ({
  version: 1,
  roomPlans: [],
});
export function readTeacherWorkspace(raw: string | null): TeacherWorkspace {
  if (!raw) return emptyTeacherWorkspace();
  const p = JSON.parse(raw) as TeacherWorkspace;
  if (p?.version !== 1 || !Array.isArray(p.roomPlans))
    throw new Error("Xona rejalari formati noto‘g‘ri.");
  return {
    version: 1,
    roomPlans: p.roomPlans
      .filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.offeringId === "string" &&
          rooms.some((room) => room.id === r.roomId) &&
          Number.isFinite(Date.parse(r.startsAt)) &&
          Number.isFinite(Date.parse(r.endsAt)) &&
          Date.parse(r.endsAt) > Date.parse(r.startsAt) &&
          Number.isFinite(r.estimatedCost) &&
          r.estimatedCost >= 0,
      )
      .slice(-100),
  };
}
export function prepareRoomPlan(
  market: Marketplace,
  tutorId: string,
  previous: RoomPlan[],
  input: {
    roomId: string;
    offeringId: string;
    date: string;
    time: string;
    hours: number;
  },
): Omit<RoomPlan, "id"> {
  const group = market.offerings.find(
    (g) => g.id === input.offeringId && g.tutorId === tutorId,
  );
  const room = rooms.find((r) => r.id === input.roomId);
  if (!group || !room)
    throw new Error("O‘z guruhingiz va mavjud xonani tanlang.");
  if (group.mode === "Onlayn")
    throw new Error("Xona rejasi uchun oflayn guruhni tanlang.");
  if (room.capacity < group.capacity)
    throw new Error("Xona sig‘imi guruhdagi o‘rinlar sonidan kichik.");
  if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > 8)
    throw new Error("Davomiylik 1–8 soat bo‘lsin.");
  const times = toLessonTime(input.date, input.time, input.hours * 60);
  if (Date.parse(times.startsAt) <= Date.now())
    throw new Error("Kelajakdagi sana va vaqtni tanlang.");
  if (
    previous.some(
      (p) =>
        (p.roomId === room.id || p.offeringId === group.id) &&
        Date.parse(p.startsAt) < Date.parse(times.endsAt) &&
        Date.parse(times.startsAt) < Date.parse(p.endsAt),
    )
  )
    throw new Error(
      "Bu vaqt xona yoki guruhning boshqa rejasiga to‘g‘ri kelmoqda.",
    );
  return {
    roomId: room.id,
    offeringId: group.id,
    ...times,
    estimatedCost: room.price * input.hours,
  };
}
