import React, { useEffect, useRef } from "react";
import MapView, { Marker } from "react-native-maps";
import type { MapSurfaceProps } from "./MapSurface.types";
import { C } from "../theme";
export function MapSurface({
  locations,
  selectedId,
  origin,
  onSelect,
  onPick,
}: MapSurfaceProps) {
  const map = useRef<MapView>(null);
  const selected =
    locations.find((l) => l.tutorId === selectedId) || locations[0];
  const center = selected ||
    origin || { latitude: 41.3111, longitude: 69.2797 };
  useEffect(() => {
    map.current?.animateToRegion(
      { ...center, latitudeDelta: 0.06, longitudeDelta: 0.06 },
      300,
    );
  }, [center.latitude, center.longitude]);
  return (
    <MapView
      ref={map}
      style={{ height: 255, width: "100%" }}
      initialRegion={{ ...center, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
      onPress={
        onPick ? (event) => onPick(event.nativeEvent.coordinate) : undefined
      }
    >
      {origin ? (
        <Marker
          coordinate={origin}
          title="Sizning joylashuvingiz"
          pinColor={C.accent}
        />
      ) : null}
      {locations.map((point) => (
        <Marker
          key={point.tutorId}
          coordinate={point}
          title={point.label}
          pinColor={point.tutorId === selectedId ? C.accent : C.navy}
          onPress={() => onSelect?.(point.tutorId)}
        />
      ))}
    </MapView>
  );
}
