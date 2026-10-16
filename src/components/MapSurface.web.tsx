import React from "react";
import { View } from "react-native";
import type { MapSurfaceProps } from "./MapSurface.types";
export function MapSurface({ locations, selectedId, origin }: MapSurfaceProps) {
  const point = locations.find((l) => l.tutorId === selectedId) ||
    locations[0] ||
    origin || { latitude: 41.3111, longitude: 69.2797 };
  const params = new URLSearchParams({
    bbox: `${Math.max(-180, point.longitude - 0.04)},${Math.max(-90, point.latitude - 0.025)},${Math.min(180, point.longitude + 0.04)},${Math.min(90, point.latitude + 0.025)}`,
    layer: "mapnik",
    marker: `${point.latitude},${point.longitude}`,
  });
  return (
    <View style={{ height: 255, borderRadius: 18, overflow: "hidden" }}>
      {React.createElement("iframe", {
        title: "O‘qi ustozlar xaritasi",
        src: `https://www.openstreetmap.org/export/embed.html?${params}`,
        style: { width: "100%", height: "100%", border: 0 },
        loading: "lazy",
        referrerPolicy: "no-referrer",
      })}
    </View>
  );
}
