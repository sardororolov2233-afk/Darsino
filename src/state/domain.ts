import type { StudyGroup, Tutor } from "../data/catalog";

export type Role = "student" | "tutor" | "moderator";
export type VerificationStatus = "draft" | "pending" | "approved" | "rejected";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  area: string;
  role: Role;
  interests: string[];
  goal: string;
  onboarded: boolean;
  avatarFileId?: string | null;
  demoAvatarUri?: string;
};
export type TutorProfile = {
  userId: string;
  subjects: string[];
  specialty: string;
  experience: number;
  proof: string;
  bio: string;
  price: number;
  modes: string[];
  availability: string[];
  verification: VerificationStatus;
  moderationNote: string;
  studentCount?: number;
};
export type Offering = StudyGroup & {
  type: "group" | "individual";
  published: boolean;
  reservedSeats: number;
  enrolledCount?: number;
  coverFileId?: string | null;
};
export type LessonSession = {
  id: string;
  offeringId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  mode: string;
};
export type Enrollment = {
  id: string;
  offeringId: string;
  studentId: string;
  active: boolean;
  createdAt: string;
};
export type BookingRequest = {
  id: string;
  studentId: string;
  tutorId: string;
  groupId?: string;
  kind: "lesson" | "group" | "event" | "room";
  title: string;
  subtitle: string;
  time: string;
  startsAt?: string;
  endsAt?: string;
  status: RequestStatus;
  price?: number;
  conversationId?: string;
  note: string;
  createdAt: string;
};
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  text: string;
  time: string;
  mine: boolean;
  file?: string;
  attachmentIds?: string[];
};
export type FilePurpose =
  "avatar" | "verification" | "chat" | "material" | "cover";
export type FileAsset = {
  id: string;
  ownerId: string;
  purpose: FilePurpose;
  bucketId: string;
  objectPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  state: "pending" | "ready" | "deleting" | "deleted";
  conversationId: string | null;
  offeringId: string | null;
  createdAt: string;
};
export type TutorDocument = {
  id: string;
  tutorId: string;
  fileId: string;
  documentType: "certificate" | "diploma" | "other";
  label: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
};
export type LessonFile = {
  id: string;
  offeringId: string;
  sessionId: string | null;
  fileId: string;
  title: string;
  published: boolean;
  createdAt: string;
};
export type Attendance = {
  sessionId: string;
  studentId: string;
  status: "present" | "absent";
};
export type Review = {
  id: string;
  sessionId: string;
  tutorId: string;
  studentId: string;
  rating: number;
  text: string;
  createdAt: string;
};
export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  offeringId?: string;
};
export type Marketplace = {
  version: 2;
  users: User[];
  tutorProfiles: TutorProfile[];
  offerings: Offering[];
  sessions: LessonSession[];
  enrollments: Enrollment[];
  applications: BookingRequest[];
  messages: Message[];
  attendance: Attendance[];
  reviews: Review[];
  notifications: AppNotification[];
  favorites: Record<string, string[]>;
  files?: FileAsset[];
  tutorDocuments?: TutorDocument[];
  lessonFiles?: LessonFile[];
};
export type Filters = {
  subject: string;
  area: string;
  mode: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
};
export type ProfileInput = Pick<
  User,
  "name" | "city" | "area" | "goal" | "interests"
>;
export type TutorInput = Omit<
  TutorProfile,
  "userId" | "verification" | "moderationNote" | "studentCount"
>;
export type OfferingInput = {
  title: string;
  subject: string;
  type: "group" | "individual";
  capacity: number;
  price: number;
  mode: string;
  area: string;
  location: string;
  days: string;
  benefits: string[];
  sessions: { startsAt: string; endsAt: string }[];
};
export type RequestInput = Omit<
  BookingRequest,
  "id" | "studentId" | "status" | "note" | "createdAt"
>;
export type MarketCommand =
  | {
      type: "profile";
      profile: ProfileInput;
      role?: "student" | "tutor";
      tutor?: TutorInput;
    }
  | { type: "tutor-profile"; profile: TutorInput }
  | {
      type: "moderate";
      tutorId: string;
      decision: "approved" | "rejected";
      note: string;
    }
  | { type: "offering"; offering: OfferingInput }
  | { type: "request"; request: RequestInput }
  | {
      type: "decide";
      requestId: string;
      decision: "approved" | "rejected";
      note: string;
    }
  | { type: "cancel"; requestId: string }
  | {
      type: "attendance";
      sessionId: string;
      studentId: string;
      status: "present" | "absent";
    }
  | { type: "review"; sessionId: string; rating: number; text: string }
  | { type: "message"; conversationId: string; text: string }
  | { type: "favorite"; id: string }
  | { type: "read-notifications" }
  | { type: "remove-participant"; offeringId: string; studentId: string }
  | {
      type: "update-session";
      sessionId: string;
      startsAt: string;
      endsAt: string;
    }
  | { type: "offering-visibility"; offeringId: string; published: boolean };

export const blankUser: User = {
  id: "",
  name: "",
  phone: "",
  email: "",
  city: "Toshkent",
  area: "Yunusobod",
  role: "student",
  interests: ["Ingliz tili"],
  goal: "IELTS / CEFR",
  onboarded: false,
};
export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: "Tasdiqlash kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  cancelled: "Bekor qilingan",
};
export const verificationLabel: Record<VerificationStatus, string> = {
  draft: "Profilni to‘ldiring",
  pending: "Moderator tekshiruvida",
  approved: "Tasdiqlangan repetitor",
  rejected: "Tuzatish talab qilinadi",
};
export const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const dmId = (studentId: string, tutorId: string) =>
  `dm:${studentId}:${tutorId}`;
export const localDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const nextDates = (count = 7, from = new Date()) =>
  Array.from({ length: count }, (_, i) =>
    localDate(new Date(from.getTime() + (i + 1) * 86400000)),
  );
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "long",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:00` : value));
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export function toLessonTime(date: string, time: string, minutes = 60) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("Sana yoki vaqt noto‘g‘ri.");
  const start = new Date(`${date}T${time}:00+05:00`);
  if (!Number.isFinite(start.getTime()) || localDate(start) !== date)
    throw new Error("Sana yoki vaqt noto‘g‘ri.");
  return {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + minutes * 60000).toISOString(),
  };
}
export function publicTutors(m: Marketplace): Tutor[] {
  return m.tutorProfiles
    .filter((p) => p.verification === "approved")
    .flatMap((p) => {
      const u = m.users.find((u) => u.id === p.userId);
      if (!u) return [];
      const r = m.reviews.filter((r) => r.tutorId === u.id);
      return [
        {
          id: u.id,
          name: u.name,
          initials: u.name
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase(),
          subject: p.subjects[0] || "",
          subjects: p.subjects,
          specialty: p.specialty,
          rating: r.length
            ? Math.round(
                (r.reduce((s, r) => s + r.rating, 0) / r.length) * 10,
              ) / 10
            : 0,
          reviews: r.length,
          area: u.area,
          price: p.price,
          experience: p.experience,
          students:
            p.studentCount ??
            new Set(
              m.enrollments
                .filter((e) =>
                  m.offerings.some(
                    (o) => o.id === e.offeringId && o.tutorId === u.id,
                  ),
                )
                .map((e) => e.studentId),
            ).size,
          verified: true,
          bio: p.bio,
          modes: p.modes,
        },
      ];
    });
}
export function publicGroups(m: Marketplace): Offering[] {
  return m.offerings
    .filter(
      (o) =>
        o.published &&
        m.tutorProfiles.some(
          (p) => p.userId === o.tutorId && p.verification === "approved",
        ),
    )
    .map((o) => {
      const students =
        o.enrolledCount ??
        o.reservedSeats +
          m.enrollments.filter((e) => e.offeringId === o.id && e.active).length;
      return { ...o, students, spots: Math.max(0, o.capacity - students) };
    });
}
