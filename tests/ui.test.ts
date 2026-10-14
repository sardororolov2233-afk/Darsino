import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { JSDOM, VirtualConsole, requestInterceptor } from "jsdom";
import { nextDates } from "../src/state/domain";

// Runs the real exported Expo bundle. Font/observer stubs replace browser layout APIs only.
const root = resolve("dist");
const cacheKey = "@darsino/marketplace-v2";
async function app(saved?: string, photoBrowserStubs = false) {
  assert.ok(
    existsSync(join(root, "index.html")),
    "Run npm run test:ui to export the app first.",
  );
  const errors: string[] = [],
    console = new VirtualConsole();
  console.on("jsdomError", (e) => errors.push(e.message));
  console.on("error", (...args) => errors.push(args.map(String).join(" ")));
  const dom = new JSDOM(readFileSync(join(root, "index.html"), "utf8"), {
    url: "https://darsino.test",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: console,
    resources: {
      interceptors: [
        requestInterceptor((request) => {
          const url = new URL(request.url);
          const file = join(root, decodeURIComponent(url.pathname));
          if (url.hostname !== "darsino.test")
            throw new Error("Demo UI attempted an external request");
          return new Response(existsSync(file) ? readFileSync(file) : "", {
            status: existsSync(file) ? 200 : 404,
            headers: {
              "Content-Type": file.endsWith(".js")
                ? "text/javascript"
                : "application/octet-stream",
            },
          });
        }),
      ],
    },
    beforeParse(w) {
      if (photoBrowserStubs) {
        // JSDOM has no image decoder/canvas encoder. Exercise the real picker,
        // manipulator calls, preview, save/remove UI and persistence with these
        // browser primitives stubbed; this does not check image pixel quality.
        let blobId = 0;
        w.URL.createObjectURL = () => `blob:https://darsino.test/${++blobId}`;
        w.URL.revokeObjectURL = () => {};
        w.Image = function () {
          const element = w.document.createElement("img");
          Object.defineProperties(element, {
            naturalWidth: { value: 800 },
            naturalHeight: { value: 600 },
            src: {
              get: () => "blob:photo",
              set: () =>
                queueMicrotask(() =>
                  element.dispatchEvent(new w.Event("load")),
                ),
            },
          });
          return element;
        } as unknown as typeof w.Image;
        w.HTMLCanvasElement.prototype.getContext = (() => ({
          drawImage() {},
          clearRect() {},
          getImageData: (
            _x: number,
            _y: number,
            width: number,
            height: number,
          ) => ({
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData() {},
          createImageData: (width: number, height: number) => ({
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4),
          }),
        })) as any;
        w.HTMLCanvasElement.prototype.toBlob = function (callback, type) {
          callback(
            new w.Blob(["stub-image-bytes"], { type: type || "image/png" }),
          );
        };
      }
      w.matchMedia = (q) => ({
        matches: false,
        media: q,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
        onchange: null,
      });
      w.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      w.TextEncoder = TextEncoder;
      w.TextDecoder = TextDecoder;
      Object.defineProperty(w.document, "fonts", {
        value: {
          add() {},
          delete() {},
          load() {
            return Promise.resolve([{}]);
          },
          check() {
            return true;
          },
          ready: Promise.resolve(),
        },
      });
      w.performance.mark = (name) => ({
        name,
        entryType: "mark",
        startTime: 0,
        duration: 0,
        detail: null,
        toJSON() {
          return {};
        },
      });
      w.performance.measure = (name) => ({
        name,
        entryType: "measure",
        startTime: 0,
        duration: 0,
        detail: null,
        toJSON() {
          return {};
        },
      });
      if (saved) w.localStorage.setItem(cacheKey, saved);
    },
  });
  const w = dom.window,
    doc = w.document;
  function active(element: Element) {
    for (let p: Element | null = element; p; p = p.parentElement) {
      if (
        p.getAttribute("aria-hidden") === "true" ||
        p.hasAttribute("inert") ||
        w.getComputedStyle(p).display === "none" ||
        w.getComputedStyle(p).visibility === "hidden"
      )
        return false;
    }
    return true;
  }
  function find(label: string, role = "button") {
    return [...doc.querySelectorAll(`[role="${role}"]`)]
      .filter(
        (e) =>
          active(e) &&
          (e.getAttribute("aria-label") || e.textContent?.trim()) === label,
      )
      .at(-1) as HTMLElement | undefined;
  }
  function text(value: string) {
    return [...doc.querySelectorAll("div,span")].some(
      (e) =>
        e.children.length === 0 && active(e) && e.textContent?.includes(value),
    );
  }
  async function wait(check: () => unknown, label: string) {
    const end = Date.now() + 10000;
    while (Date.now() < end) {
      if (check()) return;
      if (errors.length) throw new Error(errors.join("\n"));
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(
      `UI did not reach: ${label}\n${doc.body.textContent?.slice(-1800)}`,
    );
  }
  async function click(label: string, role = "button") {
    await wait(() => {
      const element = find(label, role);
      return (
        element &&
        element.getAttribute("aria-disabled") !== "true" &&
        !element.hasAttribute("disabled")
      );
    }, label);
    find(label, role)!.dispatchEvent(
      new w.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        altKey: false,
      }),
    );
    await new Promise((r) => setTimeout(r, 30));
  }
  async function fill(label: string, value: string) {
    await wait(
      () =>
        [...doc.querySelectorAll("input,textarea")].some(
          (e) => e.getAttribute("aria-label") === label && active(e),
        ),
      label,
    );
    const field = [...doc.querySelectorAll("input,textarea")].find(
      (e) => e.getAttribute("aria-label") === label && active(e),
    ) as HTMLInputElement;
    const proto =
      field.tagName === "TEXTAREA"
        ? w.HTMLTextAreaElement.prototype
        : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(field, value);
    field.dispatchEvent(new w.Event("input", { bubbles: true }));
    field.dispatchEvent(new w.Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  }
  async function login(email: string) {
    await click("Boshlash");
    await fill("Email manzilingiz", email);
    await click("Emailga kod yuborish");
    await fill("Email tasdiqlash kodi", "421806");
    await click("Tasdiqlash");
  }
  async function logout() {
    await click("Profil", "tab");
    await click("Hisobdan chiqish");
    await click("Chiqishni tasdiqlash");
    await wait(() => find("Boshlash"), "signed out");
  }
  return {
    dom,
    errors,
    text,
    wait,
    click,
    fill,
    login,
    logout,
    find,
    cache: () => w.localStorage.getItem(cacheKey)!,
  };
}

test(
  "exported student and tutor UI completes application → approval → My Lessons and persists chat",
  { timeout: 60000 },
  async () => {
    let ui = await app();
    try {
      await ui.login("sardor@example.com");
      await ui.fill("Ism va familiya", "Sardor Test");
      await ui.click("Universitetga kirish");
      await ui.click("Darsinoga kirish");
      await ui.wait(() => ui.text("Bugun nimani"), "student home");
      await ui.click("Guruhlar");
      await ui.click("IELTS 6.5+ guruhi tafsilotlari");
      await ui.click("Guruhga ariza yuborish");
      await ui.wait(() => ui.text("Tasdiqlash kutilmoqda"), "pending request");
      await ui.click("Darslarimni ko‘rish");
      await ui.click("Guruhlar");
      await ui.wait(
        () => ui.text("Guruhlar hali qo‘shilmagan"),
        "not enrolled while pending",
      );
      await ui.logout();
      await ui.login("dilnoza@darsino.demo");
      await ui.wait(() => ui.text("Repetitor kabineti"), "tutor home");
      await ui.click("Arizalar", "tab");
      await ui.fill("O‘quvchiga izoh", "Xush kelibsiz");
      await ui.click("Tasdiqlash");
      await ui.wait(() => ui.text("Yangi arizalar yo‘q"), "approval saved");
      await ui.click("Darslar", "tab");
      await ui.click("IELTS 6.5+ guruhini boshqarish");
      await ui.wait(() => ui.text("Sardor Test"), "real participant appears");
      await ui.click("Tanlangan dars vaqtini o‘zgartirish");
      await ui.fill("Yangi sana (YYYY-MM-DD)", nextDates(9)[8]);
      await ui.fill("Yangi vaqt (HH:MM)", "10:00");
      await ui.click("Jadvalni saqlash");
      await ui.click("Orqaga");
      await ui.logout();
      await ui.login("sardor@example.com");
      await ui.wait(
        () => ui.text("Bugun nimani"),
        "returning student skips onboarding",
      );
      await ui.click("Darslarim", "tab");
      await ui.wait(() => ui.text("IELTS 6.5+ guruhi"), "approved schedule");
      await ui.click("Guruhlar");
      await ui.wait(() => ui.text("Qabul qilingansiz"), "approved group");
      await ui.click("Profil", "tab");
      await ui.click("Bildirishnomalar");
      await ui.wait(
        () =>
          ui.text("Arizangiz tasdiqlandi") && ui.text("Dars vaqti o‘zgardi"),
        "student notifications",
      );
      await ui.click("Orqaga");
      await ui.click("Darslarim", "tab");
      await ui.click("Jadval");
      await ui.click("Ustozga yozish");
      await ui.fill("Xabar yozing", "Darsga tayyorman.");
      await ui.click("Xabarni yuborish");
      await ui.wait(() => ui.text("Darsga tayyorman."), "student message");
      await ui.click("Orqaga");
      await ui.logout();
      await ui.login("dilnoza@darsino.demo");
      await ui.click("Chat", "tab");
      await ui.click("Suhbat: Sardor Test");
      await ui.wait(
        () => ui.text("Darsga tayyorman."),
        "tutor receives the same message",
      );
      await ui.fill("Xabar yozing", "Jadvalni tekshirib ko‘ring.");
      await ui.click("Xabarni yuborish");
      await ui.click("Orqaga");
      await ui.logout();
      await ui.login("sardor@example.com");
      await ui.wait(() => ui.text("Bugun nimani"), "student return");
      await ui.wait(
        () => JSON.parse(ui.cache()).actorId === "email-sardor@example.com",
        "cache saved",
      );
      const saved = ui.cache();
      assert.deepEqual(ui.errors, []);
      ui.dom.window.close();
      ui = await app(saved);
      await ui.wait(() => ui.text("Bugun nimani"), "session restored");
      await ui.click("Chat", "tab");
      await ui.click("Suhbat: Dilnoza Karimova");
      await ui.wait(
        () => ui.text("Jadvalni tekshirib ko‘ring."),
        "conversation persists",
      );
      const data = JSON.parse(ui.cache());
      assert.equal(
        data.market.enrollments.filter((e: any) => e.active).length,
        1,
      );
      assert.equal(data.market.messages.length, 2);
      assert.deepEqual(ui.errors, []);
    } finally {
      ui.dom.window.close();
    }
  },
);

test(
  "exported sign-in shows email, Google and Apple with validation and the chosen role",
  { timeout: 60000 },
  async () => {
    for (const provider of ["Google", "Apple"]) {
      const ui = await app();
      try {
        if (provider === "Apple") await ui.click("Repetitor");
        await ui.click("Boshlash");
        await ui.wait(
          () =>
            ui.find("Google orqali davom etish") &&
            ui.find("Apple orqali davom etish"),
          "social login choices",
        );
        await ui.click("Emailga kod yuborish");
        await ui.wait(
          () => ui.text("To‘g‘ri email manzilini kiriting."),
          "email error",
        );
        assert.equal(ui.text("SMS tasdiqlash kodi"), false);
        // Allow RN Web to flush its disabled-state passive effect after validation.
        await new Promise((r) => setTimeout(r, 500));
        await ui.click(`${provider} orqali davom etish`);
        await ui.wait(
          () =>
            ui.find(
              provider === "Apple"
                ? "Profilni tekshiruvga yuborish"
                : "Darsinoga kirish",
            ),
          "provider onboarding",
        );
        await ui.wait(
          () =>
            !!ui.cache() &&
            JSON.parse(ui.cache()).actorId ===
              `email-${provider.toLowerCase()}@darsino.demo`,
          "demo provider session",
        );
        const saved = JSON.parse(ui.cache());
        assert.equal(
          saved.market.users.find((u: any) => u.id === saved.actorId).role,
          provider === "Apple" ? "tutor" : "student",
        );
        assert.deepEqual(ui.errors, []);
      } finally {
        ui.dom.window.close();
      }
    }
  },
);

test(
  "exported profile photo previews, persists after reload, cancels and removes",
  { timeout: 60000 },
  async () => {
    let ui = await app(undefined, true);
    try {
      await ui.login("dilnoza@darsino.demo");
      await ui.click("Profil", "tab");
      const choose = async () => {
        await ui.click(
          ui.find("Rasmni o‘zgartirish")
            ? "Rasmni o‘zgartirish"
            : "Rasm yuklash",
        );
        await ui.wait(
          () => ui.dom.window.document.querySelector('input[type="file"]'),
          "system file picker",
        );
        const input =
          ui.dom.window.document.querySelector('input[type="file"]')!;
        Object.defineProperty(input, "files", {
          value: [
            new ui.dom.window.File(["fake-photo"], "avatar.png", {
              type: "image/png",
            }),
          ],
        });
        input.dispatchEvent(
          new ui.dom.window.Event("change", { bubbles: true }),
        );
        await ui.wait(() => ui.find("Rasmni saqlash"), "photo preview ready");
      };
      await choose();
      await ui.click("Rasmni bekor qilish");
      assert.ok(
        !JSON.parse(ui.cache()).market.users.find(
          (u: any) => u.id === "dilnoza",
        ).demoAvatarUri,
      );
      await choose();
      await ui.click("Rasmni saqlash");
      await ui.wait(() => ui.text("Profil rasmi yangilandi."), "photo saved");
      await ui.wait(
        () =>
          JSON.parse(ui.cache())
            .market.users.find((u: any) => u.id === "dilnoza")
            .demoAvatarUri?.startsWith("data:image/jpeg;base64,"),
        "photo persisted",
      );
      const saved = ui.cache();
      assert.deepEqual(ui.errors, []);
      ui.dom.window.close();
      ui = await app(saved, true);
      await ui.click("Profil", "tab");
      await ui.click("Rasmni olib tashlash");
      await ui.wait(
        () => ui.text("Profil rasmi olib tashlandi."),
        "photo removed",
      );
      await ui.wait(
        () =>
          !JSON.parse(ui.cache()).market.users.find(
            (u: any) => u.id === "dilnoza",
          ).demoAvatarUri,
        "removal persisted",
      );
      assert.deepEqual(ui.errors, []);
    } finally {
      ui.dom.window.close();
    }
  },
);

test(
  "exported tutor onboarding requires moderator approval before creating a class",
  { timeout: 60000 },
  async () => {
    const ui = await app();
    try {
      await ui.click("Repetitor");
      await ui.login("yangi@example.com");
      await ui.fill("Ism va familiya", "Yangi Repetitor");
      await ui.fill("Yo‘nalish", "IELTS");
      await ui.fill("Tajriba (yil)", "3");
      await ui.fill("Tasdiqlash ma’lumoti", "Diplom D123456");
      await ui.fill(
        "Darslaringiz haqida",
        "IELTS uchun amaliy darslar o‘taman.",
      );
      await ui.click("Profilni tekshiruvga yuborish");
      await ui.wait(() => ui.text("Moderator tekshiruvida"), "pending tutor");
      assert.equal(
        ui.find("Yangi dars yoki guruh")!.getAttribute("aria-disabled"),
        "true",
      );
      await ui.logout();
      await ui.login("moderator@darsino.demo");
      await ui.click("Yangi Repetitor profilini tekshirish");
      await ui.wait(
        () => ui.text("Diplom D123456"),
        "moderator can read proof",
      );
      await ui.click("Repetitorni tasdiqlash");
      await ui.wait(() => ui.text("Navbat bo‘sh"), "moderation saved");
      await ui.logout();
      await ui.login("yangi@example.com");
      await ui.wait(() => ui.text("Tasdiqlangan repetitor"), "approved tutor");
      await ui.click("Yangi dars yoki guruh");
      await ui.fill("Dars / guruh nomi", "IELTS yangi guruh");
      await ui.fill("Onlayn dars manzili", "https://example.com/lesson");
      await ui.fill("Haftalik darslar soni", "2");
      await ui.click("Darsni e’lon qilish");
      await ui.wait(() => ui.text("Guruhni boshqarish"), "class created");
      const data = JSON.parse(ui.cache());
      await ui.wait(
        () =>
          JSON.parse(ui.cache()).market.offerings.some(
            (o: any) => o.title === "IELTS yangi guruh",
          ),
        "class persisted",
      );
      assert.ok(
        data.market.tutorProfiles.some(
          (p: any) =>
            p.userId === "email-yangi@example.com" &&
            p.verification === "approved",
        ),
      );
      assert.deepEqual(ui.errors, []);
    } finally {
      ui.dom.window.close();
    }
  },
);
