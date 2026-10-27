import { chromium, expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { demoMarketplace } from "../src/state/demo";
import { blankUser } from "../src/state/domain";
import { contactLink, defaultPublicId } from "../src/state/account";
import { qrcodegen } from "../src/vendor/qrcodegen";
const cache = "@darsino/marketplace-v2";
async function video(path: string, id: string) {
  const qr = qrcodegen.QrCode.encodeText(
      contactLink(id),
      qrcodegen.QrCode.Ecc.MEDIUM,
    ),
    width = 640,
    height = 480,
    scale = 8;
  const y = Buffer.alloc(width * height, 235),
    x0 = Math.floor((width - qr.size * scale) / 2),
    y0 = Math.floor((height - qr.size * scale) / 2);
  for (let row = 0; row < qr.size; row++)
    for (let col = 0; col < qr.size; col++)
      if (qr.getModule(col, row))
        for (let py = 0; py < scale; py++)
          y.fill(
            16,
            (y0 + row * scale + py) * width + x0 + col * scale,
            (y0 + row * scale + py) * width + x0 + (col + 1) * scale,
          );
  const uv = Buffer.alloc((width * height) / 2, 128),
    frame = Buffer.concat([Buffer.from("FRAME\n"), y, uv]);
  await writeFile(
    path,
    Buffer.concat([
      Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`),
      ...Array(10).fill(frame),
    ]),
  );
}
async function seed(page: Page, actor: string) {
  const market = demoMarketplace();
  market.users.push({
    ...blankUser,
    id: "qr-learner",
    name: "QR Learner",
    email: "qr-learner@example.test",
    onboarded: true,
  });
  await page.addInitScript(
    ({ cache, raw }) => {
      Object.defineProperty(globalThis, "BarcodeDetector", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      if (!localStorage.getItem(cache)) localStorage.setItem(cache, raw);
    },
    { cache, raw: JSON.stringify({ market, actorId: actor }) },
  );
  await page.goto("/");
}
async function swap(page: Page, actorId: string) {
  await page.evaluate(
    ({ cache, actorId }) => {
      const state = JSON.parse(localStorage.getItem(cache)!);
      state.actorId = actorId;
      localStorage.setItem(cache, JSON.stringify(state));
    },
    { cache, actorId },
  );
  await page.reload();
}
async function localOnly(page: Page) {
  const remote: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.protocol.startsWith("http") &&
      !["127.0.0.1", "localhost"].includes(url.hostname)
    ) {
      remote.push(url.hostname);
      return route.abort();
    }
    return route.continue();
  });
  return remote;
}
for (const direction of [
  {
    name: "student scans teacher",
    actor: "qr-learner",
    target: "dilnoza",
    person: "Dilnoza Karimova",
  },
  {
    name: "teacher scans student",
    actor: "dilnoza",
    target: "qr-learner",
    person: "QR Learner",
  },
]) {
  test(`${direction.name}: real camera frames decode a real QR locally and resolve the other account`, async ({
    baseURL,
  }) => {
    const path = `/tmp/oqi-camera-${direction.actor}.y4m`;
    await video(path, defaultPublicId(direction.target));
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: [
        "--no-sandbox",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-video-capture=${path}`,
      ],
    });
    try {
      const page = await browser.newPage({
        baseURL,
        permissions: ["camera"],
        viewport: { width: 390, height: 844 },
      });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const remote = await localOnly(page);
      let wasm = false;
      page.on("response", (r) => {
        if (r.url().endsWith("/qr/zxing_reader.wasm") && r.ok()) wasm = true;
      });
      await seed(page, direction.actor);
      await page
        .getByRole("button", { name: "QR skanerlash", exact: true })
        .click();
      await expect(
        page.getByText(direction.person, { exact: true }).last(),
      ).toBeVisible({ timeout: 25000 });
      await expect(
        page.getByRole("button", {
          name: "Kontakt taklifi yuborish",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({ path: `test-results/qr-${direction.actor}.png` });
      await page
        .getByRole("button", { name: "Kontakt taklifi yuborish", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Javob kutilmoqda", exact: true }),
      ).toBeDisabled();
      await swap(page, direction.target);
      await page.getByRole("tab", { name: "Profil", exact: true }).click();
      await page
        .getByRole("button", { name: "Kontaktlarim", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Qabul qilish", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Yozish", exact: true }),
      ).toBeVisible();
      expect(wasm).toBe(true);
      expect(remote).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}

test("a saved QR image resolves the account without requesting the camera", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const remote = await localOnly(page);
  await seed(page, "dilnoza");
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", { name: "Mening ID va QR kodim", exact: true })
    .click();
  const path = "/tmp/oqi-share-contact-code.png";
  await page
    .locator('svg[aria-label="O‘qi kontakt QR kodi"]')
    .screenshot({ path });
  await swap(page, "qr-learner");
  await page
    .getByRole("button", { name: "QR skanerlash", exact: true })
    .click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "QR rasmini tanlash", exact: true })
    .click();
  await (await chooser).setFiles(path);
  await expect(
    page.getByText("Dilnoza Karimova", { exact: true }).last(),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole("button", { name: "Kontakt taklifi yuborish", exact: true }),
  ).toBeVisible();
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
});
