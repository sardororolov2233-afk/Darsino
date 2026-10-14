import type { SupabaseClient } from "@supabase/supabase-js";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function createEmailAuth(client: SupabaseClient) {
  return {
    async request(value: string) {
      const email = normalizeEmail(value);
      if (!validEmail(email))
        throw new Error("To‘g‘ri email manzilini kiriting.");
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
    },
    async verify(email: string, token: string) {
      if (!/^\d{6,8}$/.test(token))
        throw new Error("Emaildagi 6–8 xonali kodni kiriting.");
      const { error } = await client.auth.verifyOtp({
        email: normalizeEmail(email),
        token,
        type: "email",
      });
      if (error)
        throw new Error(
          "Kod tasdiqlanmadi. Emaildagi kodni tekshiring yoki yangisini so‘rang.",
        );
    },
  };
}

// PKCE exchanges only an authorization code returned to our own callback.
// Access/refresh tokens in arbitrary deep links are never accepted.
export function createOAuthCallbackHandler(
  client: SupabaseClient,
  redirectTo: string,
) {
  const expected = new URL(redirectTo);
  const exchanges = new Map<string, Promise<boolean>>();
  return async (url: string): Promise<boolean> => {
    const actual = new URL(url);
    if (
      actual.protocol !== expected.protocol ||
      actual.host !== expected.host ||
      actual.pathname !== expected.pathname
    )
      return false;
    const error =
      actual.searchParams.get("error_description") ||
      actual.searchParams.get("error");
    if (error)
      throw new Error(
        "Akkaunt orqali kirish tugallanmadi. Qayta urinib ko‘ring.",
      );
    const code = actual.searchParams.get("code");
    if (!code) return false;
    const existing = exchanges.get(code);
    if (existing) return existing;
    const operation = (async () => {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error)
        throw new Error("Kirish sessiyasini tasdiqlab bo‘lmadi. Qayta kiring.");
      return true;
    })();
    exchanges.set(code, operation);
    // Keep failed exchanges too: a duplicate browser/deep-link event must not
    // consume the same verifier twice. A new sign-in gets a new code.
    if (exchanges.size > 10) exchanges.delete(exchanges.keys().next().value!);
    return operation;
  };
}
