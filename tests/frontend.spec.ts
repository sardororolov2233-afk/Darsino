import { completeStudentSetup } from "./onboardingHelpers";
import { expect, test, type Page } from "@playwright/test";
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
}
async function logout(page: Page) {
  for (
    let i = 0;
    i < 4 &&
    !(await page
      .getByRole("tab", { name: /^(Profil|Kabinet)$/, exact: true })
      .count()) &&
    (await page.getByRole("button", { name: "Orqaga", exact: true }).count());
    i++
  )
    await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page
    .getByRole("tab", { name: /^(Profil|Kabinet)$/, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chiqishni tasdiqlash", exact: true })
    .click();
}
test("student application requires tutor approval before My Lessons", async ({
  page,
}) => {
  await page.goto("/");
  await login(page, "sardor@example.com");
  await completeStudentSetup(page, "Sardor Test");
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "IELTS 6.5+ guruhi tafsilotlari",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Guruhga ariza yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Tasdiqlash kutilmoqda", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Darslarimni ko‘rish", exact: true })
    .click();
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await expect(
    page.getByText("Guruhlar hali qo‘shilmagan", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "dilnoza@darsino.demo");
  await page
    .getByRole("button", { name: "Yangi arizalar", exact: true })
    .click();
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Yangi arizalar yo‘q", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "sardor@example.com");
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await expect(
    page.getByText("Qabul qilingansiz", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await expect(
    page.getByText("IELTS 6.5+ guruhi", { exact: true }).first(),
  ).toBeVisible();
});
test("email validation and empty tutor search have actionable errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "O‘quvchi", exact: true }).click();
  await page
    .getByRole("button", { name: "Email orqali davom etish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Emailga kod yuborish", exact: true })
    .click();
  await expect(
    page.getByText("To‘g‘ri email manzilini kiriting.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Email manzilingiz", exact: true })
    .fill("sardor@example.com");
  await page
    .getByRole("button", { name: "Emailga kod yuborish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email tasdiqlash kodi", exact: true })
    .fill("111111");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Sinov rejimida kod: 421806", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Email tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await completeStudentSetup(page, "Sardor Test");
  await page.getByRole("tab", { name: "Qidirish", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Repetitor qidirish", exact: true })
    .fill("not found");
  await expect(
    page.getByText("Repetitor topilmadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Filtrlarni tozalash", exact: true })
    .click();
  await expect(
    page
      .getByText("Dilnoza Karimova", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
