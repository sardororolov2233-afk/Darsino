import { expect, test, type Page } from "@playwright/test";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import { defaultAccountSettings } from "../src/state/account";

const key = "@darsino/marketplace-v2";
async function seed(page: Page, actorId = "account-ali", contacts = false) {
  const market = demoMarketplace();
  market.users.push(
    {
      ...blankUser,
      id: "account-ali",
      name: "Ali Valiyev",
      email: "ali@example.test",
      onboarded: true,
    },
    {
      ...blankUser,
      id: "account-peer",
      name: "Madina Aliyeva",
      email: "madina@example.test",
      onboarded: true,
    },
  );
  market.accountSettings = {
    "account-ali": { ...defaultAccountSettings },
    dilnoza: { ...defaultAccountSettings },
  };
  if (contacts)
    market.contacts = [
      {
        userId: "dilnoza",
        peerId: "account-ali",
        createdAt: new Date().toISOString(),
      },
      {
        userId: "account-ali",
        peerId: "dilnoza",
        createdAt: new Date().toISOString(),
      },
    ];
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, state);
    },
    { key, state: JSON.stringify({ market, actorId }) },
  );
  await page.goto("/");
}
async function state(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
async function actor(page: Page, id: string) {
  await page.evaluate(
    ({ key, id }) => {
      const value = JSON.parse(localStorage.getItem(key)!);
      value.actorId = id;
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key, id },
  );
  await page.reload();
}
async function profile(page: Page) {
  await page
    .getByRole("tab", { name: /^(Profil|Kabinet|Profile)$/, exact: true })
    .click();
}
test("compact profile has working settings, five persistent languages and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await profile(page);
  await page.screenshot({
    path: "test-results/profile-320.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sozlamalar", exact: true }).click();
  await page.getByRole("button", { name: "Til", exact: true }).click();
  for (const [name, title, code] of [
    ["Русский", "Язык приложения", "ru"],
    ["English", "App language", "en"],
    ["Қазақша", "Қолданба тілі", "kk"],
    ["Кыргызча", "Колдонмонун тили", "ky"],
    ["O‘zbekcha", "Ilova tili", "uz"],
  ]) {
    await page.getByRole("radio", { name, exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect
      .poll(
        async () =>
          (await state(page)).market.accountSettings["account-ali"].language,
      )
      .toBe(code);
  }
  await page.getByRole("radio", { name: "English", exact: true }).click();
  await page.reload();
  await profile(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Privacy", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/settings-en-320.png",
    fullPage: true,
  });
});
test("ID contact requests need consent and QR card exposes only a public contact link", async ({
  page,
}) => {
  await seed(page);
  await profile(page);
  await page.getByRole("button", { name: "Kontaktlarim", exact: true }).click();
  await page
    .getByRole("textbox", { name: "ID yoki O‘qi havolasi", exact: true })
    .fill("@oqi_dilnoza");
  await page.getByRole("button", { name: "Qidirish", exact: true }).click();
  await page
    .getByRole("button", { name: "Kontakt taklifi yuborish", exact: true })
    .click();
  await expect
    .poll(async () => (await state(page)).market.contactRequests?.length)
    .toBe(1);
  expect((await state(page)).market.contacts?.length || 0).toBe(0);
  await actor(page, "dilnoza");
  await profile(page);
  await page.getByRole("button", { name: "Kontaktlarim", exact: true }).click();
  await page.getByRole("button", { name: "Qabul qilish", exact: true }).click();
  await expect
    .poll(async () => (await state(page)).market.contacts?.length)
    .toBe(2);
  await page.getByRole("button", { name: "Orqaga", exact: true }).click();
  await page.getByRole("button", { name: "ID va QR", exact: true }).click();
  await expect(
    page
      .getByText("@oqi_dilnoza", { exact: true })
      .filter({ visible: true })
      .last(),
  ).toBeVisible();
  await expect(page.locator("svg").last()).toBeVisible();
  await page.screenshot({
    path: "test-results/profile-qr.png",
    fullPage: true,
  });
});
test("tutor sends an invitation; the student sees the top banner and joins only after accepting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page, "dilnoza", true);
  await profile(page);
  await page
    .getByRole("button", {
      name: "O‘quvchini guruhga taklif qilish",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Taklif yuborish", exact: true })
    .click();
  await expect
    .poll(async () => (await state(page)).market.groupInvitations?.length)
    .toBe(1);
  expect(
    (await state(page)).market.enrollments.filter(
      (e: any) => e.studentId === "account-ali" && e.active,
    ).length,
  ).toBe(0);
  await actor(page, "account-ali");
  await expect(page.getByText("Guruhga taklif", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Dilnoza Karimova", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/invitation-banner-320.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Batafsil", exact: true }).click();
  await page.getByRole("button", { name: "Qabul qilish", exact: true }).click();
  await expect
    .poll(async () => (await state(page)).market.groupInvitations[0].status)
    .toBe("accepted");
  expect(
    (await state(page)).market.enrollments.filter(
      (e: any) => e.studentId === "account-ali" && e.active,
    ).length,
  ).toBe(1);
  await page.reload();
  expect(
    (await state(page)).market.enrollments.filter(
      (e: any) => e.studentId === "account-ali" && e.active,
    ).length,
  ).toBe(1);
  await expect(
    page.getByRole("button", { name: "Qabul qilish", exact: true }),
  ).toHaveCount(0);
});
