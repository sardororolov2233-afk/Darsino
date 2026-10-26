import { authenticateDemo as login, openEmailAuth } from "./authHelpers";
import { DEMO_PASSWORD } from "../src/state/demo";
import { completeStudentSetup } from "./onboardingHelpers";
import { expect, test, type Page } from "@playwright/test";
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
  await page.getByRole("button", { name: "Sozlamalar", exact: true }).click();
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
  await openEmailAuth(page);
  await page
    .getByLabel("Email manzilingiz", { exact: true })
    .fill("invalid-email");
  await page.getByLabel("Parol", { exact: true }).fill(DEMO_PASSWORD);
  await page
    .getByLabel("Parolni qayta kiriting", { exact: true })
    .fill(DEMO_PASSWORD);
  await page
    .getByRole("button", { name: "Ro‘yxatdan o‘tish", exact: true })
    .click();
  await expect(
    page.getByText("To‘g‘ri email manzilini kiriting.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email manzilingiz", { exact: true })
    .fill("sardor@example.com");
  await page
    .getByRole("button", { name: "Ro‘yxatdan o‘tish", exact: true })
    .click();
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

test("password signup validates confirmation, hides drafts and restores a password login after reload", async ({
  page,
}) => {
  const signupPassword = "Browser-signup-password-9427!";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openEmailAuth(page);
  const email = page.getByLabel("Email manzilingiz", { exact: true });
  const password = page.getByLabel("Parol", { exact: true });
  const confirmation = page.getByLabel("Parolni qayta kiriting", {
    exact: true,
  });
  await email.fill("password-flow@example.com");
  await password.fill(signupPassword);
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Parolni ko‘rsatish", exact: true })
    .click();
  await expect(password).toHaveJSProperty("type", "text");
  await expect(password).toHaveValue(signupPassword);
  await page
    .getByRole("button", { name: "Parolni yashirish", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await confirmation.fill("different-confirmation");
  await page
    .getByRole("button", { name: "Ro‘yxatdan o‘tish", exact: true })
    .click();
  await expect(
    page.getByText("Parollar mos kelmadi. Qayta tekshiring.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Akkauntga kirish", exact: true })
    .click();
  await expect(password).toHaveValue("");
  await expect(confirmation).toHaveCount(0);
  await expect(email).toHaveValue("password-flow@example.com");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Yangi akkaunt", exact: true })
    .click();
  await expect(password).toHaveValue("");
  await expect(confirmation).toHaveValue("");
  await password.fill(signupPassword);
  await confirmation.fill(signupPassword);
  await page
    .getByRole("button", { name: "Ro‘yxatdan o‘tish", exact: true })
    .click();
  await completeStudentSetup(page, "Parol Sinov");
  await expect(
    page.getByText("MENING MAQSADIM", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "password-flow@example.com", DEMO_PASSWORD);
  await expect(
    page.getByText("Email yoki parol noto‘g‘ri.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kirish", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Parol", { exact: true }).fill(signupPassword);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    page.getByText("MENING MAQSADIM", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("MENING MAQSADIM", { exact: true }),
  ).toBeVisible();
  const persisted = await page.evaluate(() =>
    Object.values(localStorage).join("\n"),
  );
  expect(persisted).not.toContain(DEMO_PASSWORD);
  expect(persisted).not.toContain(signupPassword);
  expect(errors).toEqual([]);
});
