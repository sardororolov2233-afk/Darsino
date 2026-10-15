import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMigrations, supabaseFixture } from "./supabaseFixture";
const ids = {
  tutor: "20000000-0000-4000-8000-000000000031",
  student: "10000000-0000-4000-8000-000000000031",
  mod: "30000000-0000-4000-8000-000000000031",
};
test(
  "Postgres permits free approved-teacher clubs, keeps lesson prices protected and preserves admission control",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      for (const id of Object.values(ids))
        await db.query("insert into auth.users(id) values($1)", [id]);
      const as = async (id: string, command?: Record<string, unknown>) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
        const { rows } = await db.query<{ result: any }>(
          command
            ? "select public.darsino_mutate($1::jsonb) result"
            : "select public.darsino_snapshot() result",
          command ? [JSON.stringify({ ...command, actorId: id })] : [],
        );
        return rows[0].result;
      };
      const profile = {
        name: "Klub Test",
        city: "Toshkent",
        area: "Yunusobod",
        interests: ["Ingliz tili"],
        goal: "IELTS",
      };
      const tutor = {
        subjects: ["Ingliz tili"],
        specialty: "IELTS",
        experience: 3,
        proof: "Diplom 12345",
        bio: "Ingliz tili bo‘yicha guruh darslari",
        price: 90000,
        modes: ["Onlayn"],
        availability: ["14:00"],
      };
      await as(ids.tutor, { type: "profile", role: "tutor", profile, tutor });
      await as(ids.student, { type: "profile", profile });
      await db.exec("reset role");
      await db.query(
        "update public.darsino_profiles set role='moderator',onboarded=true where id=$1",
        [ids.mod],
      );
      const offering = {
        title: "Bepul Speaking klub",
        subject: "Ingliz tili",
        type: "group",
        capacity: 10,
        price: 0,
        mode: "Onlayn",
        area: "Yunusobod",
        location: "https://example.com/club",
        days: "Doimiy klub",
        benefits: ["O‘qi klubi"],
        sessions: [
          { startsAt: "2099-01-01T10:00:00Z", endsAt: "2099-01-01T11:00:00Z" },
        ],
      };
      await assert.rejects(
        as(ids.tutor, { type: "offering", offering }),
        /tasdiqlanishi/,
      );
      await as(ids.mod, {
        type: "moderate",
        tutorId: ids.tutor,
        decision: "approved",
        note: "Tekshirildi",
      });
      const published = await as(ids.tutor, { type: "offering", offering });
      const club = published.market.offerings.find(
        (g: any) => g.id === published.id,
      );
      assert.equal(club.price, 0);
      assert.equal(club.students, 0);
      assert.equal(club.published, true);
      await assert.rejects(
        as(ids.tutor, {
          type: "offering",
          offering: { ...offering, benefits: [] },
        }),
        /narxni/,
      );
      await assert.rejects(
        as(ids.tutor, {
          type: "offering",
          offering: { ...offering, price: -1 },
        }),
        /narxni/,
      );
      await assert.rejects(
        as(ids.tutor, {
          type: "tutor-profile",
          profile: { ...tutor, price: 0 },
        }),
        /Narx/,
      );
      const request = await as(ids.student, {
        type: "request",
        request: {
          kind: "group",
          tutorId: ids.tutor,
          groupId: club.id,
          price: 50000,
        },
      });
      assert.equal(request.market.applications[0].price, 0);
      assert.equal(request.market.enrollments.length, 0);
      await as(ids.tutor, {
        type: "decide",
        requestId: request.id,
        decision: "approved",
        note: "Xush kelibsiz",
      });
      const student = await as(ids.student);
      assert.ok(
        student.market.enrollments.some(
          (e: any) => e.offeringId === club.id && e.active,
        ),
      );
      await db.exec("reset role");
      await db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610150001_free_clubs.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.equal(
        (
          await db.query<{ n: number }>(
            "select count(*)::int n from public.darsino_enrollments",
          )
        ).rows[0].n,
        1,
      );
    } finally {
      await db.close();
    }
  },
);
