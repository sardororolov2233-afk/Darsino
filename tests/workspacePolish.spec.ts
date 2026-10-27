import { test, expect, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
const cache = "@darsino/marketplace-v2";
async function seed(page: Page, actor = "dilnoza") {
  const market = demoMarketplace();
  market.users.push({
    ...blankUser,
    id: "polish-ali",
    name: "Ali Polish",
    onboarded: true,
    email: "polish-ali@example.test",
  });
  market.enrollments.push({
    id: "polish-membership",
    offeringId: "ielts",
    studentId: "polish-ali",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
  });
  market.sessions.push({
    ...market.sessions.find((s) => s.offeringId === "ielts")!,
    id: "polish-past",
    startsAt: "2026-01-05T09:00:00Z",
    endsAt: "2026-01-05T10:00:00Z",
  });
  market.attendance.push({
    sessionId: "polish-past",
    studentId: "polish-ali",
    status: "present",
  });
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: cache, raw: JSON.stringify({ market, actorId: actor }) },
  );
  await page.goto("/");
}
async function actor(page: Page, id: string) {
  await page.evaluate(
    ({ key, id }) => {
      const state = JSON.parse(localStorage.getItem(key)!);
      state.actorId = id;
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: cache, id },
  );
  await page.reload();
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("monthly payment category opens finance, records income and updates the student's ledger", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await page
    .getByRole("button", { name: "Oylik to‘lovlar", exact: true })
    .click();
  await expect(
    page.getByText("Daromad va to‘lovlar", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Guruhni boshqarish", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Ali Polish: to‘landi deb belgilash",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Ali Polish: to‘lov belgisini o‘zgartirish",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).market.payments.filter(
            (p: any) => p.studentId === "polish-ali" && p.paid,
          ).length,
        cache,
      ),
    )
    .toBe(1);
  await fits(page);
  await page.screenshot({ path: "test-results/finance-320.png" });
  await actor(page, "polish-ali");
  await page
    .getByRole("button", { name: "Mening to‘lovlarim", exact: true })
    .click();
  await expect(page.getByText("To‘ladi", { exact: true })).toBeVisible();
  await fits(page);
  expect(errors).toEqual([]);
});
test("student dashboard exposes accepted group chat, materials, tests, payments and real attendance", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, "polish-ali");
  await expect(page.getByTestId("floating-assistant")).toHaveCount(0);
  await page.screenshot({ path: "test-results/student-dashboard.png" });
  await page
    .getByRole("button", { name: "Mening davomatim", exact: true })
    .click();
  await expect(
    page.getByText("Qatnashgan", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page
    .getByRole("button", { name: "Mening guruhlarim", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "IELTS 6.5+ guruhi: o‘quvchi guruhini ochish",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Guruh chati", exact: true }),
  ).toBeEnabled();
  for (const tab of ["Materiallar", "Testlar", "To‘lovlar", "Jadval"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await fits(page);
  }
  await page.getByRole("button", { name: "Guruh chati", exact: true }).click();
  await expect(page.getByLabel("Xabar yozing", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("group scheduling offers a calendar and time picker with selected values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await page.getByRole("button", { name: "Yangi guruh", exact: true }).click();
  await page
    .getByLabel("Dars / guruh nomi", { exact: true })
    .fill("Evening Polish");
  await page.getByRole("button", { name: "Onlayn", exact: true }).click();
  await page
    .getByLabel("Onlayn dars manzili", { exact: true })
    .fill("https://example.test/class");
  await page
    .getByRole("button", {
      name: "Dars kunlari va soatlarini belgilash",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Birinchi dars sanasi (YYYY-MM-DD): kalendardan tanlash",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Dars sanasini tanlang", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bugunni tanlash", exact: true })
    .click();
  await page
    .getByRole("button", { name: /boshlanishi \(HH:MM\): soatdan tanlash/ })
    .first()
    .click();
  await page.getByRole("radio", { name: "Soat: 19", exact: true }).click();
  await page.getByRole("radio", { name: "Daqiqa: 30", exact: true }).click();
  await page
    .getByRole("button", { name: "Vaqtni tanlash", exact: true })
    .click();
  await expect(
    page
      .getByLabel(/boshlanishi \(HH:MM\)/)
      .filter({ visible: true })
      .first(),
  ).toHaveValue("19:30");
  await fits(page);
});
