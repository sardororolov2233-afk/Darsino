import * as Location from "expo-location";
import { Linking } from "react-native";

export type Coordinates = { latitude: number; longitude: number };
export type LocationPermission = "granted" | "ask" | "denied" | "blocked";
export async function locationPermission(): Promise<LocationPermission> {
  const result = await Location.getForegroundPermissionsAsync();
  if (result.granted) return "granted";
  if (!result.canAskAgain) return "blocked";
  return result.status === "undetermined" ? "ask" : "denied";
}
export async function currentLocation(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      permission.canAskAgain
        ? "Joylashuvga ruxsat berilmadi. Xaritadan va ro‘yxatdan foydalanishingiz mumkin."
        : "Joylashuv ruxsati yopilgan. Qurilma sozlamalaridan yoqing.",
    );
  // A disabled GPS must not leave the interface waiting forever.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Joylashuv aniqlanmadi. GPS va internetni tekshirib qayta urining.",
              ),
            ),
          15000,
        );
      }),
    ]);
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export const openDeviceSettings = () => Linking.openSettings();
