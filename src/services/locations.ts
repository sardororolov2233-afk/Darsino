import type { SupabaseClient } from "@supabase/supabase-js";
import type { Coordinates } from "./permissions";
export type TutorLocation = Coordinates & {
  tutorId: string;
  label: string;
  distanceKm?: number | null;
};
export function validCoordinates(point: Coordinates) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function directionsUrl(point: Coordinates) {
  if (!validCoordinates(point)) throw new Error("Koordinatalar noto‘g‘ri.");
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
}
export function createLocationService(client: SupabaseClient) {
  const rpc = async <T>(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<T> => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
  return {
    own: () => rpc<TutorLocation | null>("oqi_own_tutor_location"),
    remove: () => rpc<void>("oqi_delete_tutor_location"),
    save: async (point: Coordinates, label: string) => {
      if (!validCoordinates(point)) throw new Error("Koordinatalar noto‘g‘ri.");
      await rpc<void>("oqi_save_tutor_location", {
        p_latitude: point.latitude,
        p_longitude: point.longitude,
        p_label: label.trim(),
      });
    },
    nearby: (tutorIds: string[], origin?: Coordinates, radiusKm = 25) =>
      rpc<TutorLocation[]>("oqi_nearby_tutors", {
        p_tutor_ids: tutorIds.slice(0, 200),
        p_latitude: origin?.latitude ?? null,
        p_longitude: origin?.longitude ?? null,
        p_radius_km: radiusKm,
      }),
  };
}
