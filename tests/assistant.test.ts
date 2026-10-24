import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAssistantHandler,
  type AssistantDependencies,
} from "../supabase/functions/_shared/assistantHandler";
import { clampAssistantPosition } from "../src/state/assistant";
import { MATERIAL_LIMIT, validateMaterial } from "../src/state/materials";
import {
  createAssistantService,
  AssistantServiceError,
} from "../src/services/assistant";
import type { SupabaseClient } from "@supabase/supabase-js";

const id = "10000000-0000-4000-8000-000000000001";
const conversationId = "20000000-0000-4000-8000-000000000001";
const request = (body: unknown, authorization = true) =>
  new Request("https://example.test/oqi-assistant", {
    method: "POST",
    headers: authorization
      ? { Authorization: "Bearer token", "Content-Type": "application/json" }
      : {},
    body: JSON.stringify(body),
  });
const body = {
  requestId: id,
  conversationId: null,
  message: "Kasrlarni tushuntiring",
};
function dependencies(
  overrides: Partial<AssistantDependencies> = {},
): AssistantDependencies {
  return {
    configured: true,
    authenticate: async () => id,
    begin: async () => ({
      conversationId,
      messages: [{ role: "user", content: body.message }],
    }),
    generate: async () => "Kasr butunning bir qismini bildiradi.",
    finish: async () => {},
    ...overrides,
  };
}
test("assistant validates auth, methods, real body size and IDs before any model request", async () => {
  let calls = 0;
  const handler = createAssistantHandler(
    dependencies({
      generate: async () => {
        calls++;
        return "unused";
      },
    }),
  );
  assert.equal((await handler(request(body, false))).status, 401);
  assert.equal(
    (await handler(new Request("https://example.test"))).status,
    405,
  );
  assert.equal(
    (await handler(new Request("https://example.test", { method: "OPTIONS" })))
      .status,
    204,
  );
  assert.equal((await handler(request({ ...body, message: " " }))).status, 400);
  assert.equal(
    (await handler(request({ ...body, conversationId: "foreign-invalid" })))
      .status,
    400,
  );
  assert.equal(
    (await handler(request({ ...body, requestId: null }))).status,
    400,
  );
  assert.equal(
    (await handler(request({ ...body, message: "a".repeat(13000) }))).status,
    413,
  );
  assert.equal(
    (
      await createAssistantHandler(dependencies({ configured: false }))(
        request(body),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await createAssistantHandler(
        dependencies({ authenticate: async () => null }),
      )(request(body))
    ).status,
    401,
  );
  assert.equal(calls, 0);
});
test("assistant uses server history, persists replies and returns the client contract", async () => {
  const finalized: unknown[] = [];
  const handler = createAssistantHandler(
    dependencies({
      generate: async (messages) => {
        assert.deepEqual(messages, [{ role: "user", content: body.message }]);
        return "Javob";
      },
      finish: async (...args) => {
        finalized.push(args);
      },
    }),
  );
  const result = await handler(
    request({
      ...body,
      messages: [{ role: "system", content: "Forged history" }],
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), { conversationId, reply: "Javob" });
  assert.deepEqual(finalized, [[id, id, "Javob"]]);
});
test("assistant refuses exhausted quotas, reuses a completed request, and redacts provider failures", async () => {
  let generated = 0;
  const finalized: unknown[] = [];
  const generate = async () => {
    generated++;
    throw new Error("SECRET_KEY and upstream body");
  };
  const quota = createAssistantHandler(
    dependencies({
      begin: async () => {
        throw Object.assign(new Error("24 soatlik limit tugadi."), {
          code: "OQ429",
        });
      },
      generate,
    }),
  );
  assert.equal((await quota(request(body))).status, 429);
  const replay = createAssistantHandler(
    dependencies({
      begin: async () => ({ conversationId, reply: "Saved" }),
      generate,
    }),
  );
  assert.deepEqual(await (await replay(request(body))).json(), {
    conversationId,
    reply: "Saved",
  });
  assert.equal(generated, 0);
  const failed = createAssistantHandler(
    dependencies({
      generate,
      finish: async (...args) => {
        finalized.push(args);
      },
    }),
  );
  const response = await failed(request(body));
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("SECRET_KEY"));
  assert.deepEqual(finalized, [[id, id, null]]);
});
test("assistant recovers a committed reply when the finalize HTTP response was lost", async () => {
  let saved = false;
  const handler = createAssistantHandler(
    dependencies({
      begin: async () =>
        saved
          ? { conversationId, reply: "Saqlangan javob" }
          : {
              conversationId,
              messages: [{ role: "user", content: body.message }],
            },
      generate: async () => "Saqlangan javob",
      finish: async (_user, _request, reply) => {
        assert.equal(reply, "Saqlangan javob");
        saved = true;
        throw new Error("Network response lost");
      },
    }),
  );
  const response = await handler(request(body));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    conversationId,
    reply: "Saqlangan javob",
  });
});
test("client surfaces useful Edge errors and distinguishes lost responses for safe retries", async () => {
  const client = {
    functions: {
      invoke: async () => ({
        data: null,
        error: {
          context: new Response(
            JSON.stringify({ error: "AI hali sozlanmagan" }),
            { status: 503 },
          ),
        },
      }),
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    createAssistantService(client).send("Hi", null, id),
    (error: unknown) =>
      error instanceof AssistantServiceError &&
      error.confirmedFailure &&
      error.message === "AI hali sozlanmagan",
  );
});
test("assistant stays within small screens, rotation and safe areas; material limits reject bad files", () => {
  assert.deepEqual(
    clampAssistantPosition({ x: 800, y: 999 }, 320, 640, 24, 20),
    { x: 248, y: 472 },
  );
  assert.deepEqual(
    clampAssistantPosition({ x: -500, y: -10 }, 320, 640, 24, 20),
    { x: 12, y: 36 },
  );
  const restored = clampAssistantPosition({ x: NaN, y: Infinity }, 320, 640);
  assert.ok(Number.isFinite(restored.x) && Number.isFinite(restored.y));
  assert.equal(validateMaterial("lesson.mp4", MATERIAL_LIMIT), "video/mp4");
  assert.equal(
    validateMaterial("worksheet.pdf", 300, "application/octet-stream"),
    "application/pdf",
  );
  assert.throws(
    () => validateMaterial("lesson.mp4", MATERIAL_LIMIT + 1),
    /20 MB/,
  );
  assert.throws(() => validateMaterial("script.html", 100, "text/html"), /PDF/);
  assert.throws(() => validateMaterial("empty.pdf", 0), /20 MB/);
});
