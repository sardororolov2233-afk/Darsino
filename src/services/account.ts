import { backendMode, requireBackend } from "./backend";
import {
  areContacts,
  isBlocked,
  normalizePublicId,
  publicIdOf,
  readAccountSettings,
  validPublicId,
} from "../state/account";
import type { Marketplace, User } from "../state/domain";

export async function findAccount(
  input: string,
  actorId: string,
  market: Marketplace,
): Promise<User | null> {
  const id = normalizePublicId(input);
  if (!validPublicId(id)) throw new Error("ID noto‘g‘ri.");
  if (backendMode === "demo") {
    const user = market.users.find(
      (u) =>
        publicIdOf(u) === id &&
        u.onboarded &&
        !isBlocked(market, actorId, u.id) &&
        (u.id === actorId ||
          areContacts(market, actorId, u.id) ||
          readAccountSettings(market.accountSettings?.[u.id]).discoverable),
    );
    if (!user) return null;
    const settings = readAccountSettings(market.accountSettings?.[user.id]);
    return {
      ...user,
      phone: user.id === actorId ? user.phone : "",
      email: user.id === actorId ? user.email : "",
      city: settings.showArea || user.id === actorId ? user.city : "",
      area: settings.showArea || user.id === actorId ? user.area : "",
      demoAvatarUri:
        settings.avatarVisibility === "everyone" ||
        user.id === actorId ||
        (settings.avatarVisibility === "contacts" &&
          areContacts(market, actorId, user.id))
          ? user.demoAvatarUri
          : undefined,
    };
  }
  const { data, error } = await requireBackend().rpc("darsino_find_account", {
    p_public_id: id,
  });
  if (error) throw new Error(error.message);
  return data as User | null;
}
export async function revokeOtherSessions() {
  if (backendMode === "demo")
    throw new Error("Bu imkoniyat jonli akkauntda ishlaydi.");
  const { error } = await requireBackend().auth.signOut({ scope: "others" });
  if (error) throw new Error(error.message);
}
export type AccountSession = {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  userAgent: string | null;
  current: boolean;
};
export async function ownSessions(): Promise<AccountSession[]> {
  if (backendMode === "demo") return [];
  const { data, error } = await requireBackend().rpc("darsino_own_sessions");
  if (error) throw new Error(error.message);
  return data as AccountSession[];
}
