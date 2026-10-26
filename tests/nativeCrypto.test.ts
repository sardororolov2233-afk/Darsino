import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomFillSync, randomUUID, webcrypto } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  installNativeCrypto,
  type CryptoScope,
} from "../src/services/nativeCryptoRuntime";

const native: Parameters<typeof installNativeCrypto>[1] = {
  getRandomValues: (array) => randomFillSync(array),
  randomUUID,
  sha256: async (bytes: Uint8Array<ArrayBuffer>) =>
    new Uint8Array(createHash("sha256").update(bytes).digest()).buffer,
};

test("native crypto fills absent capabilities with secure random bytes and hashes exact binary views", async () => {
  const scope: CryptoScope = {};
  installNativeCrypto(scope, native);
  const backing = new Uint32Array(60);
  const view = backing.subarray(2, 58);
  assert.equal(scope.crypto!.getRandomValues!(view), view);
  assert.ok(view.some((value) => value !== 0));
  assert.deepEqual([...backing.subarray(0, 2)], [0, 0]);
  assert.deepEqual([...backing.subarray(58)], [0, 0]);
  assert.match(scope.crypto!.randomUUID!(), /^[0-9a-f-]{36}$/);

  // Invalid UTF-8 must stay bytes; decoding and re-encoding changes this hash.
  const bytes = new Uint8Array([17, 255, 0, 195, 40, 34]);
  for (const input of [
    bytes.subarray(1, 5),
    new DataView(bytes.buffer, 1, 4),
    bytes.slice(1, 5).buffer,
  ]) {
    const digest = await scope.crypto!.subtle!.digest!("SHA-256", input);
    assert.equal(
      Buffer.from(digest).toString("hex"),
      createHash("sha256").update(bytes.subarray(1, 5)).digest("hex"),
    );
  }
  await assert.rejects(
    scope.crypto!.subtle!.digest!("SHA-512", bytes),
    /SHA-256 only/,
  );
});

test("existing crypto functions are preserved and installation is idempotent", () => {
  const digest = async () => new ArrayBuffer(32);
  const scope: CryptoScope = {
    crypto: {
      getRandomValues: native.getRandomValues,
      randomUUID,
      subtle: { digest },
    },
  };
  const original = scope.crypto;
  installNativeCrypto(scope, native);
  installNativeCrypto(scope, native);
  assert.equal(scope.crypto, original);
  assert.equal(scope.crypto!.getRandomValues, native.getRandomValues);
  assert.equal(scope.crypto!.randomUUID, randomUUID);
  assert.equal(scope.crypto!.subtle!.digest, digest);
});

test("real Supabase PKCE recovers Google, Apple and password signup from Hermes-like partial crypto", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      subtle: { digest: webcrypto.subtle.digest.bind(webcrypto.subtle) },
    },
  });
  const stored = new Map<string, string>();
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const client = createClient("https://native-auth.test", "test-public-key", {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem: async (key) => stored.get(key) ?? null,
        setItem: async (key, value) => {
          stored.set(key, value);
        },
        removeItem: async (key) => {
          stored.delete(key);
        },
      },
    },
    global: {
      fetch: async (url, options) => {
        const path = new URL(String(url)).pathname;
        assert.equal(path, "/auth/v1/signup");
        requests.push({ path, body: JSON.parse(String(options?.body)) });
        return new Response(
          JSON.stringify({
            id: "10000000-0000-4000-8000-000000000001",
            email: "native-test@example.invalid",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  });
  const oauth = (provider: "google" | "apple") =>
    client.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: "darsino://auth/callback",
      },
    });
  const signup = () =>
    client.auth.signUp({
      email: "native-test@example.invalid",
      password: "Native-test-password!",
    });
  try {
    // Reproduce the APK failure before installing the missing native capability.
    await assert.rejects(oauth("google"), /getRandomValues is not a function/);
    await assert.rejects(signup(), /getRandomValues is not a function/);
    assert.equal(requests.length, 0);

    installNativeCrypto(globalThis as unknown as CryptoScope, native);
    for (const provider of ["google", "apple"] as const) {
      const { data, error } = await oauth(provider);
      assert.equal(error, null);
      const url = new URL(data.url!);
      assert.equal(url.searchParams.get("provider"), provider);
      assert.equal(url.searchParams.get("code_challenge_method"), "s256");
      assert.match(url.searchParams.get("code_challenge")!, /^[\w-]{43}$/);
    }
    const { data, error } = await signup();
    assert.equal(error, null);
    assert.equal(data.user?.email, "native-test@example.invalid");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.code_challenge_method, "s256");
    assert.match(String(requests[0].body.code_challenge), /^[\w-]{43}$/);
    assert.ok(
      stored.size > 0,
      "PKCE verifiers must be persisted for callbacks",
    );
  } finally {
    await client.auth.stopAutoRefresh();
    client.realtime.disconnect();
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});
