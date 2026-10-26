type IntegerArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;
type DigestInput = ArrayBuffer | ArrayBufferView;
type Digest = (
  algorithm: string | { name: string },
  data: DigestInput,
) => Promise<ArrayBuffer>;
type NativeCrypto = {
  getRandomValues: <T extends IntegerArray>(array: T) => T;
  randomUUID: () => string;
  sha256: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>;
};
export type CryptoScope = {
  crypto?: {
    getRandomValues?: NativeCrypto["getRandomValues"];
    randomUUID?: () => string;
    subtle?: { digest?: Digest };
  };
};

// Hermes may expose only part of WebCrypto. Supabase checks for crypto's
// presence before calling getRandomValues, so a digest-only object is unsafe.
export function installNativeCrypto(scope: CryptoScope, native: NativeCrypto) {
  const crypto = (scope.crypto ??= {});
  if (typeof crypto.getRandomValues !== "function")
    crypto.getRandomValues = (array) => native.getRandomValues(array);
  if (typeof crypto.randomUUID !== "function")
    crypto.randomUUID = () => native.randomUUID();
  const subtle = (crypto.subtle ??= {});
  if (typeof subtle.digest !== "function")
    subtle.digest = async (algorithm, data) => {
      const name = typeof algorithm === "string" ? algorithm : algorithm.name;
      if (name.toUpperCase() !== "SHA-256")
        throw new Error("Native digest supports SHA-256 only.");
      const source = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      // Hash the exact bytes, including view offsets; no TextDecoder is needed.
      return native.sha256(new Uint8Array(source));
    };
}
