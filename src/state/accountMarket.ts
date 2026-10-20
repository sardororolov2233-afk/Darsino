import {
  accountCommandTypes, areContacts, defaultPublicId, isBlocked, permits,
  readAccountSettings, validPublicId, type AccountCommand,
} from "./account";
import { uid, type Marketplace } from "./domain";

export function applyAccountCommand(
  market: Marketplace, actorId: string, command: { type: string }, now: Date,
): { market: Marketplace; id?: string } | undefined {
  if (!accountCommandTypes.has(command.type)) return;
  const c = command as AccountCommand;
  const actor = market.users.find((u) => u.id === actorId);
  if (!actor?.onboarded) throw new Error("Avval profilingizni to‘ldiring.");
  const ensure = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  const notify = (userId: string, title: string, body: string, offeringId?: string) =>
    market.notifications.unshift({
      id: uid("notice"), userId, title, body, offeringId, read: false,
      createdAt: now.toISOString(),
    });
  const peer = (peerId: string) => {
    const user = market.users.find((u) => u.id === peerId && u.onboarded);
    if (!user || user.id === actorId) throw new Error("Foydalanuvchi topilmadi.");
    return user;
  };
  const allowed = (peerId: string, policy: "invitePolicy" | "messagePolicy") => {
    ensure(!isBlocked(market, actorId, peerId), "Bu foydalanuvchi bilan aloqa cheklangan.");
    ensure(permits(readAccountSettings(market.accountSettings?.[peerId])[policy],
      areContacts(market, actorId, peerId)), "Foydalanuvchi bu amalni maxfiylik sozlamalarida cheklagan.");
  };
  let id: string | undefined;
  switch (c.type) {
    case "account-settings": {
      const settings = readAccountSettings(c.settings);
      ensure(validPublicId(c.publicId), "ID 5–24 ta kichik lotin harfi, raqam yoki pastki chiziqdan iborat bo‘lsin.");
      ensure(!market.users.some((u) => u.id !== actorId &&
        (u.publicId || defaultPublicId(u.id)) === c.publicId), "Bu ID band.");
      actor.publicId = c.publicId;
      market.accountSettings = { ...market.accountSettings, [actorId]: settings };
      break;
    }
    case "contact-request": {
      const target = peer(c.peerId);
      allowed(target.id, "messagePolicy");
      ensure(readAccountSettings(market.accountSettings?.[target.id]).discoverable ||
        areContacts(market, actorId, target.id), "Foydalanuvchi topilmadi.");
      ensure(!areContacts(market, actorId, target.id), "Bu foydalanuvchi kontaktlaringizda.");
      const previous = (market.contactRequests || []).find((r) => r.status === "pending" &&
        ((r.senderId === actorId && r.recipientId === target.id) ||
          (r.senderId === target.id && r.recipientId === actorId)));
      if (previous) { id = previous.id; break; }
      ensure((market.contactRequests || []).filter((r) => r.senderId === actorId &&
        Date.parse(r.createdAt) > now.getTime() - 86400000).length < 10,
      "Bugungi kontakt takliflari limiti tugadi.");
      id = uid("contact");
      (market.contactRequests ||= []).unshift({
        id, senderId: actorId, recipientId: target.id, status: "pending", createdAt: now.toISOString(),
      });
      notify(target.id, "Kontakt taklifi", actor.name);
      break;
    }
    case "contact-decide": {
      const request = market.contactRequests?.find((r) => r.id === c.requestId && r.recipientId === actorId);
      if (!request) throw new Error("Kontakt taklifi topilmadi.");
      if (request.status === (c.accept ? "accepted" : "declined")) break;
      ensure(request.status === "pending", "Taklifga allaqachon javob berilgan.");
      ensure(!isBlocked(market, actorId, request.senderId), "Bu foydalanuvchi bilan aloqa cheklangan.");
      request.status = c.accept ? "accepted" : "declined";
      if (c.accept) {
        market.contacts = (market.contacts || []).filter((r) =>
          !((r.userId === actorId && r.peerId === request.senderId) ||
            (r.userId === request.senderId && r.peerId === actorId)));
        market.contacts.push(
          { userId: actorId, peerId: request.senderId, createdAt: now.toISOString() },
          { userId: request.senderId, peerId: actorId, createdAt: now.toISOString() },
        );
        notify(request.senderId, "Kontakt taklifi qabul qilindi", actor.name);
      }
      break;
    }
    case "contact-remove": {
      peer(c.peerId);
      market.contacts = (market.contacts || []).filter((r) =>
        !((r.userId === actorId && r.peerId === c.peerId) ||
          (r.userId === c.peerId && r.peerId === actorId)));
      break;
    }
    case "block-user": {
      peer(c.peerId);
      ensure(typeof c.blocked === "boolean", "Blok holati noto‘g‘ri.");
      market.blocks = (market.blocks || []).filter((r) => !(r.userId === actorId && r.peerId === c.peerId));
      if (c.blocked) {
        market.blocks.push({ userId: actorId, peerId: c.peerId });
        market.contacts = (market.contacts || []).filter((r) =>
          !((r.userId === actorId && r.peerId === c.peerId) ||
            (r.userId === c.peerId && r.peerId === actorId)));
        for (const r of market.contactRequests || []) if (r.status === "pending" &&
          ((r.senderId === actorId && r.recipientId === c.peerId) ||
            (r.senderId === c.peerId && r.recipientId === actorId))) r.status = "cancelled";
        for (const r of market.groupInvitations || []) if (r.status === "pending" &&
          ((r.tutorId === actorId && r.studentId === c.peerId) ||
            (r.studentId === actorId && r.tutorId === c.peerId))) r.status = "cancelled";
      }
      break;
    }
    case "group-invite": {
      const group = market.offerings.find((g) => g.id === c.offeringId && g.tutorId === actorId);
      ensure(actor.role === "tutor" && market.tutorProfiles.some((p) =>
        p.userId === actorId && p.verification === "approved"), "Tasdiqlangan ustoz profili kerak.");
      if (!group || group.type !== "group") throw new Error("Guruh topilmadi.");
      const target = peer(c.studentId);
      ensure(target.role === "student", "O‘quvchini tanlang.");
      allowed(target.id, "invitePolicy");
      ensure(areContacts(market, actorId, target.id) ||
        market.enrollments.some((e) => e.studentId === target.id && e.active &&
          market.offerings.some((g) => g.id === e.offeringId && g.tutorId === actorId)),
      "Avval o‘quvchi bilan kontakt o‘rnating.");
      ensure(market.sessions.some((s) => s.offeringId === group.id && Date.parse(s.startsAt) > now.getTime()),
        "Guruhning kelajakdagi darsi yo‘q.");
      ensure(!market.enrollments.some((e) => e.offeringId === group.id &&
        e.studentId === target.id && e.active), "O‘quvchi allaqachon guruhda.");
      ensure(group.reservedSeats + market.enrollments.filter((e) => e.offeringId === group.id && e.active).length <
        group.capacity, "Guruhda bo‘sh o‘rin qolmagan.");
      const previous = market.groupInvitations?.find((i) => i.offeringId === group.id &&
        i.studentId === target.id && i.status === "pending" && Date.parse(i.expiresAt) > now.getTime());
      if (previous) { id = previous.id; break; }
      ensure((market.groupInvitations || []).filter((r) => r.tutorId === actorId &&
        Date.parse(r.createdAt) > now.getTime() - 86400000).length < 50, "Bugungi guruh takliflari limiti tugadi.");
      for (const i of market.groupInvitations || []) if (i.offeringId === group.id &&
        i.studentId === target.id && i.status === "pending") i.status = "cancelled";
      id = uid("invite");
      (market.groupInvitations ||= []).unshift({
        id, offeringId: group.id, tutorId: actorId, studentId: target.id,
        status: "pending", createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      });
      notify(target.id, "Guruhga taklif", actor.name + " · " + group.title, group.id);
      break;
    }
    case "group-invite-decide": {
      const invitation = market.groupInvitations?.find((i) => i.id === c.invitationId && i.studentId === actorId);
      if (!invitation) throw new Error("Guruh taklifi topilmadi.");
      if (invitation.status === (c.accept ? "accepted" : "declined")) break;
      ensure(invitation.status === "pending", "Taklifga allaqachon javob berilgan.");
      if (!c.accept) { invitation.status = "declined"; break; }
      ensure(actor.role === "student" && Date.parse(invitation.expiresAt) > now.getTime(), "Taklif muddati tugagan.");
      ensure(!isBlocked(market, actorId, invitation.tutorId), "Bu foydalanuvchi bilan aloqa cheklangan.");
      const group = market.offerings.find((g) => g.id === invitation.offeringId);
      if (!group) throw new Error("Guruh topilmadi.");
      ensure(market.tutorProfiles.some((p) => p.userId === invitation.tutorId && p.verification === "approved"),
        "Tasdiqlangan ustoz profili kerak.");
      ensure(market.sessions.some((s) => s.offeringId === group.id && Date.parse(s.startsAt) > now.getTime()),
        "Guruhning kelajakdagi darsi yo‘q.");
      const member = market.enrollments.find((e) => e.offeringId === group.id && e.studentId === actorId);
      if (!member?.active) {
        ensure(group.reservedSeats + market.enrollments.filter((e) => e.offeringId === group.id && e.active).length <
          group.capacity, "Guruhdagi oxirgi o‘rin band bo‘ldi.");
        market.enrollments = market.enrollments.filter((e) => !(e.offeringId === group.id && e.studentId === actorId));
        market.enrollments.push({
          id: member?.id || uid("enrollment"), offeringId: group.id, studentId: actorId,
          active: true, createdAt: now.toISOString(),
        });
      }
      invitation.status = "accepted";
      for (const r of market.applications) if (r.studentId === actorId && r.groupId === group.id &&
        r.status === "pending") r.status = "approved";
      notify(invitation.tutorId, "Guruh taklifi qabul qilindi", actor.name + " · " + group.title, group.id);
      notify(actorId, "Guruhga qo‘shildingiz", group.title, group.id);
      break;
    }
    case "group-invite-cancel": {
      const invitation = market.groupInvitations?.find((i) => i.id === c.invitationId && i.tutorId === actorId);
      if (!invitation) throw new Error("Guruh taklifi topilmadi.");
      ensure(invitation.status === "pending", "Taklifga allaqachon javob berilgan.");
      invitation.status = "cancelled";
      break;
    }
    case "report-user": {
      peer(c.peerId);
      ensure(c.reason.trim().length >= 10 && c.reason.trim().length <= 1000,
        "Sababni 10–1000 belgida yozing.");
      ensure((market.accountReports || []).filter((r) => r.reporterId === actorId &&
        Date.parse(r.createdAt) > now.getTime() - 86400000).length < 5,
      "Bugungi murojaatlar limiti tugadi.");
      id = uid("report");
      (market.accountReports ||= []).push({
        id, reporterId: actorId, targetId: c.peerId, reason: c.reason.trim(), createdAt: now.toISOString(),
      });
      for (const u of market.users) if (u.role === "moderator")
        notify(u.id, "Yangi shikoyat", c.reason.trim());
      break;
    }
  }
  return { market, id };
}
