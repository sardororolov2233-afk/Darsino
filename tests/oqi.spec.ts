import { diagnostics } from "../src/data/learning";
import { completeStudentSetup } from "./onboardingHelpers";
import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, email: string) {
  await page.getByRole("button", { name: "O‘quvchi", exact: true }).click();
  await page
    .getByRole("button", { name: "Email orqali davom etish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email manzilingiz", exact: true })
    .fill(email);
  await page
    .getByRole("button", { name: "Emailga kod yuborish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await completeStudentSetup(page, "Oqi Sinov");
}
test("diagnostic results and followed clubs persist and remain private to each account", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await login(page, "oqi@example.com");
  await page.getByRole("tab", { name: "Radar", exact: true }).click();
  await expect(
    page.getByText("Bilim radari tez kunda ishga tushadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: `${diagnostics[0].title}: testni boshlash`,
      exact: true,
    })
    .click();
  // Two correct and three incorrect answers; result must reflect the actual choices.
  const answers = ["40", "162", "2", "6", "150 000"];
  for (const [i, answer] of answers.entries()) {
    await page.getByRole("radio", { name: answer, exact: true }).click();
    await page
      .getByRole("button", { name: "Javobni tekshirish", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: i === 4 ? "Natijani saqlash" : "Keyingi savol",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByText("2/5", { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Radarga qaytish", exact: true })
    .click();
  await expect(
    page
      .getByText("40% to‘g‘ri", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page.getByRole("button", { name: "Klublar", exact: true }).click();
  await page
    .getByRole("button", { name: "Klubni kuzatish", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Kuzatilmoqda", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Radar", exact: true }).click();
  await expect(
    page
      .getByText("40% to‘g‘ri", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: /^(Profil|Kabinet)$/, exact: true })
    .click();
  await expect(
    page.getByText("Kuzatayotgan klublarim", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sozlamalar", exact: true }).click();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chiqishni tasdiqlash", exact: true })
    .click();
  await login(page, "other-oqi@example.com");
  await page.getByRole("tab", { name: "Radar", exact: true }).click();
  await expect(
    page.getByText("Bilim radari tez kunda ishga tushadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: /^(Profil|Kabinet)$/, exact: true })
    .click();
  await expect(
    page.getByText("Kuzatayotgan klublarim", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("search respects multiple words, map filtering, recent searches and narrow layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await login(page, "search-oqi@example.com");
  await page.getByRole("tab", { name: "Qidirish", exact: true }).click();
  const field = page.getByRole("textbox", {
    name: "Repetitor qidirish",
    exact: true,
  });
  await field.fill("Matematika Chilonzor");
  await field.press("Enter");
  await expect(
    page
      .getByText("Akmal Yusupov", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Dilnoza Karimovani saqlash",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Xarita", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Akmal Yusupov, Chilonzor xarita belgisi",
      exact: true,
    }),
  ).toBeVisible();
  await field.fill("does-not-exist");
  await expect(
    page.getByText("Repetitor topilmadi", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /xarita belgisi/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Filtrlarni tozalash", exact: true })
    .click();
  await page.getByRole("button", { name: "Ro‘yxat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Matematika Chilonzor", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tozalash", exact: true }).click();
  await expect(
    page.getByText("SO‘NGGI QIDIRUVLAR", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
