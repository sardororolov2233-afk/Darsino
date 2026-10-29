import AsyncStorage from "@react-native-async-storage/async-storage";
export async function clearAccountCache(account: string) {
  if (!account) return;
  const encoded = encodeURIComponent(account);
  await AsyncStorage.multiRemove([
    "@oqi/learning-v1:" + encoded,
    "@oqi/teacher-v1:" + encoded,
    "@oqi/homework-cache-v1:" + encoded,
    `@oqi/onboarding-v1/${account}/student`,
    `@oqi/onboarding-v1/${account}/tutor`,
  ]);
}
