import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyDemo, readDemoCache } from "../src/state/migration";
import { createChunkedStorage } from "../src/services/secureStorage";

test("legacy profiles, favorites and own messages survive; undated requests become history", () => {
  const cache = migrateLegacyDemo(
    JSON.stringify({
      signedIn: true,
      user: {
        name: "Sardor",
        phone: "+998901234567",
        role: "student",
        interests: ["Matematika"],
        goal: "Universitet",
      },
      favorites: ["akmal", "removed"],
      requests: [
        {
          id: "old1",
          title: "IELTS 6.5+ guruhi",
          conversationId: "ielts",
          time: "14-oktabr",
          kind: "group",
        },
      ],
      messages: {
        dilnoza: [
          { id: "mine", mine: true, text: "Darsga yozildim", time: "10:30" },
          { id: "sample", mine: false, text: "Fake answer" },
        ],
      },
    }),
  );
  assert.equal(
    cache.market.users.find((u) => u.id === cache.actorId)!.goal,
    "Universitet",
  );
  assert.deepEqual(cache.market.favorites[cache.actorId!], ["akmal"]);
  assert.equal(cache.market.applications[0].status, "cancelled");
  assert.equal(cache.market.enrollments.length, 0);
  assert.equal(cache.market.messages.length, 1);
  assert.equal(cache.market.messages[0].senderId, cache.actorId);
  const restored = readDemoCache(JSON.stringify(cache));
  assert.equal(restored.actorId, cache.actorId);
  assert.equal(restored.market.messages[0].text, "Darsga yozildim");
  assert.deepEqual(restored.market.favorites, cache.market.favorites);
});
test("incomplete or corrupt marketplace caches cannot hydrate", () => {
  assert.throws(() => readDemoCache('{"market":{"version":2,"users":[]}}'));
  assert.throws(() => readDemoCache("broken json"));
});
test("native token storage handles Unicode and concurrent refresh, then removes all chunks", async () => {
  const values = new Map<string, string>();
  const storage = createChunkedStorage({
    async getItemAsync(key) {
      return values.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      assert.ok(Buffer.byteLength(value) <= 1500);
      values.set(key, value);
    },
    async deleteItemAsync(key) {
      values.delete(key);
    },
  });
  const first = "📚漢字".repeat(1500),
    second = '{"access_token":"new"}';
  await storage.setItem("auth-token", first);
  assert.equal(await storage.getItem("auth-token"), first);
  await Promise.all([
    storage.setItem("auth-token", first),
    storage.setItem("auth-token", second),
  ]);
  assert.equal(await storage.getItem("auth-token"), second);
  assert.equal(values.size, 2);
  await storage.removeItem("auth-token");
  assert.equal(values.size, 0);
  assert.equal(await storage.getItem("auth-token"), null);
});
test("a failed token write leaves the previously committed session readable", async () => {
  const values = new Map<string, string>();
  let fail = false;
  const storage = createChunkedStorage({
    async getItemAsync(key) {
      return values.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      if (fail && key.endsWith(".1")) throw new Error("Keychain unavailable");
      values.set(key, value);
    },
    async deleteItemAsync(key) {
      values.delete(key);
    },
  });
  await storage.setItem("auth-token", "previous");
  fail = true;
  await assert.rejects(
    storage.setItem("auth-token", "new".repeat(400)),
    /Keychain/,
  );
  assert.equal(await storage.getItem("auth-token"), "previous");
  assert.equal(values.size, 2);
});
