import type { Coordinates } from "../services/permissions";
import type { TutorLocation } from "../services/locations";
export type MapSurfaceProps = {
  locations: TutorLocation[];
  selectedId?: string;
  origin?: Coordinates;
  onSelect?: (id: string) => void;
  onPick?: (point: Coordinates) => void;
};
