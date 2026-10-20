import { groups, tutors } from "../data/catalog";
import {
  blankUser,
  nextDates,
  toLessonTime,
  type Marketplace,
  type User,
} from "./domain";
export const DEMO_CODE = "421806";
export const DEMO_TUTOR_PHONE = "+998901111111";
export const DEMO_MODERATOR_PHONE = "+998900000001";
export const DEMO_TUTOR_EMAIL = "dilnoza@darsino.demo";
export const DEMO_MODERATOR_EMAIL = "moderator@darsino.demo";
export function emptyMarketplace(): Marketplace {
  return {
    version: 2,
    users: [],
    tutorProfiles: [],
    offerings: [],
    sessions: [],
    enrollments: [],
    applications: [],
    messages: [],
    attendance: [],
    reviews: [],
    notifications: [],
    payments: [],
    favorites: {},
  };
}
export function demoMarketplace(): Marketplace {
  const m = emptyMarketplace();
  m.users = tutors.map((t, i) => ({
    ...blankUser,
    id: t.id,
    name: t.name,
    phone: i === 0 ? DEMO_TUTOR_PHONE : `+99890111111${i + 1}`,
    email: i === 0 ? DEMO_TUTOR_EMAIL : `${t.id}@darsino.demo`,
    area: t.area,
    role: "tutor",
    interests: [t.subject],
    onboarded: true,
  }));
  m.users.push({
    ...blankUser,
    id: "demo-moderator",
    name: "O‘qi moderatori",
    phone: DEMO_MODERATOR_PHONE,
    email: DEMO_MODERATOR_EMAIL,
    role: "moderator",
    onboarded: true,
  });
  m.tutorProfiles = tutors.map((t) => ({
    userId: t.id,
    subjects: [t.subject],
    specialty: t.specialty,
    experience: t.experience,
    proof: "Tasdiqlash hujjati — sinov ma’lumoti",
    bio: t.bio,
    price: t.price,
    modes: t.modes,
    availability: ["16:00", "18:00", "20:00"],
    verification: "approved",
    moderationNote: "Sinov profili",
  }));
  m.offerings = groups.map((g) => ({
    ...g,
    type: "group",
    published: true,
    reservedSeats: g.students,
  }));
  m.sessions = groups.flatMap((g) =>
    nextDates(7)
      .filter((_, i) => i % 2 === 0)
      .map((date, i) => ({
        id: `${g.id}-session-${i}`,
        offeringId: g.id,
        title: g.title,
        ...toLessonTime(date, g.time.slice(0, 5), g.duration),
        location: g.location,
        mode: g.mode,
      })),
  );
  return m;
}
export function demoAccount(
  m: Marketplace,
  phone: string,
  requestedRole: User["role"],
) {
  const existing = m.users.find((u) => u.phone === phone);
  if (existing) return { market: m, user: existing };
  const user: User = {
    ...blankUser,
    id: `user-${phone.replace(/\D/g, "")}`,
    phone,
    role: requestedRole === "moderator" ? "student" : requestedRole,
  };
  return { market: { ...m, users: [...m.users, user] }, user };
}
export function demoEmailAccount(
  m: Marketplace,
  email: string,
  requestedRole: User["role"],
) {
  const normalized = email.trim().toLowerCase();
  // Existing device caches retain their teacher/moderator IDs and relationships.
  const existing =
    m.users.find((u) => u.email?.toLowerCase() === normalized) ||
    m.users.find((u) =>
      normalized === DEMO_TUTOR_EMAIL
        ? u.phone === DEMO_TUTOR_PHONE
        : normalized === DEMO_MODERATOR_EMAIL
          ? u.phone === DEMO_MODERATOR_PHONE
          : false,
    );
  if (existing) {
    const user = { ...existing, email: normalized };
    return {
      user,
      market: {
        ...m,
        users: m.users.map((u) => (u.id === user.id ? user : u)),
      },
    };
  }
  const user: User = {
    ...blankUser,
    id: `email-${normalized}`,
    email: normalized,
    role: requestedRole === "tutor" ? "tutor" : "student",
  };
  return { market: { ...m, users: [...m.users, user] }, user };
}
