import { validateTeaching } from "../src/state/onboarding";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  normalizeTutorPhone,
  validateTutorApplication,
} from "../src/state/tutorApplication";
import {
  applyMigrations,
  seedTutorCertificate,
  supabaseFixture,
} from "./supabaseFixture";

test("tutor contact numbers normalize without requiring email or phone OTP", () => {
  assert.equal(normalizeTutorPhone("90 123-45-67"), "+998901234567");
  assert.doesNotThrow(() =>
    validateTeaching({
      specialty: "IELTS",
      subjects: ["Ingliz tili"],
      experience: 2,
      proof: "",
      bio: "IELTS uchun amaliy darslar",
      price: 90000,
      modes: ["Onlayn"],
      availability: ["18:00"],
    }),
  );
  assert.equal(normalizeTutorPhone("998901234567"), "+998901234567");
  assert.equal(normalizeTutorPhone("+998 (90) 123-45-67"), "+998901234567");
  for (const phone of ["", "123", "hello", "+0000000000", "++998901234567"])
    assert.throws(() => normalizeTutorPhone(phone), /Telefon/);
  assert.throws(
    () => validateTutorApplication({ contactPhone: "+998901234567" } as any),
    /Sertifikat/,
  );
});

test(
  "teacher application is atomic, private, required before approval and preserves approval on committed retry",
  { timeout: 60000 },
  async () => {
    const db = await supabaseFixture();
    try {
      await applyMigrations(db);
      const teacher = randomUUID(),
        peer = randomUUID(),
        moderator = randomUUID();
      for (const id of [teacher, peer, moderator])
        await db.query("insert into auth.users(id) values($1)", [id]);
      await db.query(
        "update public.darsino_profiles set role='moderator',onboarded=true where id=$1",
        [moderator],
      );
      const as = async (id: string) => {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          id,
        ]);
        await db.exec("set role authenticated");
      };
      const rpc = async (id: string, name: string, params: unknown[] = []) => {
        await as(id);
        return (
          await db.query<{ result: any }>(
            `select public.${name}(${params.map((_, i) => `$${i + 1}`).join(",")}) result`,
            params,
          )
        ).rows[0].result;
      };
      const mutate = (id: string, command: object) =>
        rpc(id, "darsino_mutate", [
          JSON.stringify({ actorId: id, ...command }),
        ]);
      const admin = async (sql: string, params: unknown[] = []) => {
        await db.exec("reset role");
        return db.query<Record<string, any>>(sql, params);
      };
      const profile = {
        name: "Ali Teacher",
        city: "Toshkent",
        area: "Yunusobod",
        goal: "IELTS",
        interests: ["Ingliz tili"],
      };
      const tutor = {
        subjects: ["Ingliz tili"],
        specialty: "IELTS",
        experience: 3,
        proof: "",
        bio: "IELTS bo‘yicha amaliy darslar",
        price: 90000,
        modes: ["Onlayn"],
        availability: ["18:00"],
      };
      const command = {
        type: "profile",
        role: "tutor",
        profile,
        tutor,
        idempotencyKey: randomUUID(),
      };
      await assert.rejects(mutate(teacher, command), /Telefon/);
      await assert.rejects(
        mutate(teacher, {
          ...command,
          tutor: { ...tutor, contactPhone: "+998901234567" },
        }),
        /Sertifikat/,
      );
      assert.equal(
        (
          await admin(
            "select onboarded from public.darsino_profiles where id=$1",
            [teacher],
          )
        ).rows[0].onboarded,
        false,
      );
      assert.equal(
        (await admin("select count(*)::int n from public.darsino_tutors"))
          .rows[0].n,
        0,
      );
      const own = await seedTutorCertificate(db, teacher),
        foreign = await seedTutorCertificate(db, peer);
      await assert.rejects(
        mutate(teacher, { ...command, tutor: { ...tutor, ...foreign } }),
        /Sertifikat/,
      );
      await assert.rejects(
        mutate(teacher, {
          ...command,
          tutor: { ...tutor, ...own, contactPhone: "998901234567" },
        }),
        /Telefon/,
      );
      const valid = { ...command, tutor: { ...tutor, ...own } };
      const pending = await mutate(teacher, valid);
      assert.equal(pending.user.role, "tutor");
      assert.equal(pending.user.onboarded, true);
      assert.equal(pending.market.tutorProfiles[0].verification, "pending");
      assert.equal(
        pending.market.tutorProfiles[0].contactPhone,
        own.contactPhone,
      );
      assert.equal(
        pending.market.tutorDocuments[0].fileId,
        own.certificateFileId,
      );
      assert.equal(pending.market.tutorDocuments[0].status, "pending");
      assert.equal(
        (
          await admin(
            "select count(*)::int n from public.darsino_notifications where user_id=$1",
            [moderator],
          )
        ).rows[0].n,
        1,
      );
      const raw = (
        await admin("select data from public.darsino_tutors where user_id=$1", [
          teacher,
        ])
      ).rows[0].data;
      assert.equal("contactPhone" in raw, false);
      assert.equal("certificateFileId" in raw, false);
      const publish = { type: "offering", offering: {} };
      await assert.rejects(mutate(teacher, publish), /moderator/);
      await assert.rejects(
        mutate(teacher, {
          type: "moderate",
          tutorId: teacher,
          decision: "approved",
          note: "",
        }),
        /moderator/,
      );
      await assert.rejects(
        rpc(peer, "darsino_get_file", [own.certificateFileId]),
        /Fayl|ruxsat/,
      );
      const review = await rpc(moderator, "darsino_snapshot");
      assert.equal(
        review.market.tutorProfiles[0].contactPhone,
        own.contactPhone,
      );
      assert.equal(
        review.market.files.some((f: any) => f.id === own.certificateFileId),
        true,
      );
      const approved = await mutate(moderator, {
        type: "moderate",
        tutorId: teacher,
        decision: "approved",
        note: "Sertifikat tekshirildi",
      });
      assert.equal(approved.market.tutorProfiles[0].verification, "approved");
      assert.equal(approved.market.tutorDocuments[0].status, "approved");
      const retry = await mutate(teacher, valid);
      assert.equal(retry.market.tutorProfiles[0].verification, "approved");
      assert.equal(retry.market.tutorDocuments[0].status, "approved");
      assert.equal(
        (
          await admin(
            "select count(*)::int n from public.darsino_notifications where user_id=$1",
            [moderator],
          )
        ).rows[0].n,
        1,
      );
      await mutate(peer, {
        type: "profile",
        profile: { ...profile, name: "Peer Student" },
      });
      const publicView = await rpc(peer, "darsino_snapshot");
      const publicTeacher = publicView.market.tutorProfiles.find(
        (p: any) => p.userId === teacher,
      );
      assert.equal("contactPhone" in publicTeacher, false);
      assert.equal("certificateFileId" in publicTeacher, false);
      assert.equal("applicationSubmittedAt" in publicTeacher, false);
      assert.equal(publicView.market.tutorDocuments.length, 0);
      await as(peer);
      await assert.rejects(
        db.query("select * from public.oqi_tutor_applications"),
        /permission denied/,
      );
      for (const call of [
        "select public.darsino_snapshot_tutor_base()",
        "select public.darsino_mutate_tutor_base('{}')",
        "select public.darsino_mutate_idempotent_base('{}')",
      ])
        await assert.rejects(db.query(call), /permission denied/);
      await assert.rejects(
        mutate(teacher, { type: "tutor-profile", profile: tutor }),
        /Telefon/,
      );
      await assert.rejects(
        mutate(teacher, {
          type: "tutor-profile",
          profile: {
            ...tutor,
            ...own,
            certificateFileId: foreign.certificateFileId,
          },
        }),
        /Sertifikat/,
      );
      const resubmitted = await mutate(teacher, {
        type: "tutor-profile",
        profile: { ...tutor, ...own, contactPhone: "+998909876543" },
        idempotencyKey: randomUUID(),
      });
      assert.equal(resubmitted.market.tutorProfiles[0].verification, "pending");
      await assert.rejects(mutate(teacher, publish), /moderator/);
      const rejected = await mutate(moderator, {
        type: "moderate",
        tutorId: teacher,
        decision: "rejected",
        note: "Yangi sertifikat kerak",
      });
      assert.equal(rejected.market.tutorDocuments[0].status, "rejected");
      assert.equal(rejected.market.tutorProfiles[0].verification, "rejected");
      await assert.rejects(
        rpc(peer, "darsino_prepare_upload", [
          "verification",
          "bad.pdf",
          "application/pdf",
          4,
        ]),
        /Repetitor/,
      );
      await assert.rejects(
        rpc(teacher, "darsino_prepare_upload", [
          "verification",
          "bad.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          4,
        ]),
        /turi yoki hajmi/,
      );
      await assert.rejects(
        rpc(teacher, "darsino_prepare_upload", [
          "verification",
          "big.pdf",
          "application/pdf",
          10485761,
        ]),
        /turi yoki hajmi/,
      );
      // An existing approved teacher survives the additive upgrade. A legacy
      // pending teacher must supply the newly required evidence before approval.
      const legacy = randomUUID();
      await admin("insert into auth.users(id) values($1)", [legacy]);
      await admin(
        "update public.darsino_profiles set role='tutor',onboarded=true where id=$1",
        [legacy],
      );
      await admin(
        "insert into public.darsino_tutors(user_id,verification,data) values($1,'pending',$2)",
        [legacy, JSON.stringify(tutor)],
      );
      await assert.rejects(
        mutate(moderator, {
          type: "moderate",
          tutorId: legacy,
          decision: "approved",
          note: "",
        }),
        /telefon raqami va sertifikatini/,
      );
    } finally {
      await db.close();
    }
  },
);
