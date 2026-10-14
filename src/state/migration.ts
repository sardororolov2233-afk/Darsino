import { demoAccount, demoMarketplace } from "./demo";
import { dmId, type Marketplace, type User } from "./domain";
import { validPhone } from "./model";

export type DemoCache = { market: Marketplace; actorId: string | null };
export function readDemoCache(raw: string): DemoCache {
  const value = JSON.parse(raw) as DemoCache;
  const arrays: (keyof Marketplace)[] = [
    "users",
    "tutorProfiles",
    "offerings",
    "sessions",
    "enrollments",
    "applications",
    "messages",
    "attendance",
    "reviews",
    "notifications",
  ];
  if (
    value.market?.version !== 2 ||
    !arrays.every((key) => Array.isArray(value.market[key])) ||
    !value.market.favorites
  )
    throw new Error("Saqlangan ma’lumot o‘qilmadi.");
  return value;
}
export function migrateLegacyDemo(raw: string): DemoCache {
  const previous = JSON.parse(raw);
  if (!previous.user || !validPhone(previous.user.phone || ""))
    throw new Error("Eski hisob ma’lumoti o‘qilmadi.");
  const digits = previous.user.phone.replace(/\D/g, "");
  const account = demoAccount(
    demoMarketplace(),
    `+${digits.length === 9 ? "998" : ""}${digits}`,
    previous.user.role === "tutor" ? "tutor" : "student",
  );
  const user: User = {
    ...account.user,
    name: String(previous.user.name || ""),
    city: String(previous.user.city || "Toshkent"),
    area: String(previous.user.area || "Yunusobod"),
    interests:
      Array.isArray(previous.user.interests) && previous.user.interests.length
        ? previous.user.interests
        : ["Ingliz tili"],
    goal: String(previous.user.goal || "IELTS / CEFR"),
    onboarded: !!previous.signedIn && !!previous.user.name,
  };
  const market = {
    ...account.market,
    users: account.market.users.map((u) => (u.id === user.id ? user : u)),
  };
  market.favorites[user.id] = Array.isArray(previous.favorites)
    ? previous.favorites.filter((id: string) =>
        market.tutorProfiles.some((p) => p.userId === id),
      )
    : [];
  // Old requests have no reliable ISO timestamps or enrollment. Archive them, never invent approval.
  market.applications = (
    Array.isArray(previous.requests) ? previous.requests : []
  ).flatMap((r: any) => {
    const group = market.offerings.find(
      (g) => g.id === r.conversationId || g.title === r.title,
    );
    const tutorId =
      group?.tutorId ||
      (market.tutorProfiles.some((p) => p.userId === r.conversationId)
        ? r.conversationId
        : undefined);
    if (!tutorId) return [];
    return [
      {
        id: `legacy-${r.id}`,
        studentId: user.id,
        tutorId,
        groupId: group?.id,
        kind: group ? ("group" as const) : ("lesson" as const),
        title: String(r.title || "Oldingi ariza"),
        subtitle: String(r.subtitle || ""),
        time: String(r.time || ""),
        price: Number(r.price) || undefined,
        status: "cancelled" as const,
        note: "Oldingi sinov arizasi arxivlandi. Joriy jadval uchun yangi ariza yuboring.",
        createdAt: new Date().toISOString(),
        conversationId: dmId(user.id, tutorId),
      },
    ];
  });
  for (const [id, messages] of Object.entries(previous.messages || {})) {
    const tutorId = market.offerings.find((g) => g.id === id)?.tutorId || id;
    if (
      !market.tutorProfiles.some((p) => p.userId === tutorId) ||
      !Array.isArray(messages)
    )
      continue;
    market.messages.push(
      ...messages
        .filter((m) => m.mine && typeof m.text === "string")
        .map((m) => ({
          id: `legacy-${m.id}`,
          conversationId: dmId(user.id, tutorId),
          senderId: user.id,
          recipientId: tutorId,
          text: m.text,
          time: String(m.time || ""),
          mine: true,
        })),
    );
  }
  return { market, actorId: previous.signedIn ? user.id : null };
}
