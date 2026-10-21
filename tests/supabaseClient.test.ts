import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFileService, FileUploadError } from "../src/services/files";
import { subscribeToMarketplace } from "../src/services/realtime";
import type { FileAsset } from "../src/state/domain";

const asset: FileAsset = {
  id: "file-uuid",
  ownerId: "user-uuid",
  purpose: "avatar",
  bucketId: "darsino-avatars",
  objectPath: "user-uuid/file-uuid.png",
  originalName: "avatar.png",
  mimeType: "image/png",
  sizeBytes: 4,
  state: "ready",
  conversationId: null,
  offeringId: null,
  createdAt: "2026-10-14T00:00:00Z",
};

function mockClient(fail?: string) {
  const calls: { name: string; args?: any }[] = [];
  const result = (name: string, data: unknown) => ({
    data,
    error: fail === name ? { message: `${name} failed` } : null,
  });
  const client = {
    rpc: async (name: string, args: any) => {
      calls.push({ name, args });
      return result(name, asset);
    },
    storage: {
      from: (bucket: string) => {
        assert.equal(bucket, asset.bucketId);
        return {
          upload: async (
            path: string,
            bytes: ArrayBuffer,
            options: unknown,
          ) => {
            calls.push({ name: "upload", args: { path, bytes, options } });
            return result("upload", {});
          },
          createSignedUrl: async (path: string, seconds: number) => {
            calls.push({ name: "sign", args: { path, seconds } });
            return result("sign", {
              signedUrl: "https://example.com/private-signed-file",
            });
          },
          remove: async (paths: string[]) => {
            calls.push({ name: "remove", args: paths });
            return result("remove", []);
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { calls, files: createFileService(client) };
}

test("file client reserves a path, sends ArrayBuffer without overwrite and only then finalizes", async () => {
  const { files, calls } = mockClient();
  const bytes = new ArrayBuffer(4);
  await files.upload({
    purpose: "avatar",
    originalName: "avatar.png",
    mimeType: "image/png",
    bytes,
  });
  assert.deepEqual(
    calls.map((c) => c.name),
    ["darsino_prepare_upload", "upload", "darsino_finalize_upload"],
  );
  assert.equal(calls[0].args.p_size_bytes, 4);
  assert.equal(calls[1].args.bytes, bytes);
  assert.equal(calls[1].args.options.upsert, false);
  assert.equal(calls[1].args.path, asset.objectPath);
  assert.equal(calls[0].args.p_conversation_id, null);
});

test("upload/finalize failures preserve the reservation for retry and never silently remove bytes", async () => {
  for (const failure of ["upload", "darsino_finalize_upload"]) {
    const { files, calls } = mockClient(failure);
    await assert.rejects(
      files.upload({
        purpose: "avatar",
        originalName: "avatar.png",
        mimeType: "image/png",
        bytes: new ArrayBuffer(4),
      }),
      (e: unknown) =>
        e instanceof FileUploadError &&
        e.asset.id === asset.id &&
        e.stage === (failure === "upload" ? "upload" : "finalize"),
    );
    assert.ok(!calls.some((c) => c.name === "remove"));
    if (failure === "upload")
      assert.ok(!calls.some((c) => c.name === "darsino_finalize_upload"));
  }
});

test("private URL checks metadata access before signing; failed Storage removal retains metadata", async () => {
  const { files, calls } = mockClient();
  assert.equal(
    await files.signedUrl(asset.id, 10000),
    "https://example.com/private-signed-file",
  );
  assert.deepEqual(
    calls.map((c) => c.name),
    ["darsino_get_file", "sign"],
  );
  assert.equal(calls[1].args.seconds, 300);
  const denied = mockClient("darsino_get_file");
  await assert.rejects(denied.files.signedUrl(asset.id), /failed/);
  assert.equal(denied.calls.length, 1);
  const failedRemove = mockClient("remove");
  await assert.rejects(failedRemove.files.remove(asset.id), /failed/);
  assert.deepEqual(
    failedRemove.calls.map((c) => c.name),
    ["darsino_begin_file_delete", "remove"],
  );
  const successfulRemove = mockClient();
  await successfulRemove.files.remove(asset.id);
  assert.deepEqual(
    successfulRemove.calls.map((c) => c.name),
    ["darsino_begin_file_delete", "remove", "darsino_forget_file"],
  );
});

test("Realtime coalesces a burst into one refresh and cancels queued work on account cleanup", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const callbacks: (() => void)[] = [];
  const filters: any[] = [];
  let removed = 0,
    refreshed = 0;
  const channel = {
    on: (_kind: string, filter: unknown, callback: () => void) => {
      filters.push(filter);
      callbacks.push(callback);
      return channel;
    },
    subscribe: (callback: (status: string) => void) => {
      callback("SUBSCRIBED");
      return channel;
    },
  };
  const client = {
    channel: () => channel,
    removeChannel: async () => {
      removed++;
    },
  } as unknown as SupabaseClient;
  const stop = subscribeToMarketplace(client, "user-uuid", () => refreshed++);
  callbacks.forEach((c) => c());
  t.mock.timers.tick(201);
  assert.equal(refreshed, 1);
  assert.equal(filters.length, 14);
  assert.ok(
    filters.some(
      (f) =>
        f.table === "darsino_group_invitations" &&
        f.filter === "student_id=eq.user-uuid",
    ),
  );
  assert.ok(
    filters.every(
      (f) => f.event !== "DELETE" && f.filter.endsWith("=eq.user-uuid"),
    ),
  );
  callbacks[0]();
  stop();
  t.mock.timers.tick(201);
  callbacks[0]();
  t.mock.timers.tick(201);
  assert.equal(refreshed, 1);
  assert.equal(removed, 1);
});
