import type { SupabaseClient } from "@supabase/supabase-js";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function passwordAuthError(error: { code?: string; message: string }) {
  if (error.code === "invalid_credentials")
    return new Error("Email yoki parol noto‘g‘ri.");
  if (error.code === "user_already_exists" || error.code === "email_exists")
    return new Error(
      "Bu email bilan akkaunt mavjud. Kirish bo‘limidan foydalaning.",
    );
  return new Error(error.message);
}
export function createPasswordAuth(client: SupabaseClient) {
  return {
    async signUp(value: string, password: string, confirmation: string) {
      const email = normalizeEmail(value);
      if (!validEmail(email))
        throw new Error("To‘g‘ri email manzilini kiriting.");
      if (password.length < 8)
        throw new Error("Parol kamida 8 ta belgidan iborat bo‘lsin.");
      if (password !== confirmation)
        throw new Error("Parollar mos kelmadi. Qayta tekshiring.");
      // Passwords are opaque credentials: never trim or otherwise normalize.
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });
      if (error) throw passwordAuthError(error);
      return data;
    },
    async signIn(value: string, password: string) {
      const email = normalizeEmail(value);
      if (!validEmail(email))
        throw new Error("To‘g‘ri email manzilini kiriting.");
      // Existing accounts can have older password policies. Only signup applies
      // the new minimum; login must send the exact credential to managed Auth.
      if (!password) throw new Error("Parolingizni kiriting.");
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw passwordAuthError(error);
      return data;
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

export function createPasswordRecovery(client: SupabaseClient) {
  return {
    async request(value: string, redirectTo: string) {
      const email = normalizeEmail(value);
      if (!validEmail(email))
        throw new Error("To‘g‘ri email manzilini kiriting.");
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error)
        throw new Error(
          error.status === 429
            ? "Juda ko‘p urinish. Keyinroq urinib ko‘ring."
            : "Tiklash xatini yuborib bo‘lmadi. Keyinroq urinib ko‘ring.",
        );
    },
    async update(password: string, confirmation: string) {
      if (password.length < 8)
        throw new Error("Parol kamida 8 ta belgidan iborat bo‘lsin.");
      if (password !== confirmation)
        throw new Error("Parollar mos kelmadi. Qayta tekshiring.");
      const { error } = await client.auth.updateUser({ password });
      if (error)
        throw new Error(
          "Parolni yangilab bo‘lmadi. Tiklash havolasini qayta oching.",
        );
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error)
        throw new Error(
          "Parol yangilandi. Ilovani qayta ochib, yangi parol bilan kiring.",
        );
    },
  };
}
