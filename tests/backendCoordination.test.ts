import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { executeMutation } from "../src/services/mutations";
import { createSnapshotGate } from "../src/services/snapshotGate";
import { subscribeToMarketplace } from "../src/services/realtime";
import { bindActorClient } from "../src/services/actorClient";
import { createFileService } from "../src/services/files";

const key = "70000000-0000-4000-8000-000000000001";
const actor = "10000000-0000-4000-8000-000000000001";
const command = {
  type: "message" as const,
  conversationId: "dm:student:tutor",
  text: "Darsga tayyorman",
};
const noWait = async () => {};

test("avatar RPCs and every upload stage retain the original actor header after an account switch", async () => {
  let session = {
    user: { id: actor },
    access_token: "synthetic-actor-a-token",
  };
  let reads = 0;
  const source = {
    auth: {
      getSession: async () => {
        reads++;
        return { data: { session }, error: null };
      },
    },
  };
  const requests: { path: string; authorization: string | null }[] = [];
  const asset = {
    id: "70000000-0000-4000-8000-000000000002",
    ownerId: actor,
    purpose: "avatar",
    bucketId: "darsino-avatars",
    objectPath: `${actor}/avatar.jpg`,
    originalName: "avatar.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 4,
    state: "ready",
    conversationId: null,
    offeringId: null,
    createdAt: "2026-10-24T00:00:00Z",
  };
  const bound = await bindActorClient(source, actor, (options) => {
    assert.deepEqual(options.auth, {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    });
    return createClient(
      "https://bound-client.example.test",
      "synthetic-anon-key",
      {
        ...options,
        global: {
          ...options.global,
          fetch: async (input, init) => {
            const path = new URL(String(input)).pathname;
            requests.push({
              path,
              authorization: new Headers(init?.headers).get("Authorization"),
            });
            return new Response(
              JSON.stringify(
                path.includes("/storage/")
                  ? { Key: asset.objectPath }
                  : path.endsWith("darsino_set_avatar")
                    ? null
                    : asset,
              ),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          },
        },
      },
    );
  });
  // The application’s shared Auth session is now B. The bound client must
  // never ask that shared session for a token again, even for avatar removal.
  session = {
    user: { id: "account-b" },
    access_token: "synthetic-actor-b-token",
  };
  const files = createFileService(bound);
  await files.setAvatar(null);
  await files.upload({
    purpose: "avatar",
    originalName: "avatar.jpg",
    mimeType: "image/jpeg",
    bytes: new ArrayBuffer(4),
  });
  await files.setAvatar(asset.id);
  assert.equal(reads, 1);
  assert.equal(requests.length, 5);
  assert.deepEqual(
    requests.map((request) => request.path),
    [
      "/rest/v1/rpc/darsino_set_avatar",
      "/rest/v1/rpc/darsino_prepare_upload",
      `/storage/v1/object/${asset.bucketId}/${asset.objectPath}`,
      "/rest/v1/rpc/darsino_finalize_upload",
      "/rest/v1/rpc/darsino_set_avatar",
    ],
  );
  assert.ok(
    requests.every(
      (request) => request.authorization === "Bearer synthetic-actor-a-token",
    ),
  );
});

test("an actor mismatch or missing session prevents construction of a file client", async () => {
  let builds = 0;
  for (const session of [
    null,
    { user: { id: "account-b" }, access_token: "synthetic-token" },
  ]) {
    await assert.rejects(
      bindActorClient(
        {
          auth: {
            getSession: async () => ({ data: { session }, error: null }),
          },
        },
        actor,
        () => {
          builds++;
          return {};
        },
      ),
      /Akkaunt o‘zgardi/,
    );
  }
  assert.equal(builds, 0);
});

test("a committed mutation with a lost reply is replayed with one payload and one key", async () => {
  const requests: unknown[] = [];
  const committed = new Map<string, { id: string }>();
  let ids = 0;
  const result = await executeMutation(command, actor, {
    createId: () => {
      ids++;
      return key;
    },
    wait: noWait,
    send: async (payload) => {
      requests.push(structuredClone(payload));
      const previous = committed.get(payload.idempotencyKey);
      if (previous) return { data: previous, error: null };
      committed.set(payload.idempotencyKey, { id: "original-message" });
      throw new TypeError("Failed to fetch");
    },
  });
  assert.deepEqual(result, { id: "original-message" });
  assert.equal(committed.size, 1);
  assert.equal(ids, 1);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.deepEqual(requests[0], {
    ...command,
    actorId: actor,
    idempotencyKey: key,
  });
});

test("transport errors returned by Supabase are retried, with a bounded attempt count", async () => {
  let attempts = 0;
  const keys: string[] = [];
  await assert.rejects(
    executeMutation(command, actor, {
      createId: () => key,
      wait: noWait,
      attempts: 99,
      send: async (payload) => {
        attempts++;
        keys.push(payload.idempotencyKey);
        return {
          data: null,
          error: { message: "TypeError: Network request failed", code: "" },
          status: 0,
        };
      },
    }),
    /Network request failed/,
  );
  assert.equal(attempts, 3);
  assert.deepEqual(keys, [key, key, key]);
});

test("database validation, permission and idempotency conflicts are never retried", async () => {
  for (const code of ["P0001", "42501", "23505", "40001"]) {
    let attempts = 0;
    await assert.rejects(
      executeMutation(command, actor, {
        createId: () => key,
        wait: noWait,
        send: async () => {
          attempts++;
          return {
            data: null,
            error: { message: "Amal rad etildi", code },
            status: 500,
          };
        },
      }),
      /Amal rad etildi/,
    );
    assert.equal(attempts, 1);
  }
});

test("an account change cancels pending retries and rejects an old successful reply", async () => {
  let active = true;
  let attempts = 0;
  await assert.rejects(
    executeMutation(command, actor, {
      createId: () => key,
      isCurrent: () => active,
      wait: async () => {
        active = false;
      },
      send: async () => {
        attempts++;
        throw new TypeError("Failed to fetch");
      },
    }),
    /Akkaunt o‘zgardi/,
  );
  assert.equal(attempts, 1);
  active = true;
  await assert.rejects(
    executeMutation(command, actor, {
      createId: () => key,
      isCurrent: () => active,
      send: async () => {
        active = false;
        return { data: { id: "old-account-message" }, error: null };
      },
    }),
    /Akkaunt o‘zgardi/,
  );
});

test("separate mutation intents get different keys and caller edits do not change retries", async () => {
  const payloads: { text?: string; idempotencyKey: string }[] = [];
  const value = { ...command };
  let count = 0;
  const send = async (payload: { idempotencyKey: string }) => {
    payloads.push(structuredClone(payload));
    if (payloads.length === 1) {
      value.text = "Caller changed the draft";
      return { data: null, error: { message: "Bad gateway" }, status: 502 };
    }
    return { data: { id: "saved" }, error: null };
  };
  await executeMutation(value, actor, {
    send,
    createId: () => `key-${++count}`,
    wait: noWait,
  });
  await executeMutation(value, actor, {
    send,
    createId: () => `key-${++count}`,
    wait: noWait,
  });
  assert.equal(payloads[0].text, command.text);
  assert.deepEqual(payloads[0], payloads[1]);
  assert.notEqual(payloads[1].idempotencyKey, payloads[2].idempotencyKey);
  assert.equal(payloads[2].text, value.text);
});

test("a newer snapshot cannot be overwritten by an older snapshot or stale error", () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 0 };
  const oldRefresh = gate.begin(current);
  const newRefresh = gate.begin(current);
  let state = "initial";
  if (gate.accept(newRefresh, current)) state = "new messages";
  if (gate.accept(oldRefresh, current)) state = "old messages";
  assert.equal(state, "new messages");
  assert.equal(gate.accept(oldRefresh, current), false);
});

test("snapshot results and errors from a previous account or mutation are discarded", () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 0 };
  const previousAccount = gate.begin(current);
  current.epoch++;
  assert.equal(gate.accept(previousAccount, current), false);
  const beforeMutation = gate.begin(current);
  current.revision++;
  assert.equal(gate.accept(beforeMutation, current), false);
  const afterMutation = gate.begin(current);
  assert.equal(gate.accept(afterMutation, current), true);
});

test("starting a newer read does not discard a useful first response before it finishes", () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 0 };
  const first = gate.begin(current);
  const second = gate.begin(current);
  assert.equal(gate.accept(first, current), true);
  assert.equal(gate.accept(second, current), true);
});

test("a delayed mutation reply cannot replace a newer settled refresh", async () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 0 };
  let release!: (result: { data: { id: string }; error: null }) => void;
  let ticket: ReturnType<typeof gate.begin> | undefined;
  let state = "initial";
  current.revision++;
  const operation = executeMutation<{ id: string }>(command, actor, {
    createId: () => key,
    onAttempt: () => {
      ticket = gate.begin(current);
    },
    send: () =>
      new Promise<{ data: { id: string }; error: null }>((resolve) => {
        release = resolve;
      }),
  });
  const refresh = gate.begin(current);
  if (gate.accept(refresh, current)) state = "newer external message";
  release({ data: { id: "committed-message" }, error: null });
  const result = await operation;
  const apply = ticket && gate.accept(ticket, current);
  current.revision++;
  if (apply) state = "older mutation snapshot";
  assert.equal(result.id, "committed-message");
  assert.equal(state, "newer external message");
  assert.equal(gate.accept(refresh, current), false);
});

test("a retry dispatched after a settled refresh can apply its newly committed snapshot", async () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 1 };
  let ticket: ReturnType<typeof gate.begin> | undefined;
  let attempts = 0;
  let state = "initial";
  const operation = await executeMutation(command, actor, {
    createId: () => key,
    onAttempt: () => {
      ticket = gate.begin(current);
    },
    wait: async () => {
      const refresh = gate.begin(current);
      if (gate.accept(refresh, current)) state = "before retry committed";
    },
    send: async () => {
      if (++attempts === 1) throw new TypeError("Failed to fetch");
      return { data: { id: "committed-on-retry" }, error: null };
    },
  });
  const apply = ticket && gate.accept(ticket, current);
  current.revision++;
  if (apply) state = "snapshot includes retry commit";
  assert.equal(operation.id, "committed-on-retry");
  assert.equal(attempts, 2);
  assert.equal(state, "snapshot includes retry commit");
});

test("a delayed mutation snapshot does not clear a newer useful refresh error", () => {
  const gate = createSnapshotGate();
  const current = { epoch: 1, revision: 1 };
  const mutation = gate.begin(current);
  const refresh = gate.begin(current);
  let syncError = "";
  if (gate.accept(refresh, current)) syncError = "Server bilan aloqa uzildi";
  const apply = gate.accept(mutation, current);
  current.revision++;
  if (apply) syncError = "";
  assert.equal(syncError, "Server bilan aloqa uzildi");
});

test("Realtime invalidates both received messages and messages sent on another device", () => {
  const filters: { table: string; filter: string }[] = [];
  const channel = {
    on: (_type: string, filter: { table: string; filter: string }) => {
      filters.push(filter);
      return channel;
    },
    subscribe: () => channel,
  };
  const client = {
    channel: () => channel,
    removeChannel: async () => {},
  } as unknown as SupabaseClient;
  const stop = subscribeToMarketplace(client, actor, () => {});
  assert.ok(
    filters.some(
      (item) =>
        item.table === "darsino_messages" &&
        item.filter === `sender_id=eq.${actor}`,
    ),
  );
  assert.ok(
    filters.some(
      (item) =>
        item.table === "darsino_messages" &&
        item.filter === `recipient_id=eq.${actor}`,
    ),
  );
  stop();
});
