import "react-native-url-polyfill/auto";
import * as Crypto from "expo-crypto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createChunkedStorage } from "./secureStorage";
import type { MarketCommand, Marketplace, User } from "../state/domain";

// Polyfill WebCrypto subtle.digest so Supabase Auth uses S256 PKCE without warnings
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = {};
}
if (!globalThis.crypto.subtle && Platform.OS !== "web") {
  (globalThis.crypto as any).subtle = {
    digest: async (_algorithm: string, data: Uint8Array | ArrayBuffer) => {
      const text =
        typeof data === "string"
          ? data
          : new TextDecoder().decode(
              data instanceof Uint8Array ? data : new Uint8Array(data),
            );
      const hex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        text,
        { encoding: Crypto.CryptoEncoding.HEX },
      );
      const match = hex.match(/.{1,2}/g) || [];
      const bytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
      return bytes.buffer;
    },
  };
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const backendMode =
  process.env.EXPO_PUBLIC_BACKEND_MODE === "demo"
    ? "demo"
    : process.env.EXPO_PUBLIC_BACKEND_MODE === "supabase" || url || key
      ? "supabase"
      : "demo";

// Auth credentials never enter the marketplace cache. Native tokens use the OS keychain.
const nativeStorage = createChunkedStorage(SecureStore);
const backend = (() => {
  if (backendMode === "demo") return { client: null, error: "" };
  if (!url || !key)
    return {
      client: null,
      error:
        "Supabase sozlamalari yetishmayapti. .env.example dagi manzil va ochiq kalitni kiriting.",
    };
  try {
    return {
      client: createClient(url, key, {
        auth: {
          storage: Platform.OS === "web" ? AsyncStorage : nativeStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      }),
      error: "",
    };
  } catch {
    return {
      client: null,
      error:
        "Supabase manzili yoki ochiq kaliti noto‘g‘ri. .env sozlamalarini tekshiring.",
    };
  }
})();
export const supabase = backend.client;
export function requireBackend() {
  if (!supabase)
    throw new Error(backend.error || "Server bilan ulanish sozlanmagan.");
  return supabase;
}
export type Snapshot = { market: Marketplace; user: User; id?: string };
export async function fetchSnapshot(): Promise<Snapshot> {
  const { data, error } = await requireBackend().rpc("darsino_snapshot");
  if (error) throw new Error(error.message);
  return data as Snapshot;
}
export async function mutateBackend(
  command: MarketCommand,
  actorId: string,
): Promise<Snapshot> {
  const { data, error } = await requireBackend().rpc("darsino_mutate", {
    command: { ...command, actorId },
  });
  if (error) throw new Error(error.message);
  return data as Snapshot;
}
