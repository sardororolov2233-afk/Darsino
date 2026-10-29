import { LocalizedPressable as Pressable } from "../i18n/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Apple from "expo-apple-authentication";
import { AppText } from "./ui";
import type { SocialProvider } from "../services/auth";
import { C } from "../theme";

function ProviderMark({ provider }: { provider: SocialProvider }) {
  return provider === "google" ? (
    <Svg width={22} height={22} viewBox="0 0 48 48" accessible={false}>
      <Path
        fill="#4285F4"
        d="M43.6 24.5c0-1.5-.1-2.9-.4-4.3H24v8.1h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"
      />
      <Path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2a12.3 12.3 0 0 1-18.3-6.4H5.6v5.4A20.4 20.4 0 0 0 24 44Z"
      />
      <Path
        fill="#FBBC05"
        d="M12.5 27.5a12.2 12.2 0 0 1 0-7V15H5.6a20.4 20.4 0 0 0 0 18l6.9-5.5Z"
      />
      <Path
        fill="#EA4335"
        d="M24 12c3 0 5.6 1 7.7 3l5.9-5.9A20.1 20.1 0 0 0 5.6 15l6.9 5.5A12.2 12.2 0 0 1 24 12Z"
      />
    </Svg>
  ) : (
    <Svg width={22} height={24} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill="white"
        d="M16.4 1.1c.1 1.2-.4 2.4-1.1 3.2-.8.9-2 1.6-3.2 1.5-.2-1.2.4-2.4 1.1-3.2.8-.9 2-1.5 3.2-1.5Zm3.9 16.7c-.5 1.1-.7 1.6-1.4 2.6-.9 1.3-2.2 2.9-3.7 2.9-1.4 0-1.8-.9-3.6-.9s-2.3.9-3.7.9c-1.5 0-2.7-1.4-3.6-2.7C1.7 17 1.3 11.9 3 9.2c1.2-1.9 3-3 4.8-3 1.6 0 2.7.9 4 .9 1.2 0 2-.9 4-.9 1.5 0 3.1.8 4.3 2.2-3.8 2.1-3.2 7.5.2 9.4Z"
      />
    </Svg>
  );
}

export function ProviderButtons({
  onPress,
  busy,
  demo,
  dark = false,
  providers = ["google", "apple"],
}: {
  onPress: (provider: SocialProvider) => void;
  busy: boolean;
  demo: boolean;
  dark?: boolean;
  providers?: SocialProvider[];
}) {
  const [nativeApple, setNativeApple] = useState(false);
  useEffect(() => {
    let live = true;
    if (Platform.OS === "ios" && !demo)
      Apple.isAvailableAsync()
        .then((available) => {
          if (live) setNativeApple(available);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [demo]);
  return (
    <View style={{ gap: 12 }}>
      {providers.map((provider) =>
        provider === "apple" && nativeApple ? (
          <View
            key={provider}
            pointerEvents={busy ? "none" : "auto"}
            style={{ opacity: busy ? 0.5 : 1 }}
          >
            <Apple.AppleAuthenticationButton
              buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={{ width: "100%", height: 54 }}
              onPress={() => onPress("apple")}
            />
          </View>
        ) : (
          <Pressable
            key={provider}
            onPress={() => onPress(provider)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`${provider === "google" ? "Google" : "Apple"} orqali davom etish`}
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: 16,
              borderWidth: provider === "google" ? 1 : 0,
              borderColor: dark ? "#43506A" : C.border,
              backgroundColor: dark
                ? "#1D2D49"
                : provider === "google"
                  ? C.white
                  : "#141414",
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 14,
              opacity: busy ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator
                color={provider === "google" ? C.navy : C.white}
              />
            ) : (
              <ProviderMark provider={provider} />
            )}
            <AppText
              variant="label"
              color={dark ? C.white : provider === "google" ? C.ink : C.white}
              style={{ flexShrink: 1 }}
            >
              {provider === "google" ? "Google" : "Apple"} orqali davom etish
            </AppText>
          </Pressable>
        ),
      )}
    </View>
  );
}
