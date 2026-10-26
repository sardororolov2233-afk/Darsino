import { expect, test, type Page } from "@playwright/test";
import { authenticateDemo, openEmailAuth } from "./authHelpers";
import { DEMO_PASSWORD } from "../src/state/demo";

async function logout(page: Page) {
  if (
    await page
      .getByText(/^(Admin tasdig‘i kutilmoqda|Arizani tuzatish kerak)$/)
      .count()
  ) {
    await page
      .getByRole("button", { name: "Hisobdan chiqish", exact: true })
      .click();
    return;
  }
  for (
    let n = 0;
    n < 4 &&
    !(await page.getByRole("tab", { name: "Profil", exact: true }).count());
    n++
  )
    await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Sozlamalar", exact: true }).click();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chiqishni tasdiqlash", exact: true })
    .click();
}

test("teacher must upload a certificate and enter a phone, then wait for admin review before teaching", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await openEmailAuth(page, "O‘qituvchi");
  await page
    .getByLabel("Email manzilingiz", { exact: true })
    .fill("tutor-application@example.test");
  await page.getByLabel("Parol", { exact: true }).fill(DEMO_PASSWORD);
  await page
    .getByLabel("Parolni qayta kiriting", { exact: true })
    .fill(DEMO_PASSWORD);
  await page
    .getByRole("button", { name: "Ro‘yxatdan o‘tish", exact: true })
    .click();
  await page.getByRole("button", { name: "IELTS olish", exact: true }).click();
  await page.getByRole("button", { name: "Ingliz tili", exact: true }).click();
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page.getByRole("button", { name: "Onlayn", exact: true }).click();
  await page.getByRole("button", { name: "Viloyat", exact: true }).click();
  await page
    .getByRole("button", { name: "Toshkent shahri", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tuman / shahar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yunusobod tumani", exact: true })
    .click();
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page.getByLabel("Yo‘nalish", { exact: true }).fill("IELTS");
  await page
    .getByLabel("Darslaringiz haqida", { exact: true })
    .fill("IELTS imtihoniga puxta tayyorlayman.");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await expect(
    page.getByText(/Telefon raqamingizni xalqaro shaklda kiriting/),
  ).toBeVisible();
  await page
    .getByLabel("Telefon raqami (majburiy)", { exact: true })
    .fill("90 123 45 67");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await expect(
    page.getByText(
      "Sertifikatni PDF yoki rasm shaklida yuklang (10 MB gacha).",
      { exact: true },
    ),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Sertifikat yuklash", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "ielts-certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% Local demo certificate\n%%EOF"),
  });
  await expect(
    page.getByText("ielts-certificate.pdf", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Sertifikatni PDF yoki rasm shaklida yuklang (10 MB gacha).",
      { exact: true },
    ),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/tutor-certificate-upload-320.png",
  });
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page.getByLabel("Ism", { exact: true }).fill("Sardor");
  await page.getByLabel("Familiya", { exact: true }).fill("Ustoz");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(
    page.getByText("Admin tasdig‘i kutilmoqda", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Yangi guruh", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Boshqaruv", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("+998901234567", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Admin tasdig‘i kutilmoqda", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/tutor-pending-review-320.png" });
  await logout(page);
  await authenticateDemo(page, "moderator@darsino.demo");
  await page
    .getByRole("button", {
      name: "Sardor Ustoz profilini tekshirish",
      exact: true,
    })
    .click();
  await expect(page.getByText("+998901234567", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "ielts-certificate.pdf", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Faylni ochish", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.screenshot({ path: "test-results/tutor-admin-review-320.png" });
  await page
    .getByLabel("Moderator izohi", { exact: true })
    .fill("Sertifikat nusxasini aniqlashtiring");
  await page
    .getByRole("button", { name: "Tuzatishga qaytarish", exact: true })
    .click();
  await expect(page.getByText("Navbat bo‘sh", { exact: true })).toBeVisible();
  await logout(page);
  await authenticateDemo(page, "tutor-application@example.test");
  await expect(
    page.getByText("Arizani tuzatish kerak", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Arizani tuzatib qayta yuborish",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Telefon raqami (majburiy)", { exact: true }),
  ).toHaveValue("+998901234567");
  await page
    .getByRole("button", { name: "Tekshiruvga yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Admin tasdig‘i kutilmoqda", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await authenticateDemo(page, "moderator@darsino.demo");
  await page
    .getByRole("button", {
      name: "Sardor Ustoz profilini tekshirish",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Repetitorni tasdiqlash", exact: true })
    .click();
  await expect(page.getByText("Navbat bo‘sh", { exact: true })).toBeVisible();
  await logout(page);
  await authenticateDemo(page, "tutor-application@example.test");
  await expect(
    page.getByRole("tab", { name: "Boshqaruv", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Yangi guruh", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
