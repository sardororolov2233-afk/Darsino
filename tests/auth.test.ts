import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmailAuth,
  createOAuthCallbackHandler,
  normalizeEmail,
  validEmail,
} from "../src/services/authFlow";
import {
  demoEmailAccount,
  demoMarketplace,
  DEMO_MODERATOR_EMAIL,
  DEMO_TUTOR_EMAIL,
} from "../src/state/demo";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";

test("email OTP normalizes addresses and never invokes phone/SMS verification", async () => {
  const calls: any[] = [];
  const client = {
    auth: {
      signInWithOtp: async (args: unknown) => {
        calls.push(args);
        return { error: null };
      },
      verifyOtp: async (args: unknown) => {
        calls.push(args);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const auth = createEmailAuth(client);
  assert.equal(normalizeEmail("  Sardor@Example.com "), "sardor@example.com");
  assert.ok(validEmail("sardor+study@example.com"));
  await assert.rejects(auth.request("not-an-email"), /To‘g‘ri email/);
  assert.equal(calls.length, 0);
  await auth.request(" Sardor@Example.com ");
  await auth.verify(" Sardor@Example.com ", "12345678");
  assert.deepEqual(calls, [
    { email: "sardor@example.com", options: { shouldCreateUser: true } },
    { email: "sardor@example.com", token: "12345678", type: "email" },
  ]);
  await assert.rejects(auth.verify("sardor@example.com", "123"), /6–8/);
});

test("OAuth accepts only the configured PKCE callback and exchanges duplicate events once", async () => {
  const codes: string[] = [];
  const client = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        codes.push(code);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const handler = createOAuthCallbackHandler(client, "darsino://auth/callback");
  assert.equal(await handler("other://auth/callback?code=stolen"), false);
  assert.equal(await handler("darsino://other/callback?code=stolen"), false);
  assert.equal(await handler("darsino://auth/other?code=stolen"), false);
  assert.equal(
    await handler(
      "darsino://auth/callback#access_token=untrusted&refresh_token=untrusted",
    ),
    false,
  );
  assert.deepEqual(
    await Promise.all([
      handler("darsino://auth/callback?code=valid"),
      handler("darsino://auth/callback?code=valid"),
    ]),
    [true, true],
  );
  assert.deepEqual(codes, ["valid"]);
  await assert.rejects(
    handler(
      "darsino://auth/callback?error=access_denied&error_description=sensitive_payload",
    ),
    /tugallanmadi/,
  );
  const web = createOAuthCallbackHandler(client, "https://darsino.test/");
  assert.equal(await web("https://evil.test/?code=bad"), false);
  assert.equal(await web("https://darsino.test/?code=web-valid"), true);
});

test("email demo preserves existing teacher/moderator relationships and cannot elevate a new account", () => {
  const source = demoMarketplace();
  const teacher = demoEmailAccount(source, DEMO_TUTOR_EMAIL, "student");
  assert.equal(teacher.user.id, "dilnoza");
  assert.equal(teacher.user.role, "tutor");
  const moderator = demoEmailAccount(source, DEMO_MODERATOR_EMAIL, "student");
  assert.equal(moderator.user.role, "moderator");
  const fresh = demoEmailAccount(source, "new@example.com", "moderator");
  assert.equal(fresh.user.role, "student");
  assert.equal(fresh.user.phone, "");
  assert.equal(
    demoEmailAccount(fresh.market, " NEW@EXAMPLE.COM ", "tutor").user.id,
    fresh.user.id,
  );
  const legacy = {
    ...source,
    users: source.users.map((u) => ({ ...u, email: undefined })),
  };
  assert.equal(
    demoEmailAccount(legacy, DEMO_TUTOR_EMAIL, "student").user.id,
    "dilnoza",
  );
});

test(
  "verified email works without a phone, remains private, and protects avatar RPCs",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const id = "50000000-0000-4000-8000-000000000001";
      const unconfirmed = "50000000-0000-4000-8000-000000000002";
      await db.query(
        "insert into auth.users(id,email,phone,phone_confirmed_at) values($1,'sardor@example.com',null,null)",
        [id],
      );
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at,phone) values($1,'unconfirmed@example.com',null,'998901234567')",
        [unconfirmed],
      );
      const as = async (actor: string) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          actor,
        ]);
        await db.exec("set role authenticated");
      };
      await as(id);
      const snapshot = (
        await db.query<{ data: any }>("select public.darsino_snapshot() data")
      ).rows[0].data;
      assert.equal(snapshot.user.email, "sardor@example.com");
      assert.equal(snapshot.user.phone, "");
      assert.equal(snapshot.user.role, "student");
      const file = (
        await db.query<{ data: any }>(
          "select public.darsino_prepare_upload('avatar','avatar.jpg','image/jpeg',4) data",
        )
      ).rows[0].data;
      assert.equal(file.ownerId, id);
      await as(unconfirmed);
      await assert.rejects(
        db.query("select public.darsino_snapshot()"),
        /Tasdiqlangan email/,
      );
      await assert.rejects(
        db.query(
          "select public.darsino_prepare_upload('avatar','avatar.jpg','image/jpeg',4)",
        ),
        /Tasdiqlangan email/,
      );
      await db.exec("reset role");
      await db.query(
        "update public.darsino_profiles set role='tutor',name='Teacher',onboarded=true where id=$1",
        [id],
      );
      await db.query(
        "insert into public.darsino_tutors(user_id,verification,data) values($1,'approved','{}')",
        [id],
      );
      await db.query(
        'update auth.users set email_confirmed_at=now(),raw_user_meta_data=\'{"role":"moderator"}\' where id=$1',
        [unconfirmed],
      );
      await as(unconfirmed);
      const viewer = (
        await db.query<{ data: any }>("select public.darsino_snapshot() data")
      ).rows[0].data;
      assert.equal(viewer.user.role, "student");
      assert.equal(viewer.market.users.find((u: any) => u.id === id).email, "");
      await db.exec("reset role");
      await db.query(
        "update auth.users set email='new@example.com' where id=$1",
        [id],
      );
      const updated = (
        await db.query<{ email: string; name: string; role: string }>(
          "select email,name,role from public.darsino_profiles where id=$1",
          [id],
        )
      ).rows[0];
      assert.deepEqual(updated, {
        email: "new@example.com",
        name: "Teacher",
        role: "tutor",
      });
    } finally {
      await db.close();
    }
  },
);
