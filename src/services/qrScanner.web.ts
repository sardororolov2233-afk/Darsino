let ready: Promise<void> | null = null;
export function prepareQrScanner(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    const environment = globalThis as typeof globalThis & {
      BarcodeDetector?: unknown;
    };
    const native = environment.BarcodeDetector as
      { getSupportedFormats?: () => Promise<string[]> } | undefined;
    if (native?.getSupportedFormats) {
      try {
        if ((await native.getSupportedFormats()).includes("qr_code")) return;
      } catch {
        /* Use the local decoder when the browser API cannot read QR codes. */
      }
    }
    const { BarcodeDetector, prepareZXingModule } =
      await import("barcode-detector/ponyfill");
    await prepareZXingModule({
      fireImmediately: true,
      overrides: {
        locateFile: (path: string) =>
          path.endsWith(".wasm")
            ? new URL(
                `${process.env.EXPO_BASE_URL || ""}/qr/zxing_reader.wasm`,
                window.location.origin,
              ).href
            : path,
      },
    });
    environment.BarcodeDetector = BarcodeDetector;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
