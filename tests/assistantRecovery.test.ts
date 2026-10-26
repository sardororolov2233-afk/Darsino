import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAssistantHandler,
  type AssistantDependencies,
  type Reservation,
} from "../supabase/functions/_shared/assistantHandler";
import {
  AssistantServiceError,
  createAssistantService,
} from "../src/services/assistant";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

const user = "10000000-0000-4000-8000-000000000061";
const outsider = "10000000-0000-4000-8000-000000000062";
const requestId = "40000000-0000-4000-8000-000000000061";
const nextId = "40000000-0000-4000-8000-000000000062";
const conversationId = "50000000-0000-4000-8000-000000000061";
const message = "Kasrlarni tushuntiring";
const request = () =>
  new Request("https://example.test/oqi-assistant", {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body: JSON.stringify({ requestId, conversationId: null, message }),
  });

function dependencies(
  overrides: Partial<AssistantDependencies> = {},
): AssistantDependencies {
  return {
    configured: true,
    authenticate: async () => user,
    begin: async () => ({ conversationId, status: "reserved", messages: [] }),
    generate: async () => "Javob",
    finish: async () => {},
    ...overrides,
  };
}

test("assistant replays completed IDs and makes failed or expired IDs terminal without resetting quotas", async () => {
  const db = await supabaseFixture();
  const as = async (id = user, role = "authenticated") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
  };
  const begin = async (id: string, actor = user): Promise<Reservation> => {
    await as(actor);
    return (
      await db.query<{ value: Reservation }>(
        "select public.oqi_ai_begin_request($1,null,$2) value",
        [id, message],
      )
    ).rows[0].value;
  };
  try {
    await applyMigrations(db);
    for (const id of [user, outsider]) {
      await db.exec("reset role");
      await db.query("insert into auth.users(id) values($1)", [id]);
      await as(id);
      await db.query("select public.darsino_mutate($1)", [
        JSON.stringify({
          type: "profile",
          actorId: id,
          profile: {
            name: "Assistant Test",
            city: "Toshkent",
            area: "Yunusobod",
            interests: ["Matematika"],
            goal: "DTM",
          },
        }),
      ]);
    }
    assert.equal((await begin(requestId)).status, "reserved");
    assert.equal((await begin(requestId)).status, "pending");
    await assert.rejects(begin(nextId), { code: "OQ429" });

    await db.exec("reset role");
    await db.query(
      "update public.oqi_ai_requests set created_at=now()-interval '70 seconds' where id=$1",
      [requestId],
    );
    assert.equal((await begin(requestId)).status, "expired");
    assert.equal((await begin(requestId)).status, "failed");
    await db.exec("reset role");
    const expired = await db.query<{ status: string; count: number }>(
      "select status,(select count(*)::int from public.oqi_ai_requests where user_id=$2) count from public.oqi_ai_requests where id=$1",
      [requestId, user],
    );
    assert.deepEqual(expired.rows, [{ status: "failed", count: 1 }]);

    assert.equal((await begin(nextId)).status, "reserved");
    await as(user, "service_role");
    await db.query("select public.oqi_ai_finish_request($1,$2,$3)", [
      user,
      nextId,
      "Saqlangan javob",
    ]);
    const completed = await begin(nextId);
    assert.equal(completed.status, "completed");
    assert.equal(completed.reply, "Saqlangan javob");
    await assert.rejects(begin(nextId, outsider), { code: "OQ403" });

    // Replaying failed IDs cannot repeatedly consume model work under one row.
    // The original attempt also continues to count toward the rolling day cap.
    await db.exec("reset role");
    await db.query(
      "insert into public.oqi_ai_requests(id,user_id,conversation_id,status,created_at) select gen_random_uuid(),$1,$2,'failed',now()-interval '2 minutes' from generate_series(1,28)",
      [user, completed.conversationId],
    );
    assert.equal((await begin(requestId)).status, "failed");
    await assert.rejects(begin("40000000-0000-4000-8000-000000000063"), {
      code: "OQ429",
    });
    await as();
    await assert.rejects(
      db.query("select public.oqi_ai_begin_request(null,null,null)"),
      { code: "OQ400" },
    );
  } finally {
    await db.close();
  }
});

test("active retries wait, terminal retries clear the client request ID, and completed retries skip model work", async () => {
  for (const [status, httpStatus] of [
    ["pending", 429],
    ["expired", 409],
    ["failed", 409],
    ["completed", 200],
  ] as const) {
    let generated = 0;
    let finished = 0;
    const handler = createAssistantHandler(
      dependencies({
        begin: async () => ({
          conversationId,
          status,
          ...(status === "completed" ? { reply: "Saved" } : {}),
        }),
        generate: async () => {
          generated++;
          return "Must not generate";
        },
        finish: async () => {
          finished++;
        },
      }),
    );
    const response = await handler(request());
    assert.equal(response.status, httpStatus, status);
    assert.equal(generated, 0, status);
    assert.equal(finished, 0, status);
    if (httpStatus === 200) {
      assert.deepEqual(await response.json(), {
        conversationId,
        reply: "Saved",
      });
    } else {
      const client = {
        functions: {
          invoke: async () => ({
            data: null,
            error: { context: response },
          }),
        },
      } as unknown as SupabaseClient;
      await assert.rejects(
        createAssistantService(client).send(message, null, requestId),
        (error: unknown) =>
          error instanceof AssistantServiceError &&
          error.confirmedFailure === (httpStatus === 409),
      );
    }
  }
});

test("assistant maps explicit database error codes and redacts every underlying error message", async () => {
  for (const [code, status] of [
    ["OQ400", 400],
    ["OQ403", 403],
    ["OQ429", 429],
    ["08006", 503],
    ["PGRST202", 503],
    [undefined, 503],
  ] as const) {
    let generated = 0;
    const handler = createAssistantHandler(
      dependencies({
        begin: async () => {
          throw Object.assign(
            new Error("INTERNAL_SECRET database-host limit kuting"),
            { code },
          );
        },
        generate: async () => {
          generated++;
          return "Unused";
        },
      }),
    );
    const response = await handler(request());
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes("INTERNAL_SECRET"));
    assert.equal(generated, 0);
  }
});
