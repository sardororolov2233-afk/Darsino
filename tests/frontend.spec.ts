import { expect, test, type Page } from "@playwright/test";
async function onboarding(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Boshlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Telefon raqamingiz", exact: true })
    .fill("901234567");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ism va familiya", exact: true })
    .fill("Sardor O‘rolov");
  await page
    .getByRole("button", { name: "Darsinoga kirish", exact: true })
    .click();
  await expect(
    page.getByText("Bugun nimani o‘rganamiz?", { exact: true }),
  ).toBeVisible();
}
test("telefon, SMS kodi va profil majburiy maydonlari tekshiriladi", async ({
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
    .fill("+998 90 123 45 67");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("111111");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Kod noto‘g‘ri. Sinov uchun 421806 kodini kiriting.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "SMS tasdiqlash kodi", exact: true })
    .fill("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page
    .getByRole("button", { name: "Darsinoga kirish", exact: true })
    .click();
  await expect(page.getByText(/Ism.*kiriting/)).toBeVisible();
});
test("qidiruv, narx filtri va sinov darsi so‘rovi ishlaydi va qayta ochilganda saqlanadi", async ({
  page,
}) => {
  await onboarding(page);
  await page.getByRole("button", { name: "Ustozlar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ingliz tili", exact: true })
    .fill("not-found");
  await expect(
    page.getByText("Repetitor topilmadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ingliz tili", exact: true })
    .fill("");
  await page
    .getByRole("button", { name: "Filtrlarni ochish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Eng ko‘p (so‘m)", exact: true })
    .fill("60000");
  await page
    .getByRole("button", { name: "0 natijani ko‘rish", exact: true })
    .click();
  await expect(
    page.getByText("Repetitor topilmadi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Filtrlarni ochish", exact: true })
    .click();
  await page.getByRole("button", { name: "Tozalash", exact: true }).click();
  await page
    .getByRole("button", { name: "3 natijani ko‘rish", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Dilnoza Karimova profilini ko‘rish",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await page.getByRole("button", { name: "16:00", exact: true }).click();
  await page
    .getByRole("button", { name: "Sinov darsiga yozilish", exact: true })
    .click();
  await expect(
    page.getByText("Tasdiqlash kutilmoqda", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Darslarimni ko‘rish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "So‘rovlar · 1", exact: true })
    .click();
  await expect(
    page.getByText("Dilnoza Karimova · sinov darsi", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/16:00 · 30 daqiqa/)).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Saqlanganlar", exact: true }).click();
  await page
    .getByRole("button", { name: "Dilnoza Karimovani ochish", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Saqlanganlardan olib tashlash",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Bugun nimani o‘rganamiz?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Darslarim", exact: true }).click();
  await page
    .getByRole("button", { name: "So‘rovlar · 1", exact: true })
    .click();
  await expect(
    page.getByText("Dilnoza Karimova · sinov darsi", { exact: true }),
  ).toBeVisible();
});
test("guruh, tadbir va xona bronlari hamda hisoblangan narx ishlaydi", async ({
  page,
}) => {
  await onboarding(page);
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "IELTS 6.5+ guruhi tafsilotlari",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Guruhga qo‘shilish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Darslarimni ko‘rish", exact: true })
    .click();
  await page.getByRole("tab", { name: "Bosh", exact: true }).click();
  await page.getByRole("button", { name: "Tadbirlar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Speaking club: erkin suhbat tafsilotlari",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Ishtirok etish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Darslarimni ko‘rish", exact: true })
    .click();
  await page.getByRole("tab", { name: "Bosh", exact: true }).click();
  await page.getByRole("button", { name: "Xonalar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Study Hub · 2-xona tafsilotlari",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "2 soat", exact: true }).click();
  await expect(page.getByText("160 000 so‘m", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Bron so‘rovini yuborish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Darslarimni ko‘rish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "So‘rovlar · 3", exact: true })
    .click();
  await expect(
    page
      .getByText("Study Hub · 2-xona", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("160 000 so‘m", { exact: true })).toBeVisible();
});
test("chat yuborish, profil tahriri va chiqish ishlaydi", async ({ page }) => {
  await onboarding(page);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Suhbat: Dilnoza Karimova", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Xabar yozing", exact: true })
    .fill("Darsga tayyorman.");
  await page
    .getByRole("button", { name: "Xabarni yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Darsga tayyorman.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ortga qaytish", { exact: true }).click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", { name: "Profilni tahrirlash", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Ism va familiya", exact: true })
    .fill("Sardor Test");
  await page
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  await expect(page.getByText("Sardor Test", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Suhbat: Dilnoza Karimova", exact: true })
    .click();
  await expect(
    page.getByText("Darsga tayyorman.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ortga qaytish", { exact: true }).click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await expect(page.getByText("Sardor Test", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Boshlash", exact: true }),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("so‘rovdan tanlangan ustozning suhbatiga o‘tiladi", async ({ page }) => {
  await onboarding(page);
  await page.getByRole("button", { name: "Ustozlar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Azizbek Komilov profilini ko‘rish",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Sinov darsiga yozilish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chatni ochish", exact: true })
    .click();
  await expect(
    page
      .getByText("Azizbek Komilov", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Xabar yozing", exact: true })
    .fill("Sinov darsiga yozildim.");
  await page
    .getByRole("button", { name: "Xabarni yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Sinov darsiga yozildim.", { exact: true }),
  ).toBeVisible();
});
