import { expect, test, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import { diagnostics } from "../src/data/learning";
import { parseAssessment } from "../src/state/assessments";

const cacheKey = "@darsino/marketplace-v2";
async function seed(page: Page) {
  const market = demoMarketplace();
  for (const [id, name] of [
    ["ledger-ali", "Ali Valiyev"],
    ["ledger-madina", "Madina Abdullayeva"],
  ]) {
    market.users.push({
      ...blankUser,
      id,
      name,
      email: `${id}@example.test`,
      onboarded: true,
    });
    market.enrollments.push({
      id: `enroll-${id}`,
      offeringId: "ielts",
      studentId: id,
      active: true,
      createdAt: "2026-01-01T12:00:00Z",
    });
  }
  market.sessions.push({
    ...market.sessions.find((s) => s.offeringId === "ielts")!,
    id: "ledger-past",
    startsAt: "2026-01-05T09:00:00Z",
    endsAt: "2026-01-05T10:00:00Z",
  });
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: cacheKey, raw: JSON.stringify({ market, actorId: "dilnoza" }) },
  );
  await page.goto("/");
  await expect(
    page.getByText("Repetitor kabineti", { exact: true }),
  ).toBeVisible();
}
async function actor(page: Page, id: string) {
  await page.evaluate(
    ({ key, id }) => {
      const state = JSON.parse(localStorage.getItem(key)!);
      state.actorId = id;
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: cacheKey, id },
  );
  await page.reload();
}
async function openGroup(page: Page) {
  await page
    .getByRole("button", { name: "Barcha guruhlar", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "IELTS 6.5+ guruhini boshqarish",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Guruhni boshqarish", { exact: true }),
  ).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    cacheKey,
  );
}

test("monthly payments persist, reminders reach the right student and student lessons show the same ledger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await openGroup(page);
  await expect(page.getByText("Ali Valiyev", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Madina Abdullayeva", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Ali Valiyev: to‘ladi deb belgilash",
      exact: true,
    })
    .click();
  await expect
    .poll(
      async () =>
        (await saved(page)).market.payments?.find(
          (p: any) => p.studentId === "ledger-ali",
        )?.paid,
    )
    .toBe(true);
  await page
    .getByRole("button", {
      name: "Madina Abdullayeva: to‘lovni eslatish",
      exact: true,
    })
    .click();
  await expect
    .poll(
      async () =>
        (await saved(page)).market.notifications.filter(
          (n: any) =>
            n.userId === "ledger-madina" &&
            n.title === "Oylik to‘lov eslatmasi",
        ).length,
    )
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Qarzdorlarga eslatma · 0", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Oldingi oy", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Ali Valiyev: to‘ladi deb belgilash",
      exact: true,
    }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Keyingi oy", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Ali Valiyev: to‘lov belgisini bekor qilish",
      exact: true,
    }),
  ).toBeEnabled();
  await page.reload();
  await openGroup(page);
  await expect(
    page.getByRole("button", {
      name: "Ali Valiyev: to‘lov belgisini bekor qilish",
      exact: true,
    }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/group-payments-320.png",
    fullPage: true,
  });
  await actor(page, "ledger-ali");
  await page.getByRole("button", { name: /Bildirishnomalar,/ }).click();
  await expect(
    page.getByText("To‘lov qayd etildi", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page.getByRole("button", { name: "To‘lovlar", exact: true }).click();
  await expect(page.getByText("To‘ladi", { exact: true })).toBeVisible();
  await actor(page, "ledger-madina");
  await page.getByRole("button", { name: /Bildirishnomalar,/ }).click();
  await expect(
    page.getByText("Oylik to‘lov eslatmasi", { exact: true }),
  ).toBeVisible();
});

test("a teacher targets one student, the student completes the test and shares a real result", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await openGroup(page);
  await page.getByRole("button", { name: "Testlar", exact: true }).click();
  await page
    .getByRole("button", { name: "Guruhga test yuborish", exact: true })
    .click();
  await page.getByRole("button", { name: /^Kimga yuboriladi:/ }).click();
  await page.getByRole("radio", { name: "Ali Valiyev", exact: true }).click();
  const diagnostic = diagnostics[0];
  await page.getByRole("button", { name: /^Testni tanlang:/ }).click();
  await page
    .getByRole("radio", {
      name: `${diagnostic.title} · ${diagnostic.questions.length} savol`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Testni o‘quvchilarga yuborish", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Test topshirig‘i yuborildi",
      exact: true,
    }),
  ).toBeDisabled();
  const invites = (await saved(page)).market.messages.filter(
    (m: any) => parseAssessment(m.text)?.kind === "invite",
  );
  expect(invites).toHaveLength(1);
  expect(invites[0].recipientId).toBe("ledger-ali");
  await actor(page, "ledger-ali");
  await page.getByRole("tab", { name: "Radar", exact: true }).click();
  await expect(
    page.getByText("Bilim radari tez kunda ishga tushadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Testni ishlash", exact: true })
    .click();
  for (const [i, q] of diagnostic.questions.entries()) {
    await page
      .getByRole("radio", { name: q.options[q.correct], exact: true })
      .click();
    await page
      .getByRole("button", { name: "Javobni tekshirish", exact: true })
      .click();
    await page
      .getByRole("button", {
        name:
          i === diagnostic.questions.length - 1
            ? "Natijani saqlash"
            : "Keyingi savol",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Natijani ustozga yuborish", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Natija ustozga yuborildi", exact: true }),
  ).toBeDisabled();
  await actor(page, "dilnoza");
  await openGroup(page);
  await page.getByRole("button", { name: "Testlar", exact: true }).click();
  await expect(page.getByText("Natija: 100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Davomat", exact: true }).click();
  await page.getByRole("button", { name: /^Dars sanasi:/ }).click();
  await page.getByRole("radio", { name: /5-yanvar|5 yanvar|5 январ/ }).click();
  await page
    .getByRole("button", { name: "Qatnashgan", exact: true })
    .first()
    .click();
  await expect
    .poll(async () => (await saved(page)).market.attendance.length)
    .toBe(1);
  expect(errors).toEqual([]);
});

test("teacher and student filters stay inside a small screen and reset coherently", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  for (const tab of ["O‘quvchilar", "Test yuklash", "Guruh chat", "Profil"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await actor(page, "ledger-ali");
  await page.getByRole("tab", { name: "Qidirish", exact: true }).click();
  await page
    .getByRole("button", { name: "Filtrlarni ochish yoki yopish", exact: true })
    .click();
  await page.getByRole("button", { name: "Onlayn", exact: true }).click();
  await expect(
    page.getByText("Filtrlar · 1 faol", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tozalash", exact: true }).click();
  await expect(page.getByText("Filtrlar", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Narx va reyting filtrlari", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/filters-320.png",
    fullPage: true,
  });
});
