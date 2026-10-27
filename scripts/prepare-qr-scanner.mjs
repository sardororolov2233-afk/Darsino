import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const reader = require.resolve("zxing-wasm/reader");
const target = new URL("../public/qr/", import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(
  resolve(dirname(reader), "../../reader/zxing_reader.wasm"),
  new URL("zxing_reader.wasm", target),
);
await copyFile(
  resolve(dirname(reader), "../../../LICENSE"),
  new URL("LICENSE.txt", target),
);
console.log("QR decoder prepared for same-origin, offline browser scanning.");
