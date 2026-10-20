import "server-only";

import { getTranslations } from "next-intl/server";
import { getSessionToken } from "@/features/auth/session";
import { getRecords } from "@/features/catalog/api/catalog.server";
import type { CorridorItinerary, DestinationChoice } from "@/features/corridors/api/contracts";
import { backendRequest } from "@/lib/backend-api.server";

/** Named, not written out, so Next reads it when the server starts rather than baking it in at build. */
const BROWSER_KEY = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY";
const MAP_ID = "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID";

/** The browser key and Map ID the CMS draws corridor maps with; never the API's server key. */
export function mapsSettings(): { readonly apiKey: string | null; readonly mapId: string | null } {
  return {
    apiKey: process.env[BROWSER_KEY]?.trim() || null,
    mapId: process.env[MAP_ID]?.trim() || null,
  };
}

/** A corridor with its days, stops and road route, as a curator sees it — drafts included. */
export async function getCorridorItinerary(id: string): Promise<CorridorItinerary> {
  const token = (await getSessionToken()) ?? undefined;
  return backendRequest<CorridorItinerary>(`/corridors/${encodeURIComponent(id)}/itinerary`, {}, token);
}

/** Every destination the builder may add as a stop, with its province, categories, photo, summary and position. */
export async function getDestinationChoices(): Promise<DestinationChoice[]> {
  const [destinations, provinces, categories, t] = await Promise.all([
    getRecords("destinations"),
    getRecords("provinces"),
    getRecords("categories"),
    getTranslations("corridors"),
  ]);
  const provinceNames = new Map(provinces.map((province) => [province.id, String(province.name ?? "")]));
  const categoryNames = new Map(categories.map((category) => [category.id, String(category.name ?? "")]));
  return destinations
    .map((destination) => ({
      id: destination.id,
      name: String(destination.name ?? t("words.untitledDestination")),
      provinceName: provinceNames.get(String(destination.provinceId ?? "")) || null,
      status: typeof destination.status === "string" ? destination.status : null,
      coverUrl: typeof destination.coverUrl === "string" ? destination.coverUrl : null,
      latitude: numberOrNull(destination.latitude),
      longitude: numberOrNull(destination.longitude),
      shortDescription: typeof destination.shortDescription === "string" && destination.shortDescription.trim() ? destination.shortDescription.trim() : null,
      categories: (Array.isArray(destination.categoryIds) ? destination.categoryIds : [])
        .map((id) => categoryNames.get(String(id)))
        .filter((name): name is string => Boolean(name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
