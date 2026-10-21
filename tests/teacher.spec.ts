import { diagnostics } from "../src/data/learning";
import { expect, test, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
async function seed(page: Page) {
  const market = demoMarketplace();
  const student = {
    ...blankUser,
    id: "teacher-ui-student",
    name: "Ali Test",
    email: "teacher-student@example.com",
    onboarded: true,
  };
  market.users.push(student);
  market.enrollments.push({
    id: "teacher-ui-membership",
    studentId: student.id,
    offeringId: "ielts",
    active: true,
    createdAt: new Date().toISOString(),
  });
  market.sessions.push({
    ...market.sessions.find((s) => s.offeringId === "ielts")!,
    id: "teacher-ui-past",
    startsAt: "2020-01-01T10:00:00Z",
    endsAt: "2020-01-01T11:00:00Z",
  });
  await page.addInitScript(
    (raw) => {
      if (!localStorage.getItem("@darsino/marketplace-v2"))
        localStorage.setItem("@darsino/marketplace-v2", raw);
    },
    JSON.stringify({ market, actorId: "dilnoza" }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Repetitor kabineti", { exact: true }),
  ).toBeVisible();
}
async function logout(page: Page) {
  for (
    let i = 0;
    i < 5 &&
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
test("teacher assigns a test, student shares results and teacher radar and attendance update", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await page.getByRole("button", { name: "Test berish", exact: true }).click();
  await page.getByRole("button", { name: /^Testni tanlang:/ }).click();
  await page
    .getByRole("radio", {
      name: `${diagnostics[0].title} · ${diagnostics[0].questions.length} savol`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Testni o‘quvchilarga yuborish", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Test topshirig‘i yuborildi",
      exact: true,
    }),
  ).toBeDisabled();
  await logout(page);
  await login(page, "teacher-student@example.com");
  await page
    .getByRole("button", { name: "Chatni ochish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suhbat: Dilnoza Karimova", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Testni ishlash", exact: true })
    .click();
  for (const [i, answer] of ["40", "162", "2", "6", "150 000"].entries()) {
    await page.getByRole("radio", { name: answer, exact: true }).click();
    await page
      .getByRole("button", { name: "Javobni tekshirish", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: i === 4 ? "Natijani saqlash" : "Keyingi savol",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Natijani ustozga yuborish", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Natija ustozga yuborildi", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Radarga qaytish", exact: true })
    .click();
  await logout(page);
  await login(page, "dilnoza@darsino.demo");
  await expect(
    page.getByText("40%", { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Guruhlar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "IELTS 6.5+ guruhini boshqarish",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Davomat", exact: true }).click();
  await page.getByRole("button", { name: "Qatnashmagan", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("@darsino/marketplace-v2")!,
        ).market.attendance.some(
          (a: any) =>
            a.sessionId === "teacher-ui-past" &&
            a.studentId === "teacher-ui-student" &&
            a.status === "absent",
        ),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
test("free teacher club is discoverable and student admission requires teacher approval", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("tab", { name: "Klublar", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Yangi klub ochish", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Klub yoki tadbir nomi", exact: true })
    .fill("English Test Club");
  await page.getByRole("button", { name: "Onlayn", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "Klub manzili yoki onlayn havola",
      exact: true,
    })
    .fill("https://example.com/club");
  await page
    .getByRole("button", { name: "Klubni e’lon qilish", exact: true })
    .click();
  await expect(
    page.getByText("Guruhni boshqarish", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "teacher-student@example.com");
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page.getByRole("button", { name: "Klublar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "English Test Club tafsilotlari",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Guruhga ariza yuborish", exact: true })
    .click();
  await expect(
    page.getByText("Tasdiqlash kutilmoqda", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "dilnoza@darsino.demo");
  await page.getByRole("tab", { name: "Klublar", exact: true }).click();
  await page
    .getByRole("button", { name: "Klub arizalari · 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await expect(
    page.getByText("Yangi arizalar yo‘q", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "teacher-student@example.com");
  await page.getByRole("tab", { name: "Dars & Klub", exact: true }).click();
  await page.getByRole("button", { name: "Guruhlar", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "English Test Club guruhini ochish",
      exact: true,
    }),
  ).toBeVisible();
});
test("room plans persist, filters clear stale map selections and another teacher sees no private plans", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await page.getByRole("tab", { name: "Xonalar", exact: true }).click();
  await page.getByRole("button", { name: "Xarita", exact: true }).click();
  await page
    .getByRole("button", { name: "Filtrlarni ochish yoki yopish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kamida 25 o‘rin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hudud: Barchasi", exact: true })
    .click();
  await page.getByRole("radio", { name: "Chilonzor", exact: true }).click();
  await expect(page.getByText("Xona topilmadi", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /xarita belgisi/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xona filtrlarini tozalash", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Study Hub · 2-xona: xarita belgisi",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Study Hub · 2-xona: xona rejasini tuzish",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Xona rejasini saqlash", exact: true })
    .click();
  await expect(
    page.getByText("Reja · tasdiqlanmagan", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("tab", { name: "Xonalar", exact: true }).click();
  await expect(
    page.getByText("Reja · tasdiqlanmagan", { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, "akmal@darsino.demo");
  await page.getByRole("tab", { name: "Xonalar", exact: true }).click();
  await expect(
    page.getByText("Hozircha xona rejasi saqlanmagan.", { exact: true }),
  ).toBeVisible();
});
