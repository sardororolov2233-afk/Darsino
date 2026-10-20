import {
  dmId,
  timeLabel,
  uid,
  type Marketplace,
  type MarketCommand,
  type TutorInput,
} from "./domain";

import {
  canRemind,
  monthLabel,
  paymentMonth,
  validPaymentMonth,
} from "./payments";

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function validateTutor(p: TutorInput) {
  ensure(
    p.subjects.length && p.subjects.every((s) => s.trim()),
    "Kamida bitta mutaxassislikni tanlang.",
  );
  ensure(
    Number.isFinite(p.experience) && p.experience >= 0 && p.experience <= 60,
    "Tajriba 0–60 yil oralig‘ida bo‘lsin.",
  );
  ensure(
    p.proof.trim().length >= 5 && p.bio.trim().length >= 10,
    "Tasdiqlash ma’lumoti va darslaringiz haqida yozing.",
  );
  ensure(
    p.specialty.trim().length >= 2,
    "Mutaxassislik yo‘nalishini kiriting.",
  );
  ensure(Number.isFinite(p.price) && p.price > 0, "Dars narxini kiriting.");
  ensure(
    p.modes.length > 0 &&
      p.modes.every((v) => ["Onlayn", "Oflayn"].includes(v)),
    "Dars shaklini tanlang.",
  );
  ensure(
    p.availability.length &&
      p.availability.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)),
    "Jadval vaqti HH:MM shaklida bo‘lsin.",
  );
}
export function applyMarketCommand(
  source: Marketplace,
  actorId: string,
  c: MarketCommand,
  now = new Date(),
): { market: Marketplace; id?: string } {
  const m: Marketplace = JSON.parse(JSON.stringify(source));
  const actor = m.users.find((u) => u.id === actorId);
  ensure(actor, "Avval hisobingizga kiring.");
  const tutor = m.tutorProfiles.find((p) => p.userId === actorId);
  const teacher = () =>
    ensure(
      actor.onboarded &&
        actor.role === "tutor" &&
        tutor?.verification === "approved",
      "Profil moderator tomonidan tasdiqlanishi kerak.",
    );
  const student = () =>
    ensure(
      actor.onboarded && actor.role === "student",
      "Ushbu amal o‘quvchi uchun.",
    );
  const notify = (
    userId: string,
    title: string,
    body: string,
    offeringId?: string,
  ) =>
    m.notifications.unshift({
      id: uid("notice"),
      userId,
      title,
      body,
      read: false,
      createdAt: now.toISOString(),
      offeringId,
    });
  const owned = (id: string) => {
    const o = m.offerings.find((o) => o.id === id);
    ensure(o?.tutorId === actorId, "Bu darsni boshqarish huquqingiz yo‘q.");
    return o;
  };
  let id: string | undefined;
  switch (c.type) {
    case "profile": {
      const p = c.profile;
      ensure(
        p.name.trim().length >= 2 &&
          p.city.trim().length >= 2 &&
          p.area.trim().length >= 2 &&
          p.interests.length &&
          p.goal.trim(),
        "Ism, shahar, hudud, fan va maqsadni to‘ldiring.",
      );
      ensure(
        !c.role || ["student", "tutor"].includes(c.role),
        "Rol noto‘g‘ri.",
      );
      if (p.studyMode !== undefined || p.studySupport !== undefined)
        ensure(
          ["Onlayn", "Oflayn"].includes(p.studyMode || "") &&
            ["Mustaqil", "Ustoz bilan"].includes(p.studySupport || ""),
          "Ta’lim shakli va tayyorgarlik usulini tanlang.",
        );
      if (c.role && !actor.onboarded) actor.role = c.role;
      ensure(
        actor.onboarded || actor.role !== "tutor" || c.tutor,
        "Repetitor profilini to‘ldiring.",
      );
      Object.assign(actor, p, {
        name: p.name.trim(),
        city: p.city.trim(),
        area: p.area.trim(),
        onboarded: true,
      });
      if (actor.role === "tutor" && c.tutor) {
        validateTutor(c.tutor);
        m.tutorProfiles = [
          ...m.tutorProfiles.filter((p) => p.userId !== actorId),
          {
            ...c.tutor,
            userId: actorId,
            verification: "pending",
            moderationNote: "",
          },
        ];
        m.users
          .filter((u) => u.role === "moderator")
          .forEach((u) => notify(u.id, "Yangi repetitor arizasi", actor.name));
      }
      break;
    }
    case "tutor-profile": {
      ensure(actor.role === "tutor", "Repetitor hisobiga kiring.");
      validateTutor(c.profile);
      m.tutorProfiles = [
        ...m.tutorProfiles.filter((p) => p.userId !== actorId),
        {
          ...c.profile,
          userId: actorId,
          verification: "pending",
          moderationNote: "",
        },
      ];
      m.users
        .filter((u) => u.role === "moderator")
        .forEach((u) =>
          notify(u.id, "Repetitor profili tekshiruvda", actor.name),
        );
      break;
    }
    case "moderate": {
      ensure(
        actor.role === "moderator",
        "Faqat moderator profilni tasdiqlaydi.",
      );
      const target = m.tutorProfiles.find((p) => p.userId === c.tutorId);
      ensure(
        target?.verification === "pending",
        "Tekshiriladigan profil topilmadi.",
      );
      ensure(
        c.decision !== "rejected" || c.note.trim().length >= 3,
        "Rad etish sababini yozing.",
      );
      target.verification = c.decision;
      target.moderationNote = c.note.trim();
      notify(
        target.userId,
        c.decision === "approved"
          ? "Profilingiz tasdiqlandi"
          : "Profilni tuzatish kerak",
        c.note || "Endi dars va guruh yaratishingiz mumkin.",
      );
      break;
    }
    case "offering": {
      teacher();
      const o = c.offering;
      ensure(
        o.title.trim().length >= 3 && tutor!.subjects.includes(o.subject),
        "Dars nomi va profilingizdagi fanni tanlang.",
      );
      ensure(
        Number.isInteger(o.capacity) &&
          o.capacity >= 1 &&
          o.capacity <= 100 &&
          Number.isFinite(o.price) &&
          (o.price > 0 ||
            (o.price === 0 &&
              o.type === "group" &&
              o.benefits.includes("O‘qi klubi"))),
        "O‘rinlar soni 1–100 bo‘lsin. Faqat klub guruhining narxi 0 bo‘lishi mumkin.",
      );
      ensure(
        o.location.trim().length >= 3 &&
          o.area.trim() &&
          ["Onlayn", "Oflayn"].includes(o.mode),
        "Hudud, manzil va dars shaklini kiriting.",
      );
      ensure(
        o.sessions.length > 0 && o.sessions.length <= 50,
        "Jadvalga 1–50 ta dars kiriting.",
      );
      for (const [index, s] of o.sessions.entries()) {
        ensure(
          new Date(s.startsAt).getTime() > now.getTime() &&
            new Date(s.endsAt).getTime() > new Date(s.startsAt).getTime(),
          "Kelajakdagi sana va to‘g‘ri davomiylikni tanlang.",
        );
        ensure(
          ![
            ...m.sessions.filter((v) =>
              m.offerings.some(
                (g) => g.id === v.offeringId && g.tutorId === actorId,
              ),
            ),
            ...o.sessions.slice(0, index),
          ].some(
            (v) =>
              new Date(v.startsAt) < new Date(s.endsAt) &&
              new Date(v.endsAt) > new Date(s.startsAt),
          ),
          "Bu vaqtda boshqa darsingiz bor.",
        );
      }
      id = uid("class");
      const first = o.sessions[0],
        duration = Math.round(
          (new Date(first.endsAt).getTime() -
            new Date(first.startsAt).getTime()) /
            60000,
        );
      m.offerings.unshift({
        ...o,
        id,
        tutorId: actorId,
        tutor: actor.name,
        capacity: o.type === "individual" ? 1 : o.capacity,
        students: 0,
        reservedSeats: 0,
        spots: o.type === "individual" ? 1 : o.capacity,
        published: true,
        time: timeLabel(first.startsAt),
        lessons: o.sessions.length,
        duration,
      });
      m.sessions.push(
        ...o.sessions.map((s) => ({
          ...s,
          id: uid("session"),
          offeringId: id!,
          title: o.title,
          location: o.location,
          mode: o.mode,
        })),
      );
      break;
    }
    case "request": {
      student();
      const r = c.request;
      ensure(
        ["group", "lesson"].includes(r.kind),
        "Xona va tadbir arizalari keyingi versiyada qo‘shiladi.",
      );
      ensure(
        m.tutorProfiles.some(
          (p) => p.userId === r.tutorId && p.verification === "approved",
        ),
        "Tasdiqlangan ustozni tanlang.",
      );
      if (r.groupId) {
        const g = m.offerings.find(
          (o) => o.id === r.groupId && o.published && o.tutorId === r.tutorId,
        );
        ensure(g, "Ochiq guruh topilmadi.");
        ensure(
          m.sessions.some(
            (s) => s.offeringId === g.id && new Date(s.startsAt) > now,
          ),
          "Guruhning kelajakdagi darsi yo‘q.",
        );
        ensure(
          !m.enrollments.some(
            (e) => e.offeringId === g.id && e.studentId === actorId && e.active,
          ),
          "Siz bu guruhga qo‘shilgansiz.",
        );
        ensure(
          g.reservedSeats +
            m.enrollments.filter((e) => e.offeringId === g.id && e.active)
              .length <
            g.capacity,
          "Guruhda bo‘sh o‘rin qolmagan.",
        );
      } else
        ensure(
          r.startsAt &&
            r.endsAt &&
            new Date(r.startsAt).getTime() > now.getTime() &&
            new Date(r.endsAt).getTime() > new Date(r.startsAt).getTime(),
          "Kelajakdagi dars vaqtini tanlang.",
        );
      const same = m.applications.find(
        (a) =>
          a.studentId === actorId &&
          a.status === "pending" &&
          a.kind === r.kind &&
          a.tutorId === r.tutorId &&
          (r.groupId ? a.groupId === r.groupId : a.startsAt === r.startsAt),
      );
      if (same) {
        id = same.id;
        break;
      }
      id = uid("application");
      m.applications.unshift({
        ...r,
        id,
        studentId: actorId,
        status: "pending",
        note: "",
        createdAt: now.toISOString(),
        conversationId: dmId(actorId, r.tutorId),
      });
      notify(
        r.tutorId,
        "Yangi o‘quvchi arizasi",
        `${actor.name} · ${r.title}`,
        r.groupId,
      );
      break;
    }
    case "decide": {
      teacher();
      const r = m.applications.find((a) => a.id === c.requestId);
      ensure(r?.tutorId === actorId, "Bu arizani boshqarish huquqingiz yo‘q.");
      ensure(r.status === "pending", "Arizaga allaqachon javob berilgan.");
      ensure(
        ["approved", "rejected"].includes(c.decision) &&
          (c.decision === "approved" || c.note.trim().length >= 3),
        "Rad etish sababini yozing.",
      );
      if (c.decision === "approved") {
        let g = m.offerings.find((o) => o.id === r.groupId);
        if (!g) {
          ensure(
            !r.groupId && r.startsAt && r.endsAt && new Date(r.startsAt) > now,
            "Dars vaqti topilmadi yoki o‘tib ketgan.",
          );
          ensure(
            !m.sessions.some(
              (s) =>
                m.offerings.some(
                  (o) => o.id === s.offeringId && o.tutorId === actorId,
                ) &&
                new Date(s.startsAt) < new Date(r.endsAt!) &&
                new Date(s.endsAt) > new Date(r.startsAt!),
            ),
            "Bu vaqtda boshqa darsingiz bor.",
          );
          const classId = uid("individual");
          g = {
            id: classId,
            title: r.title,
            subject: r.subtitle,
            tutorId: actorId,
            tutor: actor.name,
            type: "individual",
            published: false,
            reservedSeats: 0,
            students: 0,
            capacity: 1,
            spots: 1,
            days: "Individual dars",
            time: r.time,
            price: r.price || 0,
            mode: tutor!.modes[0],
            area: actor.area,
            location:
              tutor!.modes[0] === "Onlayn"
                ? "Onlayn dars — havolani ustoz yuboradi"
                : actor.area,
            benefits: [],
            lessons: 1,
            duration: Math.round(
              (new Date(r.endsAt).getTime() - new Date(r.startsAt).getTime()) /
                60000,
            ),
          };
          m.offerings.push(g);
          m.sessions.push({
            id: uid("session"),
            offeringId: classId,
            title: r.title,
            startsAt: r.startsAt,
            endsAt: r.endsAt,
            location: g.location,
            mode: g.mode,
          });
          r.groupId = classId;
        }
        ensure(
          m.sessions.some(
            (s) => s.offeringId === g.id && new Date(s.startsAt) > now,
          ),
          "Guruhning kelajakdagi darsi yo‘q.",
        );
        ensure(
          g.reservedSeats +
            m.enrollments.filter((e) => e.offeringId === g.id && e.active)
              .length <
            g.capacity,
          "Guruhdagi oxirgi o‘rin band bo‘ldi.",
        );
        ensure(
          !m.enrollments.some(
            (e) =>
              e.offeringId === g.id && e.studentId === r.studentId && e.active,
          ),
          "O‘quvchi allaqachon guruhda.",
        );
        m.enrollments.push({
          id: uid("enrollment"),
          offeringId: g.id,
          studentId: r.studentId,
          active: true,
          createdAt: now.toISOString(),
        });
      }
      r.status = c.decision;
      r.note = c.note.trim();
      notify(
        r.studentId,
        c.decision === "approved"
          ? "Arizangiz tasdiqlandi"
          : "Arizangiz rad etildi",
        c.note || r.title,
        r.groupId,
      );
      break;
    }
    case "cancel": {
      student();
      const r = m.applications.find((r) => r.id === c.requestId);
      ensure(r?.studentId === actorId, "Ariza topilmadi.");
      ensure(
        r.status === "pending",
        "Faqat kutilayotgan ariza bekor qilinadi.",
      );
      r.status = "cancelled";
      notify(r.tutorId, "Ariza bekor qilindi", actor.name, r.groupId);
      break;
    }
    case "attendance": {
      teacher();
      const s = m.sessions.find((s) => s.id === c.sessionId);
      ensure(s, "Dars topilmadi.");
      owned(s.offeringId);
      ensure(
        new Date(s.startsAt) <= now,
        "Dars boshlanmasdan davomat belgilanmaydi.",
      );
      ensure(
        m.enrollments.some(
          (e) =>
            e.offeringId === s.offeringId &&
            e.studentId === c.studentId &&
            e.active,
        ),
        "O‘quvchi bu darsda qatnashmaydi.",
      );
      m.attendance = [
        ...m.attendance.filter(
          (a) => a.sessionId !== s.id || a.studentId !== c.studentId,
        ),
        { sessionId: s.id, studentId: c.studentId, status: c.status },
      ];
      break;
    }
    case "payment": {
      teacher();
      const group = owned(c.offeringId);
      ensure(validPaymentMonth(c.month), "Hisobot oyi noto‘g‘ri.");
      ensure(typeof c.paid === "boolean", "To‘lov holati noto‘g‘ri.");
      const previous = m.payments?.find(
        (p) =>
          p.offeringId === group.id &&
          p.studentId === c.studentId &&
          p.month === c.month,
      );
      const enrollment = m.enrollments.find(
        (e) => e.offeringId === group.id && e.studentId === c.studentId,
      );
      ensure(
        enrollment &&
          (enrollment.active || previous) &&
          paymentMonth(new Date(enrollment.createdAt)) <= c.month,
        "O‘quvchi bu oyda guruhda qatnashmaydi.",
      );
      const amount = previous?.amount ?? group.price;
      ensure(
        Number.isFinite(amount) && amount > 0 && amount <= 100000000,
        "Bepul guruh uchun to‘lov belgilanmaydi.",
      );
      if (previous?.paid === c.paid || (!previous && !c.paid)) break;
      const payment = {
        offeringId: group.id,
        studentId: c.studentId,
        month: c.month,
        amount,
        paid: c.paid,
        paidAt: c.paid ? now.toISOString() : null,
        remindedAt: previous?.remindedAt ?? null,
        updatedAt: now.toISOString(),
      };
      m.payments = [
        ...(m.payments || []).filter(
          (p) =>
            p.offeringId !== group.id ||
            p.studentId !== c.studentId ||
            p.month !== c.month,
        ),
        payment,
      ];
      notify(
        c.studentId,
        c.paid ? "To‘lov qayd etildi" : "To‘lov belgisi o‘zgartirildi",
        `${group.title} · ${monthLabel(c.month)} · ${amount.toLocaleString("uz-UZ")} so‘m. ${c.paid ? "Ustoz to‘ladi deb belgiladi." : "Ustoz to‘lov belgisini bekor qildi."}`,
        group.id,
      );
      break;
    }
    case "payment-reminder": {
      teacher();
      const group = owned(c.offeringId);
      ensure(validPaymentMonth(c.month), "Hisobot oyi noto‘g‘ri.");
      const members = m.enrollments.filter(
        (e) =>
          e.offeringId === group.id &&
          e.active &&
          paymentMonth(new Date(e.createdAt)) <= c.month &&
          (!c.studentId || e.studentId === c.studentId),
      );
      ensure(members.length, "Faol o‘quvchi topilmadi.");
      let sent = 0;
      for (const e of members) {
        const previous = m.payments?.find(
          (p) =>
            p.offeringId === group.id &&
            p.studentId === e.studentId &&
            p.month === c.month,
        );
        const amount = previous?.amount ?? group.price;
        if (amount <= 0 || !canRemind(previous, now)) continue;
        const payment = {
          offeringId: group.id,
          studentId: e.studentId,
          month: c.month,
          amount,
          paid: false,
          paidAt: null,
          remindedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        m.payments = [
          ...(m.payments || []).filter(
            (p) =>
              p.offeringId !== group.id ||
              p.studentId !== e.studentId ||
              p.month !== c.month,
          ),
          payment,
        ];
        notify(
          e.studentId,
          "Oylik to‘lov eslatmasi",
          `${group.title} · ${monthLabel(c.month)} uchun ${amount.toLocaleString("uz-UZ")} so‘m to‘lovni amalga oshirishingizni so‘raymiz. To‘lagan bo‘lsangiz, ustozingizga xabar bering.`,
          group.id,
        );
        sent++;
      }
      ensure(
        sent,
        "Yuboriladigan eslatma yo‘q. To‘lov qilingan yoki oxirgi 24 soatda eslatilgan.",
      );
      break;
    }
    case "review": {
      student();
      const s = m.sessions.find((s) => s.id === c.sessionId);
      ensure(
        s && new Date(s.endsAt) < now,
        "Fikr dars tugagandan keyin qoldiriladi.",
      );
      ensure(
        m.attendance.some(
          (a) =>
            a.sessionId === s.id &&
            a.studentId === actorId &&
            a.status === "present",
        ),
        "Fikr uchun darsda qatnashgan bo‘lishingiz kerak.",
      );
      ensure(
        !m.reviews.some((r) => r.sessionId === s.id && r.studentId === actorId),
        "Bu dars uchun fikr qoldirgansiz.",
      );
      ensure(
        Number.isInteger(c.rating) &&
          c.rating >= 1 &&
          c.rating <= 5 &&
          c.text.trim().length >= 3 &&
          c.text.length <= 1000,
        "1–5 ball va 3–1000 belgili fikr kiriting.",
      );
      const o = m.offerings.find((o) => o.id === s.offeringId)!;
      m.reviews.push({
        id: uid("review"),
        sessionId: s.id,
        tutorId: o.tutorId,
        studentId: actorId,
        rating: c.rating,
        text: c.text.trim(),
        createdAt: now.toISOString(),
      });
      break;
    }
    case "message": {
      const text = c.text.trim();
      ensure(
        text.length > 0 && text.length <= 2000,
        "Xabar 1–2000 belgi bo‘lsin.",
      );
      const [kind, studentId, tutorId] = c.conversationId.split(":");
      ensure(
        kind === "dm" && (actorId === studentId || actorId === tutorId),
        "Suhbatda qatnashish huquqingiz yo‘q.",
      );
      ensure(
        m.users.some((u) => u.id === studentId && u.role === "student") &&
          m.tutorProfiles.some(
            (p) => p.userId === tutorId && p.verification === "approved",
          ),
        "Suhbat ishtirokchilari topilmadi.",
      );
      m.messages.push({
        id: uid("message"),
        conversationId: c.conversationId,
        senderId: actorId,
        recipientId: actorId === studentId ? tutorId : studentId,
        text,
        mine: true,
        time: timeLabel(now.toISOString()),
      });
      break;
    }
    case "favorite": {
      const favorites = m.favorites[actorId] || [];
      m.favorites[actorId] = favorites.includes(c.id)
        ? favorites.filter((id) => id !== c.id)
        : [...favorites, c.id];
      break;
    }
    case "read-notifications":
      m.notifications
        .filter((n) => n.userId === actorId)
        .forEach((n) => (n.read = true));
      break;
    case "update-session": {
      teacher();
      const s = m.sessions.find((s) => s.id === c.sessionId);
      ensure(s, "Dars topilmadi.");
      const g = owned(s.offeringId);
      ensure(
        new Date(s.startsAt) > now &&
          new Date(c.startsAt) > now &&
          new Date(c.endsAt) > new Date(c.startsAt),
        "Faqat kelgusi dars vaqtini o‘zgartiring.",
      );
      ensure(
        !m.sessions.some(
          (v) =>
            v.id !== s.id &&
            m.offerings.some(
              (o) => o.id === v.offeringId && o.tutorId === actorId,
            ) &&
            new Date(v.startsAt) < new Date(c.endsAt) &&
            new Date(v.endsAt) > new Date(c.startsAt),
        ),
        "Bu vaqtda boshqa darsingiz bor.",
      );
      s.startsAt = c.startsAt;
      s.endsAt = c.endsAt;
      const first = m.sessions
        .filter((v) => v.offeringId === g.id)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      g.time = timeLabel(first.startsAt);
      m.enrollments
        .filter((e) => e.offeringId === g.id && e.active)
        .forEach((e) =>
          notify(
            e.studentId,
            "Dars vaqti o‘zgardi",
            `${g.title} · yangi jadvalni tekshiring.`,
            g.id,
          ),
        );
      break;
    }
    case "offering-visibility": {
      teacher();
      const g = owned(c.offeringId);
      ensure(typeof c.published === "boolean", "E’lon holati noto‘g‘ri.");
      g.published = c.published;
      break;
    }
    case "remove-participant": {
      teacher();
      const g = owned(c.offeringId);
      const e = m.enrollments.find(
        (e) => e.offeringId === g.id && e.studentId === c.studentId && e.active,
      );
      ensure(e, "Qatnashchi topilmadi.");
      e.active = false;
      notify(
        e.studentId,
        "Guruh tarkibi o‘zgardi",
        `${g.title} guruhi bo‘yicha ustozga yozing.`,
        g.id,
      );
      break;
    }
  }
  return { market: m, id };
}
