import type { ProfileInput, TutorInput } from "./domain";
import { REGIONS } from "../data/regions";
export const ONBOARDING_GOALS = [
  { title: "IELTS olish", icon: "globe" },
  { title: "CEFR olish", icon: "award" },
  { title: "Milliy sertifikat", icon: "file-text" },
  { title: "Universitetga kirish", icon: "book-open" },
  { title: "Malakaviy ko‘nikmaga ega bo‘lish", icon: "briefcase" },
] as const;
export const ONBOARDING_SUBJECTS = [
  "Matematika",
  "Ingliz tili",
  "Ona tili va adabiyot",
  "Fizika",
  "Kimyo",
  "Biologiya",
  "Tarix",
  "Geografiya",
  "Rus tili",
  "Informatika",
  "IT",
  "Nemis tili",
  "Fransuz tili",
];
export const needsSubjects = (goal: string) =>
  [
    "Milliy sertifikat",
    "Universitetga kirish",
    "Malakaviy ko‘nikmaga ega bo‘lish",
  ].includes(goal);
export function validateGoal(goal: string, subjects: string[], tutor = false) {
  if (!ONBOARDING_GOALS.some((g) => g.title === goal))
    throw new Error("Maqsadingizni tanlang.");
  if ((needsSubjects(goal) || tutor) && !subjects.length)
    throw new Error("Kamida bitta fan yoki yo‘nalishni tanlang.");
}
export function validatePreferences(
  p: Pick<ProfileInput, "city" | "area" | "studyMode" | "studySupport">,
) {
  if (!p.studyMode || !["Onlayn", "Oflayn"].includes(p.studyMode))
    throw new Error("Onlayn yoki oflayn shaklni tanlang.");
  if (!p.studySupport || !["Mustaqil", "Ustoz bilan"].includes(p.studySupport))
    throw new Error("Mustaqil yoki ustoz bilan tayyorlanishni tanlang.");
  if (!REGIONS.find((r) => r.name === p.city)?.districts.includes(p.area))
    throw new Error("Avval viloyatni, keyin shu hududdagi tumanni tanlang.");
}
export function validateName(first: string, last: string) {
  if (first.trim().length < 2 || last.trim().length < 2)
    throw new Error("Ism va familiyangizni to‘liq kiriting.");
  if (`${first.trim()} ${last.trim()}`.length > 100)
    throw new Error("Ism va familiya jami 100 belgidan oshmasin.");
}
export function validateTeaching(t: TutorInput) {
  if (t.specialty.trim().length < 2 || t.bio.trim().length < 10)
    throw new Error("Yo‘nalish va darslaringiz haqida to‘ldiring.");
  if (
    !Number.isFinite(t.experience) ||
    t.experience < 0 ||
    t.experience > 60 ||
    !Number.isFinite(t.price) ||
    t.price <= 0
  )
    throw new Error("Tajriba 0–60 yil, dars narxi esa 0 dan katta bo‘lsin.");
  if (
    !t.availability.length ||
    t.availability.some((v) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
  )
    throw new Error("Dars vaqtini HH:MM shaklida kiriting.");
}
