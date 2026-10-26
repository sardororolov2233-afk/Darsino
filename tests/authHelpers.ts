import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD } from "../src/state/demo";

export async function openEmailAuth(page: Page, role = "O‘quvchi") {
  // Refuse to submit credentials if an external test URL points at a live build.
  await expect(page.getByText(/Sinov akkauntlari\. Ustoz:/)).toBeVisible();
  await page.getByRole("button", { name: role, exact: true }).click();
  await page
    .getByRole("button", { name: "Email orqali davom etish", exact: true })
    .click();
}

export async function authenticateDemo(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
) {
  const existing =
    email.endsWith("@darsino.demo") ||
    (await page.evaluate((address) => {
      const raw = localStorage.getItem("@darsino/marketplace-v2");
      if (!raw) return false;
      const cached = JSON.parse(raw);
      return (
        cached.market?.users?.some(
          (user: { email?: string }) =>
            user.email?.toLowerCase() === address.toLowerCase(),
        ) || false
      );
    }, email));
  await openEmailAuth(page);
  if (existing)
    await page
      .getByRole("button", { name: "Akkauntga kirish", exact: true })
      .click();
  await page.getByLabel("Email manzilingiz", { exact: true }).fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  if (!existing)
    await page
      .getByLabel("Parolni qayta kiriting", { exact: true })
      .fill(password);
  await page
    .getByRole("button", {
      name: existing ? "Kirish" : "Ro‘yxatdan o‘tish",
      exact: true,
    })
    .click();
}
