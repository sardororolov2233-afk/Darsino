import { expect, test, type Page } from "@playwright/test";
async function login(page: Page, phone: string) {
  await page.getByRole("button", { name: "Boshlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Telefon raqamingiz", exact: true })
    .fill(phone);
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
}
async function logout(page: Page) {
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
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
  await login(page, "901234567");
  await page
    .getByRole("textbox", { name: "Ism va familiya", exact: true })
    .fill("Sardor Test");
  await page
    .getByRole("button", { name: "Darsinoga kirish", exact: true })
    .click();
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
  await login(page, "901111111");
  await page.getByRole("tab", { name: "Arizalar", exact: true }).click();
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Yangi arizalar yo‘q", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "901234567");
  await page.getByRole("tab", { name: "Darslarim", exact: true }).click();
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await expect(
    page.getByText("Qabul qilingansiz", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Darslarim", exact: true }).click();
  await expect(
    page.getByText("IELTS 6.5+ guruhi", { exact: true }).first(),
  ).toBeVisible();
});
test("phone validation and empty tutor search have actionable errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Boshlash", exact: true }).click();
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await expect(
    page.getByText("Telefon raqamingizni 9 ta raqam bilan kiriting.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Telefon raqamingiz", exact: true })
    .fill("901234567");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("111111");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Sinov rejimida kod: 421806", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ism va familiya", exact: true })
    .fill("Sardor Test");
  await page
    .getByRole("button", { name: "Darsinoga kirish", exact: true })
    .click();
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
    page.getByText("Dilnoza Karimova", { exact: true }),
  ).toBeVisible();
});
