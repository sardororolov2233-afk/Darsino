import { test, expect, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
const cache = "@darsino/marketplace-v2";
async function seed(p: Page) {
  const market = demoMarketplace();
  for (const [id, name] of [
    ["hw-student", "Aziza Homework"],
    ["hw-peer", "Peer Homework"],
  ]) {
    market.users.push({
      ...blankUser,
      id,
      name,
      goal: "IELTS olish",
      interests: ["Ingliz tili"],
      onboarded: true,
    });
    market.enrollments.push({
      id,
      offeringId: "ielts",
      studentId: id,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
    });
  }
  await p.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: cache, raw: JSON.stringify({ market, actorId: "dilnoza" }) },
  );
  await p.goto("/");
}
async function actor(p: Page, id: string) {
  await p.evaluate(
    ({ key, id }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      s.actorId = id;
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key: cache, id },
  );
  await p.reload();
}
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });
async function file(p: Page, title: string, name: string) {
  const chooser = p.waitForEvent("filechooser");
  await button(p, title).click();
  await (
    await chooser
  ).setFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
  });
  await expect(button(p, name)).toBeVisible();
}
test("homework teacher → student → feedback → resubmission works with private PDF files at 320px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await button(page, "Uy vazifalari").click();
  await button(page, "Uy vazifasi berish").click();
  await page
    .getByLabel("Vazifa sarlavhasi", { exact: true })
    .fill("IELTS Essay Homework");
  await page
    .getByLabel("Vazifa tavsifi", { exact: true })
    .fill("Write a short essay and attach your work.");
  await button(page, "Vazifa kimga beriladi: Butun guruh").click();
  await page
    .getByRole("radio", { name: "Aziza Homework", exact: true })
    .click();
  await file(page, "Vazifaga fayl biriktirish", "instructions.pdf");
  await button(page, "Vazifa qoralamasini saqlash").click();
  await expect(
    page.getByText("Qoralama saqlandi.", { exact: true }),
  ).toBeVisible();
  await button(page, "Vazifa qoralamasini saqlash").click();
  await button(page, "Vazifani e’lon qilish").click();
  await expect(
    page
      .getByText("IELTS Essay Homework", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(button(page, "instructions.pdf")).toBeVisible();
  await page.screenshot({ path: "test-results/homework-teacher-320.png" });
  await actor(page, "hw-peer");
  await button(page, "Uy vazifalarim").click();
  await expect(
    page.getByText("Uy vazifalari hali yo‘q", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("IELTS Essay Homework", { exact: true }),
  ).toHaveCount(0);
  await actor(page, "hw-student");
  await button(page, "Uy vazifalarim").click();
  await button(page, "IELTS Essay Homework: vazifani ochish").click();
  await expect(button(page, "instructions.pdf")).toBeVisible();
  await page
    .getByLabel("Uy vazifasi javobi", { exact: true })
    .fill("My initial essay");
  await file(page, "Javobga fayl biriktirish", "essay.pdf");
  await button(page, "Vazifani topshirish").click();
  await expect(
    page
      .getByText("Tekshiruvda", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Uy vazifasi javobi", { exact: true }),
  ).toHaveCount(0);
  await actor(page, "dilnoza");
  await button(page, "Uy vazifalari").click();
  await button(page, "IELTS Essay Homework: vazifani ochish").click();
  await page
    .getByLabel("Ustoz izohi", { exact: true })
    .fill("Improve your conclusion.");
  await button(page, "Qayta ishlashga yuborish").click();
  await expect(
    page
      .getByText("Qayta ishlash", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await actor(page, "hw-student");
  await button(page, "Uy vazifalarim").click();
  await button(page, "IELTS Essay Homework: vazifani ochish").click();
  await expect(
    page.getByText("Improve your conclusion.", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByLabel("Uy vazifasi javobi", { exact: true })
    .fill("My revised essay");
  await button(page, "Vazifani topshirish").click();
  await actor(page, "dilnoza");
  await button(page, "Uy vazifalari").click();
  await button(page, "IELTS Essay Homework: vazifani ochish").click();
  await page
    .getByLabel("Ustoz izohi", { exact: true })
    .fill("Accepted, well done.");
  await button(page, "Javobni qabul qilish").click();
  await actor(page, "hw-student");
  await button(page, "Uy vazifalarim").click();
  await button(page, "IELTS Essay Homework: vazifani ochish").click();
  await expect(
    page
      .getByText("Qabul qilindi", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("My initial essay", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("My revised essay", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/homework-student-320.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("new and active student home prioritizes actual next actions and the supplied logo loads", async ({
  page,
}) => {
  await seed(page);
  await actor(page, "hw-student");
  await expect(
    page.getByText("Bugun bajariladigan ishlar", { exact: true }),
  ).toBeVisible();
  const logos = page.getByRole("img", { name: "O‘qi", exact: true });
  await expect(logos.first()).toBeVisible();
  await page.getByRole("tab", { name: "Bilimim", exact: true }).click();
  await expect(
    page.getByText("Hali o‘lchanmagan", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await button(page, "Sozlamalar").click();
  await button(page, "Profilni tahrirlash").click();
  await expect(button(page, "Mustaqil")).toBeVisible();
  await button(page, "Mustaqil").click();
  await button(page, "O‘zgarishlarni saqlash").click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).market.users.find(
            (u: any) => u.id === "hw-student",
          )?.studySupport,
        cache,
      ),
    )
    .toBe("Mustaqil");
  await page.reload();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await button(page, "Sozlamalar").click();
  await button(page, "Profilni tahrirlash").click();
  await expect(button(page, "Mustaqil")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
