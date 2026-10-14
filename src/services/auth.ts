import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOAuthCallbackHandler } from "./authFlow";

export type SocialProvider = "google" | "apple";
WebBrowser.maybeCompleteAuthSession();
export const authRedirectUrl = () =>
  Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.origin}/`
    : makeRedirectUri({ scheme: "darsino", path: "auth/callback" });

let callbackClient: SupabaseClient | undefined;
let callback: ReturnType<typeof createOAuthCallbackHandler> | undefined;
export async function completeOAuthRedirect(
  client: SupabaseClient,
  url: string,
) {
  if (!callback || callbackClient !== client) {
    callbackClient = client;
    callback = createOAuthCallbackHandler(client, authRedirectUrl());
  }
  const completed = await callback(url);
  if (completed && Platform.OS === "web")
    window.history.replaceState({}, "", window.location.pathname);
  return completed;
}
export async function restoreOAuthRedirect(client: SupabaseClient) {
  const url =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.href
      : await Linking.getInitialURL();
  if (url) await completeOAuthRedirect(client, url);
}
export function onOAuthRedirect(
  client: SupabaseClient,
  onComplete: () => void,
  onError: (error: Error) => void,
) {
  const subscription = Linking.addEventListener("url", ({ url }) => {
    completeOAuthRedirect(client, url)
      .then((done) => {
        if (done) onComplete();
      })
      .catch(onError);
  });
  return () => subscription.remove();
}

export async function signInSocial(
  client: SupabaseClient,
  provider: SocialProvider,
): Promise<boolean> {
  if (provider === "apple" && Platform.OS === "ios") {
    const Apple = await import("expo-apple-authentication");
    if (await Apple.isAvailableAsync()) {
      const nonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      );
      try {
        const credential = await Apple.signInAsync({
          requestedScopes: [
            Apple.AppleAuthenticationScope.FULL_NAME,
            Apple.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashed,
        });
        if (!credential.identityToken)
          throw new Error("Apple tasdiqlash ma’lumotini qaytarmadi.");
        const { error } = await client.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
          nonce,
        });
        if (error) throw new Error(error.message);
        // Apple shares a name only at first consent. Keep it as a form prefill;
        // roles and verification authority still come exclusively from SQL.
        const name = [
          credential.fullName?.givenName,
          credential.fullName?.familyName,
        ]
          .filter(Boolean)
          .join(" ");
        if (name) await client.auth.updateUser({ data: { full_name: name } });
        return true;
      } catch (error) {
        if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED")
          return false;
        throw error;
      }
    }
  }
  const redirectTo = authRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === "google"
        ? { queryParams: { prompt: "select_account" } }
        : {}),
    },
  });
  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("Akkaunt orqali kirish manzili olinmadi.");
  if (Platform.OS === "web") {
    window.location.assign(data.url);
    return false;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return false;
  return completeOAuthRedirect(client, result.url);
}
