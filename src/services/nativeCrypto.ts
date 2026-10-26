import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { installNativeCrypto, type CryptoScope } from "./nativeCryptoRuntime";

if (Platform.OS !== "web")
  installNativeCrypto(globalThis as unknown as CryptoScope, {
    getRandomValues: (array) => Crypto.getRandomValues(array),
    randomUUID: () => Crypto.randomUUID(),
    sha256: (bytes) =>
      Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes),
  });
