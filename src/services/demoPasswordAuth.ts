import { normalizeEmail, validEmail } from "./authFlow";
import { DEMO_PASSWORD } from "../state/demo";

export const demoPasswordStorageKey = "@darsino/demo-passwords-v1";
type Credential = { salt: string; digest: string };
type Registry = { version: 1; accounts: Record<string, Credential> };
type Dependencies = {
  storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  };
  hash: (value: string) => Promise<string>;
  createSalt: () => string;
};

// A local demo credential registry, separate from the marketplace/session cache.
// Managed Supabase Auth remains responsible for real account credentials.
export function createDemoPasswordAuth({
  storage,
  hash,
  createSalt,
}: Dependencies) {
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(operation: () => Promise<T>) {
    const result = queue.catch(() => {}).then(operation);
    queue = result;
    return result;
  }
  async function read(): Promise<Registry> {
    const raw = await storage.getItem(demoPasswordStorageKey);
    if (!raw) return { version: 1, accounts: {} };
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed?.version !== 1 ||
        !parsed.accounts ||
        typeof parsed.accounts !== "object" ||
        Array.isArray(parsed.accounts)
      )
        throw new Error();
      for (const [email, record] of Object.entries(parsed.accounts)) {
        const entry = record as Credential;
        if (
          !validEmail(email) ||
          normalizeEmail(email) !== email ||
          !entry ||
          typeof entry.salt !== "string" ||
          !entry.salt ||
          entry.salt.length > 256 ||
          typeof entry.digest !== "string" ||
          !/^[a-f0-9]{64}$/.test(entry.digest)
        )
          throw new Error();
      }
      return parsed as Registry;
    } catch {
      throw new Error("Sinov akkauntlari ma’lumotini o‘qib bo‘lmadi.");
    }
  }
  function emailOf(value: string) {
    const email = normalizeEmail(value);
    if (!validEmail(email))
      throw new Error("To‘g‘ri email manzilini kiriting.");
    return email;
  }
  return {
    signUp(
      value: string,
      password: string,
      confirmation: string,
      knownEmails: string[],
    ) {
      return serialize(async () => {
        const email = emailOf(value);
        if (password.length < 8)
          throw new Error("Parol kamida 8 ta belgidan iborat bo‘lsin.");
        if (password !== confirmation)
          throw new Error("Parollar mos kelmadi. Qayta tekshiring.");
        const registry = await read();
        if (
          registry.accounts[email] ||
          knownEmails.some((value) => normalizeEmail(value) === email)
        )
          throw new Error(
            "Bu email bilan akkaunt mavjud. Kirish bo‘limidan foydalaning.",
          );
        const salt = createSalt();
        if (!salt || salt.length > 256)
          throw new Error("Sinov parolini tayyorlab bo‘lmadi.");
        const digest = await hash(password + salt);
        if (!/^[a-f0-9]{64}$/.test(digest))
          throw new Error("Sinov parolini tayyorlab bo‘lmadi.");
        registry.accounts[email] = { salt, digest };
        await storage.setItem(demoPasswordStorageKey, JSON.stringify(registry));
        return email;
      });
    },
    signIn(value: string, password: string, knownEmails: string[]) {
      return serialize(async () => {
        const email = emailOf(value);
        if (!password) throw new Error("Parolingizni kiriting.");
        const registry = await read();
        const credential = registry.accounts[email];
        const valid = credential
          ? (await hash(password + credential.salt)) === credential.digest
          : knownEmails.some((value) => normalizeEmail(value) === email) &&
            password === DEMO_PASSWORD;
        if (!valid) throw new Error("Email yoki parol noto‘g‘ri.");
        return email;
      });
    },
  };
}
