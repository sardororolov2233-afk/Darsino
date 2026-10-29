import type { Marketplace, User } from "./domain";

export const LANGUAGES = [
  { code: "uz", name: "O‘zbekcha" },
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
  { code: "kk", name: "Қазақша" },
  { code: "ky", name: "Кыргызча" },
] as const;
export type Language = (typeof LANGUAGES)[number]["code"];
export type ContactPolicy = "everyone" | "contacts" | "nobody";
export type AccountSettings = {
  language: Language;
  discoverable: boolean;
  allowContactRequests: boolean;
  showArea: boolean;
  avatarVisibility: ContactPolicy;
  messagePolicy: ContactPolicy;
  invitePolicy: ContactPolicy;
  lessonReminders: boolean;
};
export const defaultAccountSettings: AccountSettings = {
  language: "uz",
  discoverable: true,
  allowContactRequests: true,
  showArea: true,
  avatarVisibility: "everyone",
  messagePolicy: "everyone",
  invitePolicy: "everyone",
  lessonReminders: true,
};
export const studentPrivacyDefaults: AccountSettings = {
  ...defaultAccountSettings,
  discoverable: false,
  showArea: false,
  avatarVisibility: "contacts",
  messagePolicy: "contacts",
  invitePolicy: "contacts",
};
export type ContactRequest = {
  id: string;
  senderId: string;
  recipientId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
};
export type Contact = { userId: string; peerId: string; createdAt: string };
export type UserBlock = { userId: string; peerId: string };
export type GroupInvitation = {
  id: string;
  offeringId: string;
  tutorId: string;
  studentId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
  expiresAt: string;
};
export type AccountReport = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: string;
};
export type AccountCommand =
  | { type: "account-settings"; settings: AccountSettings; publicId: string }
  | { type: "contact-request"; peerId: string }
  | { type: "contact-decide"; requestId: string; accept: boolean }
  | { type: "contact-remove"; peerId: string }
  | { type: "block-user"; peerId: string; blocked: boolean }
  | { type: "group-invite"; offeringId: string; studentId: string }
  | { type: "group-invite-decide"; invitationId: string; accept: boolean }
  | { type: "group-invite-cancel"; invitationId: string }
  | { type: "report-user"; peerId: string; reason: string };
export const accountCommandTypes = new Set([
  "account-settings",
  "contact-request",
  "contact-decide",
  "contact-remove",
  "block-user",
  "group-invite",
  "group-invite-decide",
  "group-invite-cancel",
  "report-user",
]);
export function readAccountSettings(
  value?: Partial<AccountSettings> | null,
): AccountSettings {
  const result = { ...defaultAccountSettings, ...value };
  if (!LANGUAGES.some((l) => l.code === result.language))
    throw new Error("Tilni tanlang.");
  for (const field of [
    "discoverable",
    "showArea",
    "lessonReminders",
    "allowContactRequests",
  ] as const)
    if (typeof result[field] !== "boolean")
      throw new Error("Sozlamalar noto‘g‘ri.");
  for (const field of [
    "avatarVisibility",
    "messagePolicy",
    "invitePolicy",
  ] as const)
    if (!["everyone", "contacts", "nobody"].includes(result[field]))
      throw new Error("Maxfiylik sozlamasi noto‘g‘ri.");
  return result;
}
export const defaultPublicId = (id: string) =>
  "oqi_" +
  id
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
export const publicIdOf = (user: Pick<User, "id" | "publicId">) =>
  user.publicId || defaultPublicId(user.id);
export function normalizePublicId(value: string) {
  const clean = value.trim();
  if (/^darsino:\/\/connect\//i.test(clean)) {
    try {
      return decodeURIComponent(
        clean.slice("darsino://connect/".length),
      ).toLowerCase();
    } catch {
      return "";
    }
  }
  return clean.replace(/^@/, "").toLowerCase();
}
export const validPublicId = (value: string) =>
  /^[a-z][a-z0-9_]{4,23}$/.test(value);
export function parseContactQr(value: string): string | null {
  if (value.length > 256 || !/^darsino:\/\/connect\//i.test(value.trim()))
    return null;
  const id = normalizePublicId(value);
  return validPublicId(id) ? id : null;
}
export const contactLink = (id: string) =>
  "darsino://connect/" + encodeURIComponent(id);
export const isBlocked = (market: Marketplace, a: string, b: string) =>
  (market.blocks || []).some(
    (x) =>
      (x.userId === a && x.peerId === b) || (x.userId === b && x.peerId === a),
  );
export const areContacts = (market: Marketplace, a: string, b: string) =>
  (market.contacts || []).some((x) => x.userId === a && x.peerId === b);
export function permits(policy: ContactPolicy, contacts: boolean) {
  return policy === "everyone" || (policy === "contacts" && contacts);
}
export function conversationFor(a: User, b: User) {
  if (a.id === b.id) throw new Error("O‘zingizga xabar yuborib bo‘lmaydi.");
  if (a.role === "student" && b.role === "tutor")
    return "dm:" + a.id + ":" + b.id;
  if (b.role === "student" && a.role === "tutor")
    return "dm:" + b.id + ":" + a.id;
  return "dm:" + [a.id, b.id].sort().join(":");
}
export function canContactMessage(
  market: Marketplace,
  sender: User,
  recipient: User,
) {
  if (
    !sender.onboarded ||
    !recipient.onboarded ||
    isBlocked(market, sender.id, recipient.id)
  )
    return false;
  const linked = areContacts(market, sender.id, recipient.id);
  const settings = readAccountSettings(market.accountSettings?.[recipient.id]);
  const approved = (u: User) =>
    u.role !== "tutor" ||
    market.tutorProfiles.some(
      (p) => p.userId === u.id && p.verification === "approved",
    );
  const learningPair =
    (sender.role === "student" && recipient.role === "tutor") ||
    (sender.role === "tutor" && recipient.role === "student");
  return (
    approved(sender) &&
    approved(recipient) &&
    (linked || learningPair) &&
    permits(settings.messagePolicy, linked)
  );
}
