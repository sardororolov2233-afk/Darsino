import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateGoal,
  validatePreferences,
  validateName,
} from "../src/state/onboarding";
import {
  applyMigrations,
  seedTutorCertificate,
  supabaseFixture,
} from "./supabaseFixture";

test("onboarding requires conditional subjects, explicit preferences, matching district and full name", () => {
  for (const goal of [
    "Milliy sertifikat",
    "Universitetga kirish",
    "Malakaviy ko‘nikmaga ega bo‘lish",
  ])
    assert.throws(() => validateGoal(goal, []), /fan yoki/);
  validateGoal("IELTS olish", []);
  validateGoal("CEFR olish", []);
  assert.throws(() => validateGoal("IELTS olish", [], true), /fan yoki/);
  validateGoal("Universitetga kirish", ["Matematika", "Fizika"]);
  assert.throws(() => validateGoal("", []), /Maqsadingizni/);
  const preferences = {
    city: "Toshkent shahri",
    area: "Yunusobod tumani",
    studyMode: "Oflayn" as const,
    studySupport: "Mustaqil" as const,
  };
  validatePreferences(preferences);
  assert.throws(
    () => validatePreferences({ ...preferences, city: "Andijon viloyati" }),
    /tumanni/,
  );
  assert.throws(
    () => validatePreferences({ ...preferences, studySupport: undefined }),
    /tayyorlanishni/,
  );
  assert.throws(() => validateName("Sardor", ""), /to‘liq/);
});

test("Postgres persists private onboarding preferences atomically, rejects invalid values and preserves legacy edits", async () => {
  const db = await supabaseFixture();
  const student = "10000000-0000-4000-8000-000000000071";
  const teacher = "20000000-0000-4000-8000-000000000071";
  const profile = {
    name: "Sardor Sinov",
    city: "Toshkent shahri",
    area: "Yunusobod tumani",
    goal: "Universitetga kirish",
    interests: ["Matematika", "Fizika"],
    studyMode: "Oflayn",
    studySupport: "Ustoz bilan",
  };
  const as = async (id: string) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const save = async (
    id: string,
    command: Record<string, unknown>,
  ): Promise<any> => {
    await as(id);
    return (
      await db.query<{ value: any }>(
        "select public.darsino_mutate($1::jsonb) value",
        [JSON.stringify({ ...command, actorId: id })],
      )
    ).rows[0].value;
  };
  try {
    await applyMigrations(db);
    await db.query("insert into auth.users(id) values($1),($2)", [
      student,
      teacher,
    ]);
    const initial = await save(student, { type: "profile", profile });
    assert.equal(initial.user.studyMode, "Oflayn");
    assert.equal(initial.user.studySupport, "Ustoz bilan");
    assert.deepEqual(initial.user.interests, ["Matematika", "Fizika"]);
    await assert.rejects(
      save(student, {
        type: "profile",
        profile: { ...profile, name: "Should rollback", studyMode: "invalid" },
      }),
      /Ta’lim shakli/,
    );
    const { studyMode, studySupport, ...oldProfile } = profile;
    const edited = await save(student, {
      type: "profile",
      profile: { ...oldProfile, name: "Sardor Yangi" },
    });
    assert.equal(edited.user.studyMode, "Oflayn");
    assert.equal(edited.user.studySupport, "Ustoz bilan");
    await save(teacher, {
      type: "profile",
      role: "tutor",
      profile,
      tutor: {
        ...(await seedTutorCertificate(db, teacher)),
        subjects: ["Matematika"],
        specialty: "Matematika",
        experience: 2,
        proof: "Diplom 123",
        bio: "Universitet uchun darslar",
        price: 90000,
        modes: ["Onlayn"],
        availability: ["18:00"],
      },
    });
    await db.exec("reset role");
    await db.query(
      "update public.darsino_tutors set verification='approved' where user_id=$1",
      [teacher],
    );
    await as(student);
    const snapshot = (
      await db.query<{ value: any }>("select public.darsino_snapshot() value")
    ).rows[0].value;
    const publicTeacher = snapshot.market.users.find(
      (u: any) => u.id === teacher,
    );
    assert.ok(publicTeacher);
    assert.equal(publicTeacher.studySupport, undefined);
    await assert.rejects(
      db.query("select public.darsino_mutate_core($1::jsonb)", [
        JSON.stringify({ type: "profile", profile }),
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.exec(
      await readFile(
        new URL("../supabase/Darsino_Supabase_setup.sql", import.meta.url),
        "utf8",
      ),
    );
    await as(student);
    const restored = (
      await db.query<{ value: any }>("select public.darsino_snapshot() value")
    ).rows[0].value;
    assert.equal(restored.user.studyMode, "Oflayn");
    assert.equal(restored.user.name, "Sardor Yangi");
  } finally {
    await db.close();
  }
});
