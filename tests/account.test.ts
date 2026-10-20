import { test } from "node:test";
import assert from "node:assert/strict";
import { demoMarketplace } from "../src/state/demo";
import { blankUser, type MarketCommand } from "../src/state/domain";
import { applyMarketCommand } from "../src/state/marketplace";
import {
  conversationFor,
  defaultAccountSettings,
  normalizePublicId,
  publicIdOf,
} from "../src/state/account";
import {
  paymentMonth,
  paymentSummary,
  shiftMonth,
} from "../src/state/payments";

function fixture() {
  const now = new Date(),
    month = paymentMonth(now),
    oldMonth = shiftMonth(month, -1);
  let market = demoMarketplace();
  for (const [id, name] of [
    ["account-ali", "Ali Valiyev"],
    ["account-peer", "Madina Aliyeva"],
  ])
    market.users.push({
      ...blankUser,
      id,
      name,
      role: "student",
      onboarded: true,
    });
  market.enrollments.push({
    id: "history",
    offeringId: "ielts",
    studentId: "account-ali",
    active: true,
    createdAt: oldMonth + "-01T12:00:00Z",
  });
  const run = (actor: string, c: MarketCommand) => {
    const result = applyMarketCommand(market, actor, c, now);
    market = result.market;
    return result.id;
  };
  return {
    get market() {
      return market;
    },
    run,
    now,
    month,
    oldMonth,
  };
}
test("a returning student is counted once and an old recorded payment stays editable", () => {
  const f = fixture();
  const payment: MarketCommand = {
    type: "payment",
    offeringId: "ielts",
    studentId: "account-ali",
    month: f.oldMonth,
    paid: true,
  };
  f.run("dilnoza", payment);
  const due = f.market.offerings.find((g) => g.id === "ielts")!.price;
  f.run("dilnoza", {
    type: "remove-participant",
    offeringId: "ielts",
    studentId: "account-ali",
  });
  const requestId = f.run("account-ali", {
    type: "request",
    request: {
      kind: "group",
      groupId: "ielts",
      tutorId: "dilnoza",
      title: "IELTS",
      subtitle: "Ingliz tili",
      time: "14:00",
    },
  })!;
  f.run("dilnoza", {
    type: "decide",
    requestId,
    decision: "approved",
    note: "",
  });
  const report = paymentSummary(f.market, "dilnoza", f.oldMonth, "ielts");
  assert.equal(report.rows.length, 1);
  assert.equal(report.received, due);
  f.run("dilnoza", { ...payment, paid: false });
  assert.equal(
    paymentSummary(f.market, "dilnoza", f.oldMonth, "ielts").received,
    0,
  );
});
test("contacts require recipient consent; privacy and blocking guard messages", () => {
  const f = fixture();
  const requestId = f.run("account-ali", {
    type: "contact-request",
    peerId: "dilnoza",
  })!;
  assert.equal(f.market.contacts?.length || 0, 0);
  assert.throws(
    () =>
      f.run("account-peer", {
        type: "contact-decide",
        requestId,
        accept: true,
      }),
    /topilmadi/,
  );
  f.run("dilnoza", { type: "contact-decide", requestId, accept: true });
  f.run("dilnoza", { type: "contact-decide", requestId, accept: true });
  assert.equal(f.market.contacts!.length, 2);
  f.run("account-ali", {
    type: "account-settings",
    settings: { ...defaultAccountSettings, messagePolicy: "contacts" },
    publicId: "ali_valiyev",
  });
  const student = f.market.users.find((u) => u.id === "account-ali")!;
  const teacher = f.market.users.find((u) => u.id === "dilnoza")!;
  f.run("dilnoza", {
    type: "message",
    conversationId: conversationFor(teacher, student),
    text: "Salom",
  });
  f.run("account-ali", {
    type: "block-user",
    peerId: "dilnoza",
    blocked: true,
  });
  assert.equal(f.market.contacts!.length, 0);
  assert.throws(
    () =>
      f.run("dilnoza", {
        type: "message",
        conversationId: conversationFor(teacher, student),
        text: "Salom",
      }),
    /cheklangan/,
  );
  f.run("account-ali", {
    type: "block-user",
    peerId: "dilnoza",
    blocked: false,
  });
  assert.throws(
    () =>
      f.run("dilnoza", {
        type: "message",
        conversationId: conversationFor(teacher, student),
        text: "Salom",
      }),
    /cheklangan/,
  );
  assert.equal(
    normalizePublicId("darsino://connect/ali_valiyev"),
    "ali_valiyev",
  );
  assert.equal(publicIdOf(student), "ali_valiyev");
});
test("invitations require consent and repeated acceptance cannot re-enroll a removed member", () => {
  const f = fixture();
  f.run("dilnoza", {
    type: "remove-participant",
    offeringId: "ielts",
    studentId: "account-ali",
  });
  const requestId = f.run("account-ali", {
    type: "contact-request",
    peerId: "dilnoza",
  })!;
  f.run("dilnoza", { type: "contact-decide", requestId, accept: true });
  const invitationId = f.run("dilnoza", {
    type: "group-invite",
    offeringId: "ielts",
    studentId: "account-ali",
  })!;
  assert.equal(
    f.run("dilnoza", {
      type: "group-invite",
      offeringId: "ielts",
      studentId: "account-ali",
    }),
    invitationId,
  );
  assert.ok(
    !f.market.enrollments.some(
      (e) =>
        e.offeringId === "ielts" && e.studentId === "account-ali" && e.active,
    ),
  );
  assert.throws(
    () =>
      f.run("account-peer", {
        type: "group-invite-decide",
        invitationId,
        accept: true,
      }),
    /topilmadi/,
  );
  f.run("account-ali", {
    type: "group-invite-decide",
    invitationId,
    accept: true,
  });
  assert.equal(
    f.market.enrollments.filter(
      (e) => e.studentId === "account-ali" && e.offeringId === "ielts",
    ).length,
    1,
  );
  f.run("dilnoza", {
    type: "remove-participant",
    offeringId: "ielts",
    studentId: "account-ali",
  });
  f.run("account-ali", {
    type: "group-invite-decide",
    invitationId,
    accept: true,
  });
  assert.ok(
    !f.market.enrollments.some(
      (e) => e.studentId === "account-ali" && e.active,
    ),
  );
});

test("contacts-only messaging still allows a consent request, while disabling requests rejects it", () => {
  const f = fixture();
  f.run("account-ali", {
    type: "account-settings",
    settings: { ...defaultAccountSettings, messagePolicy: "contacts" },
    publicId: "ali_requests",
  });
  const requestId = f.run("dilnoza", {
    type: "contact-request",
    peerId: "account-ali",
  })!;
  assert.ok(requestId);
  f.run("account-ali", { type: "contact-decide", requestId, accept: false });
  f.run("account-ali", {
    type: "account-settings",
    settings: { ...defaultAccountSettings, allowContactRequests: false },
    publicId: "ali_requests",
  });
  assert.throws(
    () => f.run("dilnoza", { type: "contact-request", peerId: "account-ali" }),
    /maxfiylik/,
  );
});
