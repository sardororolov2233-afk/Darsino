import { expect, test, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";

const key = "@darsino/marketplace-v2";
async function seed(page: Page) {
  const market = demoMarketplace();
  market.users.push({
    ...blankUser,
    id: "classroom-ali",
    name: "Ali Classroom",
    email: "classroom@example.test",
    onboarded: true,
  });
  market.enrollments.push({
    id: "classroom-enrolled",
    offeringId: "ielts",
    studentId: "classroom-ali",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
  });
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key, raw: JSON.stringify({ market, actorId: "dilnoza" }) },
  );
  await page.goto("/");
  await expect(
    page.getByText("Repetitor kabineti", { exact: true }),
  ).toBeVisible();
}
async function actor(page: Page, id: string) {
  await page.evaluate(
    ({ key, id }) => {
      const cached = JSON.parse(localStorage.getItem(key)!);
      cached.actorId = id;
      localStorage.setItem(key, JSON.stringify(cached));
    },
    { key, id },
  );
  await page.reload();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("teacher metrics and two-step group schedule use actual attendance and debts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await expect(
    page.getByRole("button", { name: "Davomat", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Qarzdorlar", exact: true }).click();
  await expect(page.getByText("Ali Classroom", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("button", { name: "Yangi guruh", exact: true }).click();
  await expect(
    page.getByLabel("Birinchi dars sanasi (YYYY-MM-DD)", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Dars / guruh nomi", { exact: true })
    .fill("Kechki IELTS");
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
    .getByLabel("Birinchi dars sanasi (YYYY-MM-DD)", { exact: true })
    .fill("2099-01-05");
  // Select only Monday and Wednesday, independently of today's weekday.
  for (const day of [
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
    "Yakshanba",
  ]) {
    const chip = page.getByRole("button", { name: day, exact: true });
    const selected = await page
      .getByLabel(`${day} boshlanishi (HH:MM)`, { exact: true })
      .count();
    if (!!selected !== ["Dushanba", "Chorshanba"].includes(day))
      await chip.click();
  }
  await page
    .getByLabel("Dushanba boshlanishi (HH:MM)", { exact: true })
    .fill("18:00");
  await page
    .getByLabel("Chorshanba boshlanishi (HH:MM)", { exact: true })
    .fill("15:30");
  await page.getByLabel("Jami darslar soni", { exact: true }).fill("4");
  await page
    .getByRole("button", { name: "Darsni e’lon qilish", exact: true })
    .click();
  await expect(
    page.getByText("Guruhni boshqarish", { exact: true }),
  ).toBeVisible();
  const sessions = await page.evaluate((key) => {
    const { market } = JSON.parse(localStorage.getItem(key)!);
    const group = market.offerings.find((g: any) => g.title === "Kechki IELTS");
    return market.sessions.filter((s: any) => s.offeringId === group.id);
  }, key);
  expect(sessions).toHaveLength(4);
  expect(sessions.map((s: any) => new Date(s.startsAt).getUTCDay())).toEqual([
    1, 3, 1, 3,
  ]);
  expect(sessions.map((s: any) => s.startsAt.slice(11, 16))).toEqual([
    "13:00",
    "10:30",
    "13:00",
    "10:30",
  ]);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("custom mock test reaches students and feeds teacher progress; group announcements and messages persist", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await page.getByRole("tab", { name: "Test yuklash", exact: true }).click();
  await page
    .getByRole("button", { name: "Qo‘lda kiritish", exact: true })
    .click();
  await page.getByLabel("1-savol matni", { exact: true }).fill("What is 2+2?");
  for (const [i, v] of ["4", "3", "2", "1"].entries())
    await page
      .getByLabel(`1-savol ${"ABCD"[i]} varianti`, { exact: true })
      .fill(v);
  await page
    .getByRole("radio", { name: "1-savol kaliti: A", exact: true })
    .click();
  await page
    .getByLabel("Test nomi", { exact: true })
    .fill("Haftalik custom mock");
  await page
    .getByRole("button", { name: "Testni e’lon qilish", exact: true })
    .click();
  await expect(
    page.getByText("Test e’lon qilindi. Guruh o‘quvchilari ishlashi mumkin.", {
      exact: true,
    }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "test-results/mock-test-upload.png" });
  await page.getByRole("tab", { name: "Guruh chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Shoshilinch xabar", exact: true })
    .click();
  await page
    .getByLabel("E’lon matni", { exact: true })
    .fill("Ertaga testga tayyorlaning");
  await page.getByRole("button", { name: "Tarqatish", exact: true }).click();
  await expect(page.getByLabel("E’lon matni", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/group-chat.png" });
  await actor(page, "classroom-ali");
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page
    .getByRole("button", { name: "Mock testni boshlash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Testni boshlash", exact: true })
    .click();
  await page.getByRole("radio", { name: "1-savol: A", exact: true }).click();
  await page
    .getByRole("button", { name: "Testni yakunlash", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Javoblarni yuborishni tasdiqlash",
      exact: true,
    })
    .click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page
    .getByRole("button", { name: "Chatni ochish", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Guruh suhbati: IELTS 6.5+ guruhi",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Ertaga testga tayyorlaning", { exact: true }).last(),
  ).toBeVisible();
  await page
    .getByLabel("Xabar yozing", { exact: true })
    .fill("Ustoz, tayyorman!");
  await page
    .getByRole("button", { name: "Xabarni yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Ustoz, tayyorman!", { exact: true }),
  ).toBeVisible();
  await actor(page, "dilnoza");
  await page.getByRole("tab", { name: "O‘quvchilar", exact: true }).click();
  await expect(page.getByText("100%", { exact: true }).last()).toBeVisible();
  await page
    .getByRole("button", { name: "Profil va tahlil", exact: true })
    .click();
  await expect(
    page.getByText("Haftalik custom mock", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/student-progress.png" });
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("tab", { name: "Guruh chat", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Guruh suhbati: IELTS 6.5+ guruhi",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Ustoz, tayyorman!", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
