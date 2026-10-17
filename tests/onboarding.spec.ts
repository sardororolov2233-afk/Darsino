import { expect, test } from "@playwright/test";

test("guided signup validates choices, restores draft and pins the saved goal at 320px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await page.goto("/");
  await expect(button("O‘quvchi")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/onboarding-role-320.png" });
  await button("O‘quvchi").click();
  await expect(button("Google orqali davom etish")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/onboarding-account-320.png",
  });
  await button("Email orqali davom etish").click();
  await page
    .getByRole("textbox", { name: "Email manzilingiz", exact: true })
    .fill("onboarding@example.com");
  await button("Emailga kod yuborish").click();
  await page
    .getByRole("textbox", { name: "Email tasdiqlash kodi", exact: true })
    .fill("421806");
  await button("Tasdiqlash").click();
  await expect(button("IELTS olish")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/onboarding-goals-320.png" });
  await button("Davom etish").click();
  await expect(
    page.getByText("Maqsadingizni tanlang.", { exact: true }),
  ).toBeVisible();
  await button("Milliy sertifikat").click();
  await button("Davom etish").click();
  await expect(
    page.getByText("Kamida bitta fan yoki yo‘nalishni tanlang.", {
      exact: true,
    }),
  ).toBeVisible();
  await button("Matematika").click();
  await button("CEFR olish").click();
  await expect(button("Matematika")).toHaveCount(0);
  await button("Universitetga kirish").click();
  await expect(button("Matematika")).toHaveAttribute("aria-pressed", "false");
  await button("Matematika").click();
  await button("Fizika").click();
  await button("Davom etish").click();
  await expect(button("Tuman / shahar")).toBeDisabled();
  await button("Oflayn").click();
  await button("Mustaqil").click();
  await button("Viloyat").click();
  await button("Toshkent shahri").click();
  await button("Tuman / shahar").click();
  await button("Yunusobod tumani").click();
  await button("Viloyat").click();
  await button("Andijon viloyati").click();
  await expect(button("Tuman / shahar")).not.toContainText("Yunusobod");
  await button("Davom etish").click();
  await expect(
    page.getByText("Avval viloyatni, keyin shu hududdagi tumanni tanlang.", {
      exact: true,
    }),
  ).toBeVisible();
  await button("Tuman / shahar").click();
  await button("Andijon tumani").click();
  await page.reload();
  await expect(button("Oflayn")).toHaveAttribute("aria-pressed", "true");
  await expect(button("Viloyat")).toContainText("Andijon viloyati");
  await page.screenshot({
    path: "docs/screenshots/onboarding-preferences-320.png",
  });
  await button("Davom etish").click();
  await button("Saqlash").click();
  await expect(
    page.getByText("Ism va familiyangizni to‘liq kiriting.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Ism", exact: true }).fill("Sardor");
  await page
    .getByRole("textbox", { name: "Familiya", exact: true })
    .fill("Sinov");
  const chooser = page.waitForEvent("filechooser");
  await button("Rasm yuklash (ixtiyoriy)").click();
  await (await chooser).setFiles("assets/icon.png");
  await expect(button("Boshqa rasm tanlash")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/onboarding-profile-320.png",
  });
  await button("Saqlash").click();
  await expect(
    page.getByText("MENING MAQSADIM", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Universitetga kirish", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Matematika · Fizika", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/XP/)).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/onboarding-home-320.png" });
  await page.reload();
  await expect(
    page.getByText("MENING MAQSADIM", { exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("@darsino/marketplace-v2")!),
  );
  const user = saved.market.users.find((u: any) => u.id === saved.actorId);
  expect(user.goal).toBe("Universitetga kirish");
  expect(user.studyMode).toBe("Oflayn");
  expect(user.studySupport).toBe("Mustaqil");
  expect(user.demoAvatarUri).toMatch(/^data:image\/jpeg;base64,/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
