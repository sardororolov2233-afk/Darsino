import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EAS_BUILD === "true") {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const missing = [
      ...(process.env.EXPO_PUBLIC_BACKEND_MODE !== "supabase"
        ? ["EXPO_PUBLIC_BACKEND_MODE"]
        : []),
      ...(!url?.trim() ? ["EXPO_PUBLIC_SUPABASE_URL"] : []),
      ...(!key?.trim() ? ["EXPO_PUBLIC_SUPABASE_ANON_KEY"] : []),
    ];
    if (missing.length)
      throw new Error(
        `EAS build configuration required: ${missing.join(", ")}.`,
      );

    let validUrl = false;
    try {
      const parsed = new URL(url!);
      // Native releases use a public HTTPS endpoint, never local emulator URLs
      // or a URL containing inline credentials, query tokens or fragments.
      const hostname = parsed.hostname.toLowerCase();
      validUrl =
        url === url!.trim() &&
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        !parsed.search &&
        !parsed.hash &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i.test(
          hostname,
        ) &&
        !/\.(?:localhost|local|internal|test|invalid|example)$/.test(hostname);
    } catch {
      // Parsing errors may include their input. Return only the variable name.
    }
    if (!validUrl)
      throw new Error(
        "EAS build requires a public HTTPS EXPO_PUBLIC_SUPABASE_URL.",
      );

    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key!);
    if (
      !publicKey &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key!)
    ) {
      try {
        const payload = JSON.parse(
          Buffer.from(key!.split(".")[1], "base64url").toString("utf8"),
        );
        publicKey = payload?.role === "anon";
      } catch {
        // Never print the candidate key, JWT payload or parser error.
      }
    }
    if (!publicKey)
      throw new Error(
        "EAS build requires a publishable or anon EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
  }

  return {
    ...config,
    name: config.name || "O‘qi",
    slug: config.slug || "oqi",
    plugins: [
      ...(config.plugins || []),
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || "",
        },
      ],
    ],
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || "",
        },
      },
    },
  };
};
