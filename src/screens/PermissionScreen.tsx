import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { AppText, Button, Card, Header, Screen } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { useAppNavigation } from "../navigation";
import {
  currentLocation,
  locationPermission,
  openDeviceSettings,
  type LocationPermission,
} from "../services/permissions";
import { C } from "../theme";
export function PermissionScreen() {
  const navigation = useAppNavigation(),
    action = useAction();
  const [location, setLocation] = useState<LocationPermission>("ask");
  useEffect(() => {
    void locationPermission()
      .then(setLocation)
      .catch(() => setLocation("ask"));
  }, []);
  return (
    <Screen>
      <Header title="Ruxsatlar va xotira" onBack={() => navigation.goBack()} />
      <Card>
        <AppText variant="heading">Joylashuv</AppText>
        <AppText color={C.muted}>
          Yaqindagi ustozlarni topish uchun. Joylashuv faqat tugmani
          bosganingizda aniqlanadi.
        </AppText>
        <AppText>
          Holat:{" "}
          {location === "granted"
            ? "Ruxsat berilgan"
            : location === "blocked"
              ? "Sozlamadan yoqish kerak"
              : "Ruxsat berilmagan"}
        </AppText>
        <Button
          title="Joylashuvni tekshirish"
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              try {
                await currentLocation();
                action.setSuccess(
                  "Joylashuv aniqlandi. Xaritada «Yaqinimdagi ustozlar»ni bosing.",
                );
              } finally {
                setLocation(await locationPermission());
              }
            })
          }
        />
        {Platform.OS !== "web" ? (
          <Button
            title="Qurilma sozlamalari"
            variant="outline"
            onPress={() => action.run(openDeviceSettings)}
          />
        ) : null}
      </Card>
      <Card>
        <AppText variant="heading">Rasmlar va fayllar</AppText>
        <AppText color={C.muted}>
          Tizim oynasidan tanlagan rasm, video yoki hujjatga ruxsat berasiz.
          Barcha fayllaringizni o‘qish ruxsati talab qilinmaydi.
        </AppText>
        <AppText variant="caption" color={C.muted}>
          Profil rasmini Profil bo‘limida, dars faylini guruhning Materiallar
          bo‘limida tanlang. Tanlashni bekor qilish mumkin.
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">QR skanerlash</AppText>
        <AppText color={C.muted}>
          Kamera faqat QR kodni o‘qish uchun ishlatiladi. Tasvir serverga
          yuborilmaydi.
        </AppText>
        <Button
          title="QR skanerlash"
          icon="camera"
          variant="soft"
          onPress={() => navigation.navigate("ScanContact")}
        />
      </Card>
      <Card>
        <AppText variant="heading">Ilova xotirasi</AppText>
        <AppText color={C.muted}>
          Jonli akkauntda sozlamalar, test progressi va xona rejalari serverda
          saqlanadi. Sinov rejimida ma’lumotlar faqat shu qurilmada qoladi.
        </AppText>
      </Card>
      <Feedback {...action} />
    </Screen>
  );
}
