import { test, expect, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
async function login(page: Page) {
  await page.getByRole("button", { name: "Boshlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Email manzilingiz", exact: true })
    .pressSequentially("assistant@example.com");
  await page
    .getByRole("button", { name: "Emailga kod yuborish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email tasdiqlash kodi", exact: true })
    .pressSequentially("421806");
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ism va familiya", exact: true })
    .pressSequentially("AI Sinov");
  await page
    .getByRole("button", { name: "O‘qiga kirish", exact: true })
    .click();
}
test("student assistant drags, restores its position, supports keyboard chat and stays private after logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("floating-assistant")).toHaveCount(0);
  await login(page);
  const bubble = page.getByTestId("floating-assistant");
  await expect(bubble).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/assistant-floating-320.png",
  });
  const before = (await bubble.boundingBox())!;
  await page.mouse.move(before.x + 28, before.y + 25);
  await page.mouse.down();
  await page.mouse.move(before.x - 100, before.y + 100, { steps: 12 });
  await page.mouse.up();
  const moved = (await bubble.boundingBox())!;
  expect(moved.x).toBeLessThan(before.x - 40);
  await expect(
    page.getByRole("textbox", { name: "AI uchun savolingiz" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(bubble).toBeVisible();
  await expect
    .poll(async () => Math.abs((await bubble.boundingBox())!.x - moved.x))
    .toBeLessThan(5);
  await page.setViewportSize({ width: 440, height: 600 });
  await expect
    .poll(async () => (await bubble.boundingBox())!.y)
    .toBeLessThan(470);
  await page.setViewportSize({ width: 320, height: 844 });
  await bubble.focus();
  await bubble.press("Enter");
  await expect(
    page.getByText("O‘qi AI yordamchi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "AI uchun savolingiz" })
    .pressSequentially("Kasrlarni tushuntirib ber");
  await page
    .getByRole("button", { name: "AIga yuborish", exact: true })
    .click();
  await expect(
    page.getByText(/^Sinov rejimi: bu chat oynasining namunasidir/),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/assistant-chat-320.png" });
  await page
    .getByRole("button", { name: "AI chatni yopish", exact: true })
    .click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", { name: "Ruxsatlar va xotira", exact: true })
    .click();
  await expect(
    page.getByText("Rasmlar va fayllar", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ilova xotirasi", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/permissions-320.png" });
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chiqishni tasdiqlash", exact: true })
    .click();
  await expect(bubble).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("teacher opens location and material controls while the student assistant stays hidden", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript((market) => {
    if (window.top !== window.self) return;
    localStorage.setItem(
      "@darsino/marketplace-v2",
      JSON.stringify({ market, actorId: "dilnoza" }),
    );
  }, demoMarketplace());
  await page.goto("/");
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await expect(page.getByTestId("floating-assistant")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Dars manzilini belgilash", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Dars manzili nomi" })
    .fill("Yunusobod dars markazi");
  await page
    .getByRole("textbox", { name: "Kenglik (latitude)" })
    .fill("41.367");
  await page
    .getByRole("textbox", { name: "Uzunlik (longitude)" })
    .fill("69.284");
  await expect(
    page.getByRole("button", { name: "Manzilni saqlash", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: "docs/screenshots/teacher-location-320.png" });
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("tab", { name: "Guruhlar", exact: true }).click();
  await page
    .getByRole("button", { name: /ni boshqarish$/ })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Material sarlavhasi" })
    .fill("Birinchi video");
  await page
    .getByRole("button", { name: "Video yoki material yuklash", exact: true })
    .click();
  await expect(
    page.getByText("Fayl yuklash Supabase rejimida ishlaydi.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
