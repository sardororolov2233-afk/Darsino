import type { Filters } from "./domain";
export type { User, BookingRequest, Message, Filters } from "./domain";
export const defaultFilters: Filters = {
  subject: "Barchasi",
  area: "Barcha hududlar",
  mode: "Barchasi",
  minPrice: 0,
  maxPrice: 1000000,
  minRating: 0,
};
export const validPhone = (value: string) =>
  /^(?:998)?[0-9]{9}$/.test(value.replace(/\D/g, ""));
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "SO";
