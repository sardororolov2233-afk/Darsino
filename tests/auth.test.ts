import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPasswordAuth,
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

test("password signup confirms matching credentials and normalizes only the email", async () => {
  const calls: { method: string; args: unknown }[] = [];
  const data = { user: { id: "created-user" }, session: null };
  const client = {
    auth: {
      signUp: async (args: unknown) => {
        calls.push({ method: "signUp", args });
        return { data, error: null };
      },
      signInWithOtp: async () => {
        assert.fail("Password signup must not request an email code");
      },
      verifyOtp: async () => {
        assert.fail("Password signup must not verify an email code");
      },
    },
  } as unknown as SupabaseClient;
  const auth = createPasswordAuth(client);
  assert.equal(normalizeEmail("  Sardor@Example.com "), "sardor@example.com");
  assert.ok(validEmail("sardor+study@example.com"));
  await assert.rejects(
    auth.signUp("not-an-email", "safe password", "safe password"),
    /To‘g‘ri email/,
  );
  await assert.rejects(
    auth.signUp("sardor@example.com", "1234567", "1234567"),
    /kamida 8/,
  );
  await assert.rejects(
    auth.signUp("sardor@example.com", "safe password", "different password"),
    /mos kelmadi/,
  );
  await assert.rejects(
    auth.signUp("sardor@example.com", "  exact pass  ", "exact pass"),
    /mos kelmadi/,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    await auth.signUp(
      " Sardor@Example.com ",
      "  exact pass  ",
      "  exact pass  ",
    ),
    data,
  );
  assert.equal(
    await auth.signUp("sardor@example.com", "12345678", "12345678"),
    data,
  );
  assert.deepEqual(calls, [
    {
      method: "signUp",
      args: { email: "sardor@example.com", password: "  exact pass  " },
    },
    {
      method: "signUp",
      args: { email: "sardor@example.com", password: "12345678" },
    },
  ]);
});

test("password login preserves credentials and supports existing shorter passwords without OTP", async () => {
  const calls: unknown[] = [];
  const data = {
    user: { id: "returning-user" },
    session: { access_token: "test-session" },
  };
  const client = {
    auth: {
      signInWithPassword: async (args: unknown) => {
        calls.push(args);
        return { data, error: null };
      },
      signInWithOtp: async () => {
        assert.fail("Password login must not request an email code");
      },
      verifyOtp: async () => {
        assert.fail("Password login must not verify an email code");
      },
    },
  } as unknown as SupabaseClient;
  const auth = createPasswordAuth(client);
  await assert.rejects(auth.signIn("invalid", "password"), /To‘g‘ri email/);
  await assert.rejects(
    auth.signIn("sardor@example.com", ""),
    /Parolingizni kiriting/,
  );
  assert.equal(calls.length, 0);
  assert.equal(await auth.signIn(" SARDOR@Example.com ", " short "), data);
  assert.equal(await auth.signIn("sardor@example.com", "123456"), data);
  assert.deepEqual(calls, [
    { email: "sardor@example.com", password: " short " },
    { email: "sardor@example.com", password: "123456" },
  ]);
});

test("managed Auth errors prevent password signup or login from reporting success", async () => {
  const client = {
    auth: {
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Registration unavailable" },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      }),
    },
  } as unknown as SupabaseClient;
  const auth = createPasswordAuth(client);
  await assert.rejects(
    auth.signUp("sardor@example.com", "safe password", "safe password"),
    /Registration unavailable/,
  );
  await assert.rejects(
    auth.signIn("sardor@example.com", "wrong password"),
    /Invalid login credentials/,
  );
});

test("stable managed Auth error codes use translated password and duplicate-email messages", async () => {
  let signupCode = "user_already_exists";
  const client = {
    auth: {
      signUp: async () => ({
        data: { user: null, session: null },
        error: { code: signupCode, message: "Provider duplicate detail" },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: {
          code: "invalid_credentials",
          message: "Provider credentials detail",
        },
      }),
    },
  } as unknown as SupabaseClient;
  const auth = createPasswordAuth(client);
  await assert.rejects(auth.signIn("sardor@example.com", "wrong password"), {
    message: "Email yoki parol noto‘g‘ri.",
  });
  for (const code of ["user_already_exists", "email_exists"]) {
    signupCode = code;
    await assert.rejects(
      auth.signUp("sardor@example.com", "safe password", "safe password"),
      {
        message:
          "Bu email bilan akkaunt mavjud. Kirish bo‘limidan foydalaning.",
      },
    );
  }
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
