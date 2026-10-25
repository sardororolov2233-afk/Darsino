import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createDemoPasswordAuth,
  demoPasswordStorageKey,
} from "../src/services/demoPasswordAuth";
import { DEMO_PASSWORD, DEMO_TUTOR_EMAIL } from "../src/state/demo";

function fixture() {
  const values = new Map<string, string>();
  let salts = 0;
  const dependencies = {
    storage: {
      async getItem(key: string) {
        return values.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        values.set(key, value);
      },
    },
    async hash(value: string) {
      return createHash("sha256").update(value).digest("hex");
    },
    createSalt() {
      return `unique-demo-salt-${++salts}`;
    },
  };
  return { values, dependencies, auth: createDemoPasswordAuth(dependencies) };
}

test("demo signup stores a salted digest, preserves exact passwords and survives helper reload", async () => {
  const f = fixture();
  const password = "  O‘qi 🌿 password  ";
  assert.equal(
    await f.auth.signUp(" STUDENT@Example.com ", password, password, []),
    "student@example.com",
  );
  const serialized = f.values.get(demoPasswordStorageKey)!;
  assert.ok(!serialized.includes(password));
  const record = JSON.parse(serialized).accounts["student@example.com"];
  assert.equal(
    record.digest,
    createHash("sha256")
      .update(password + record.salt)
      .digest("hex"),
  );
  assert.equal(
    await f.auth.signIn(" STUDENT@EXAMPLE.COM ", password, []),
    "student@example.com",
  );
  await assert.rejects(
    f.auth.signIn("student@example.com", password.trim(), []),
    /Email yoki parol noto‘g‘ri/,
  );
  await assert.rejects(
    f.auth.signIn("student@example.com", DEMO_PASSWORD, [
      "student@example.com",
    ]),
    /Email yoki parol noto‘g‘ri/,
  );
  const reloaded = createDemoPasswordAuth(f.dependencies);
  assert.equal(
    await reloaded.signIn("student@example.com", password, []),
    "student@example.com",
  );
  await assert.rejects(
    reloaded.signUp("student@example.com", password, password, []),
    /akkaunt mavjud/,
  );
});

test("seeded and legacy accounts use the explicit demo password; unknown logins cannot create accounts", async () => {
  const f = fixture();
  const known = [DEMO_TUTOR_EMAIL, "legacy@example.com"];
  await assert.rejects(
    f.auth.signIn(DEMO_TUTOR_EMAIL, "wrong password", known),
    /Email yoki parol noto‘g‘ri/,
  );
  assert.equal(
    await f.auth.signIn(DEMO_TUTOR_EMAIL, DEMO_PASSWORD, known),
    DEMO_TUTOR_EMAIL,
  );
  assert.equal(
    await f.auth.signIn(" LEGACY@EXAMPLE.COM ", DEMO_PASSWORD, known),
    "legacy@example.com",
  );
  await assert.rejects(
    f.auth.signIn("unknown@example.com", DEMO_PASSWORD, known),
    /Email yoki parol noto‘g‘ri/,
  );
  await assert.rejects(
    f.auth.signUp(DEMO_TUTOR_EMAIL, "new password", "new password", known),
    /akkaunt mavjud/,
  );
  assert.equal(f.values.size, 0);
});

test("invalid signup inputs do not write credentials and concurrent registrations do not overwrite each other", async () => {
  const f = fixture();
  await assert.rejects(
    f.auth.signUp("invalid", "long password", "long password", []),
    /email/,
  );
  await assert.rejects(
    f.auth.signUp("a@example.com", "short", "short", []),
    /kamida 8/,
  );
  await assert.rejects(
    f.auth.signUp("a@example.com", "long password", "other password", []),
    /mos kelmadi/,
  );
  assert.equal(f.values.size, 0);
  await Promise.all([
    f.auth.signUp("a@example.com", "same password", "same password", []),
    f.auth.signUp("b@example.com", "same password", "same password", []),
  ]);
  const accounts = JSON.parse(f.values.get(demoPasswordStorageKey)!).accounts;
  assert.notEqual(
    accounts["a@example.com"].salt,
    accounts["b@example.com"].salt,
  );
  assert.notEqual(
    accounts["a@example.com"].digest,
    accounts["b@example.com"].digest,
  );
  assert.equal(
    await f.auth.signIn("a@example.com", "same password", []),
    "a@example.com",
  );
  assert.equal(
    await f.auth.signIn("b@example.com", "same password", []),
    "b@example.com",
  );
});

test("corrupt registries fail closed and failed persistence never reports a created account", async () => {
  const f = fixture();
  f.values.set(demoPasswordStorageKey, "broken json");
  await assert.rejects(
    f.auth.signIn(DEMO_TUTOR_EMAIL, DEMO_PASSWORD, [DEMO_TUTOR_EMAIL]),
    /o‘qib bo‘lmadi/,
  );
  f.values.clear();
  const failing = createDemoPasswordAuth({
    ...f.dependencies,
    storage: {
      ...f.dependencies.storage,
      async setItem() {
        throw new Error("Storage unavailable");
      },
    },
  });
  await assert.rejects(
    failing.signUp("a@example.com", "long password", "long password", []),
    /Storage unavailable/,
  );
  await assert.rejects(
    f.auth.signIn("a@example.com", "long password", []),
    /Email yoki parol noto‘g‘ri/,
  );
  assert.equal(f.values.size, 0);
});
