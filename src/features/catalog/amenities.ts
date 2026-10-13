import type { ReferenceOption } from "@/features/catalog/resource";

/**
 * An amenity as a picker offers it: the slug a stay or a room stores, the
 * label as `Group · Name` (the group is how the picker lays them out), and
 * the icon it is drawn with.
 */
export interface AmenityOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: string;
}

/** Where a picker stands: the stay's Facilities, or a room's Amenities. */
export type AmenityLevel = "PROPERTY" | "ROOM";

/**
 * The amenities a picker offers, from the taxonomy as the API lists it: the
 * active ones offered at this level (or at both), in the taxonomy's own order.
 * With no level, every active one.
 */
export function offeredAmenities(options: readonly ReferenceOption[], level?: AmenityLevel): AmenityOption[] {
  return options
    .filter((option) => !option.inactive && (!level || option.level === "BOTH" || option.level === level))
    .map((option) => ({
      value: option.slug ?? option.value,
      label: option.group ? `${option.group} · ${option.label}` : option.label,
      ...(option.icon ? { icon: option.icon } : {}),
    }));
}

/** Every amenity's name by its slug, retired ones included: a card names what a room has, whatever its standing. */
export function amenityLabels(options: readonly ReferenceOption[]): ReadonlyMap<string, string> {
  return new Map(options.map((option) => [option.slug ?? option.value, option.label]));
}
