import type { Page } from "@playwright/test";
export async function completeStudentSetup(page: Page, name = "Oqi Sinov") {
  const click = (label: string) =>
    page.getByRole("button", { name: label, exact: true }).click();
  await click("IELTS olish");
  await click("Davom etish");
  await click("Onlayn");
  await click("Ustoz bilan");
  await click("Viloyat");
  await click("Toshkent shahri");
  await click("Tuman / shahar");
  await click("Yunusobod tumani");
  await click("Davom etish");
  const [first, ...last] = name.split(" ");
  await page.getByRole("textbox", { name: "Ism", exact: true }).fill(first);
  await page
    .getByRole("textbox", { name: "Familiya", exact: true })
    .fill(last.join(" ") || "Sinov");
  await click("Saqlash");
}
