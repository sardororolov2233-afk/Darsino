import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/i18n/translate";
import { translationRows } from "../src/i18n/catalog";
import { LANGUAGES, contactLink, normalizePublicId } from "../src/state/account";
import { qrcodegen } from "../src/vendor/qrcodegen";
test("five locales have complete rows and preserve template values and user content", () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ["uz", "ru", "en", "kk", "ky"]);
  assert.equal(new Set(translationRows.map((r) => r[0])).size, translationRows.length);
  for (const row of translationRows) {
    assert.equal(row.length, 5);
    const tokens = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const text of row) { assert.ok(text.trim()); assert.deepEqual(tokens(text), tokens(row[0])); }
  }
  assert.equal(translate("Sozlamalar", "en"), "Settings");
  assert.equal(translate("Sozlamalar", "ru"), "Настройки");
  assert.equal(translate("Sozlamalar", "kk"), "Баптаулар");
  assert.equal(translate("Sozlamalar", "ky"), "Жөндөөлөр");
  assert.equal(translate("Kontakt takliflari · 3", "en"), "Contact requests · 3");
  assert.equal(translate(" Ali Valiyev ", "en"), " Ali Valiyev ");
});
test("profile and authenticator payloads generate QR matrices with intact finder patterns", () => {
  for (const value of [contactLink("oqi_1234567890abcdef"), "otpauth://totp/Oqi%3Auser?secret=JBSWY3DPEHPK3PXP&issuer=Oqi"]) {
    const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM);
    assert.ok(qr.size >= 21 && qr.size <= 177 && (qr.size - 17) % 4 === 0);
    for (const [x, y] of [[0, 0], [qr.size - 7, 0], [0, qr.size - 7]])
      for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++)
        assert.equal(qr.getModule(x + dx, y + dy), dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
  }
  assert.equal(normalizePublicId(contactLink("ali_valiyev")), "ali_valiyev");
});
