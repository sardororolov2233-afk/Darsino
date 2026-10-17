import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { AppText, Button, Card, Field, Header, Screen } from "../components/ui";
import { MapSurface } from "../components/MapSurface";
import { Feedback, useAction } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { requireBackend } from "../services/backend";
import { createLocationService, validCoordinates } from "../services/locations";
import { currentLocation } from "../services/permissions";
import { C } from "../theme";
export function TutorLocationScreen() {
  const { user, mode } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [label, setLabel] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let live = true;
    if (mode === "supabase")
      void createLocationService(requireBackend())
        .own()
        .then((point) => {
          if (live && point) {
            setLatitude(String(point.latitude));
            setLongitude(String(point.longitude));
            setLabel(point.label);
          }
        })
        .catch((e) => {
          if (live) setLoadError(e.message);
        });
    return () => {
      live = false;
    };
  }, [user.id, mode]);
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  const valid =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    validCoordinates(point);
  if (user.role !== "tutor")
    return (
      <Screen>
        <Header title="Dars manzili" onBack={() => navigation.goBack()} />
        <AppText>Bu bo‘lim ustozlar uchun.</AppText>
      </Screen>
    );
  return (
    <Screen>
      <Header title="Dars manzili" onBack={() => navigation.goBack()} />
      <AppText color={C.muted}>
        O‘quvchilar ko‘rishi mumkin bo‘lgan dars manzilini belgilang. Xarita
        nuqtasi faqat saqlaganingizdan keyin chiqadi.
      </AppText>
      <Field
        label="Dars manzili nomi"
        value={label}
        onChangeText={setLabel}
        maxLength={200}
      />
      <Card>
        <Field
          label="Kenglik (latitude)"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Uzunlik (longitude)"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="numbers-and-punctuation"
        />
        <Button
          title="Hozirgi joylashuvni olish"
          icon="navigation"
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              const value = await currentLocation();
              setLatitude(value.latitude.toFixed(6));
              setLongitude(value.longitude.toFixed(6));
            })
          }
        />
        <MapSurface
          locations={
            valid
              ? [{ ...point, tutorId: user.id, label: label || "Dars manzili" }]
              : []
          }
          onPick={(value) => {
            setLatitude(value.latitude.toFixed(6));
            setLongitude(value.longitude.toFixed(6));
          }}
        />
        <AppText variant="caption" color={C.muted}>
          {Platform.OS === "web"
            ? "Koordinatalarni yozing yoki hozirgi joylashuvni oling."
            : "Xaritaga tegib nuqtani tanlash ham mumkin."}
        </AppText>
      </Card>
      {mode === "demo" ? (
        <AppText color={C.muted}>
          Bu sinov rejimi. Manzilni serverda saqlash uchun Supabase rejimini
          yoqing.
        </AppText>
      ) : null}
      <Button
        title="Manzilni saqlash"
        disabled={!valid || label.trim().length < 3 || mode === "demo"}
        loading={action.busy}
        onPress={() =>
          action.run(
            () => createLocationService(requireBackend()).save(point, label),
            () =>
              action.setSuccess(
                "Manzil saqlandi. Tasdiqlangan ustoz profilingiz xaritada ko‘rinadi.",
              ),
          )
        }
      />
      <Button
        title="Saqlangan manzilni olib tashlash"
        variant="outline"
        disabled={mode === "demo"}
        loading={action.busy}
        onPress={() =>
          action.run(
            () => createLocationService(requireBackend()).remove(),
            () => {
              setLatitude("");
              setLongitude("");
              setLabel("");
              action.setSuccess("Manzil olib tashlandi.");
            },
          )
        }
      />
      <Feedback error={loadError || action.error} success={action.success} />
    </Screen>
  );
}
