import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import type { Tutor } from "../data/catalog";
import { AppText, Button, Card, Chip, uiStyles } from "./ui";
import { TutorCard } from "../screens/DiscoveryScreens";
import { MapSurface } from "./MapSurface";
import { Feedback, useAction } from "./feedback";
import { useApp } from "../state/AppContext";
import { requireBackend } from "../services/backend";
import {
  createLocationService,
  directionsUrl,
  type TutorLocation,
} from "../services/locations";
import { currentLocation, type Coordinates } from "../services/permissions";
import { C } from "../theme";

const demoPoints: Record<string, Coordinates> = {
  Yunusobod: { latitude: 41.367, longitude: 69.284 },
  "Mirzo Ulug‘bek": { latitude: 41.326, longitude: 69.338 },
  Chilonzor: { latitude: 41.278, longitude: 69.204 },
  Yakkasaroy: { latitude: 41.286, longitude: 69.26 },
  Shayxontohur: { latitude: 41.326, longitude: 69.239 },
};
export function TutorMap({ tutors }: { tutors: Tutor[] }) {
  const { mode } = useApp();
  const [selectedId, setSelectedId] = useState("");
  const [locations, setLocations] = useState<TutorLocation[]>([]);
  const [origin, setOrigin] = useState<Coordinates>();
  const [radius, setRadius] = useState(25);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const action = useAction();
  const idsKey = tutors.map((t) => t.id).join(",");
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    const ids = idsKey ? idsKey.split(",") : [];
    const request =
      mode === "demo"
        ? Promise.resolve(
            tutors
              .filter((t) => demoPoints[t.area])
              .map((t) => ({
                tutorId: t.id,
                ...demoPoints[t.area],
                label: `${t.area} · namuna nuqtasi`,
              })),
          )
        : createLocationService(requireBackend()).nearby(ids, origin, radius);
    void request
      .then((points) => {
        if (active) setLocations(points);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLocations([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [idsKey, mode, origin, radius, revision]);
  const visible = locations.filter((l) =>
    tutors.some((t) => t.id === l.tutorId),
  );
  const point = visible.find((l) => l.tutorId === selectedId) || visible[0];
  const selected = tutors.find((t) => t.id === point?.tutorId);
  return (
    <>
      <Card>
        <AppText variant="heading">Ustozlar xaritada</AppText>
        <AppText variant="caption" color={C.muted}>
          {mode === "demo"
            ? "Namuna nuqtalari · ustozlarning haqiqiy manzili emas"
            : "Ustozlar ko‘rsatgan dars manzillari"}
        </AppText>
        <Button
          title="Yaqinimdagi ustozlar"
          icon="navigation"
          variant="soft"
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              if (mode === "demo")
                throw new Error(
                  "Masofa bo‘yicha haqiqiy qidiruv Supabase rejimida ishlaydi.",
                );
              setOrigin(await currentLocation());
            })
          }
        />
        {origin ? (
          <View style={uiStyles.wrap}>
            {[5, 10, 25, 50].map((km) => (
              <Chip
                key={km}
                label={`${km} km`}
                selected={radius === km}
                onPress={() => setRadius(km)}
              />
            ))}
            <Button
              title="Barcha manzillar"
              variant="outline"
              onPress={() => setOrigin(undefined)}
            />
          </View>
        ) : null}
        <MapSurface
          locations={visible}
          selectedId={point?.tutorId}
          origin={origin}
          onSelect={setSelectedId}
        />
        {loading ? (
          <AppText color={C.muted}>Manzillar yuklanmoqda…</AppText>
        ) : null}
        {!loading && !visible.length ? (
          <AppText color={C.muted}>
            Bu natijalar uchun saqlangan manzil topilmadi. Ustozlarni ro‘yxatdan
            ko‘ring yoki masofani kengaytiring.
          </AppText>
        ) : null}
        {visible.map((p) => {
          const tutor = tutors.find((t) => t.id === p.tutorId)!;
          return (
            <Button
              key={p.tutorId}
              title={`${tutor.name}, ${tutor.area} xarita belgisi`}
              variant={p.tutorId === point?.tutorId ? "soft" : "outline"}
              onPress={() => setSelectedId(p.tutorId)}
            />
          );
        })}
        {point ? (
          <>
            <AppText variant="caption" color={C.muted}>
              {point.label}
              {point.distanceKm != null
                ? ` · ${point.distanceKm.toFixed(1)} km`
                : ""}
            </AppText>
            <Button
              title="Yo‘nalishni ochish"
              variant="outline"
              icon="map-pin"
              onPress={() =>
                action.run(() => Linking.openURL(directionsUrl(point)))
              }
            />
          </>
        ) : null}
        <Button
          title="Manzillarni yangilash"
          variant="soft"
          disabled={loading}
          onPress={() => setRevision((n) => n + 1)}
        />
        <Feedback error={error || action.error} />
      </Card>
      {selected ? <TutorCard tutor={selected} /> : null}
    </>
  );
}
