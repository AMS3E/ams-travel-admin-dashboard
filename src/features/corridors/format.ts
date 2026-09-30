import type { CorridorRouteStatus, TransportType } from "@/features/corridors/api/contracts";
import type { BadgeTone } from "@/components/ui/badge";

export const TRANSPORT_TYPES: readonly TransportType[] = [
  "CAR",
  "MINIVAN",
  "BUS",
  "TUK_TUK",
  "MOTORBIKE",
  "BICYCLE",
  "WALK",
  "BOAT",
  "FLIGHT",
];

export const TRANSPORT_LABELS: Readonly<Record<TransportType, string>> = {
  CAR: "Car",
  MINIVAN: "Minivan",
  BUS: "Bus",
  TUK_TUK: "Tuk-tuk",
  MOTORBIKE: "Motorbike",
  BICYCLE: "Bicycle",
  WALK: "Walk",
  BOAT: "Boat",
  FLIGHT: "Flight",
};

export const ROUTE_STATUS: Readonly<Record<CorridorRouteStatus, { readonly label: string; readonly tone: BadgeTone; readonly hint: string }>> = {
  NONE: { label: "No route", tone: "neutral", hint: "Add at least two stops." },
  MISSING: { label: "Not calculated", tone: "warning", hint: "The road route has not been worked out for these stops." },
  CURRENT: { label: "Route ready", tone: "success", hint: "The road route fits the stops as they are." },
  STALE: { label: "Out of date", tone: "warning", hint: "A stop or its position changed since the route was worked out." },
};

/** `08:00:00` or `08:00` as `08:00`; empty for none. */
export function shortTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return "—";
  if (km === 0) return "0 km";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString()} km`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatBudget(min: number | null | undefined, max: number | null | undefined): string {
  const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
  if (min != null && max != null) return `${money(min)}–${money(max)}`;
  if (min != null) return `from ${money(min)}`;
  if (max != null) return `up to ${money(max)}`;
  return "—";
}

export function formatDuration(days: number | null | undefined, nights: number | null | undefined): string {
  if (!days) return "—";
  const dayText = `${days} ${days === 1 ? "day" : "days"}`;
  return nights ? `${dayText} · ${nights} ${nights === 1 ? "night" : "nights"}` : dayText;
}
