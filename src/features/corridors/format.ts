import type { createTranslator, Messages } from "next-intl";
import type { CorridorRouteStatus, TransportType } from "@/features/corridors/api/contracts";
import type { BadgeTone } from "@/components/ui/badge";

/** A translator for the `corridors` messages, from `useTranslations` or `getTranslations`. */
export type CorridorsT = ReturnType<typeof createTranslator<Messages, "corridors">>;

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

/** How each route status reads; its words are `corridors.route`. */
export const ROUTE_TONES: Readonly<Record<CorridorRouteStatus, BadgeTone>> = {
  NONE: "neutral",
  MISSING: "warning",
  CURRENT: "success",
  STALE: "warning",
};

export function routeStatusOf(t: CorridorsT, status: CorridorRouteStatus) {
  return { label: t(`route.${status}.label`), hint: t(`route.${status}.hint`), tone: ROUTE_TONES[status] };
}

/** `08:00:00` or `08:00` as `08:00`; empty for none. */
export function shortTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export function formatDistance(t: CorridorsT, km: number | null | undefined): string {
  if (km == null) return "—";
  if (km === 0) return t("units.distance", { km: 0 });
  return km < 10 ? t("units.distanceShort", { km }) : t("units.distance", { km: Math.round(km) });
}

export function formatMinutes(t: CorridorsT, minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return t("units.minutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t("units.hoursMinutes", { hours, minutes: rest }) : t("units.hours", { hours });
}

export function formatBudget(t: CorridorsT, min: number | null | undefined, max: number | null | undefined): string {
  if (min != null && max != null) return t("budget.range", { min: Math.round(min), max: Math.round(max) });
  if (min != null) return t("budget.from", { min: Math.round(min) });
  if (max != null) return t("budget.upTo", { max: Math.round(max) });
  return "—";
}

export function formatDuration(t: CorridorsT, days: number | null | undefined, nights: number | null | undefined): string {
  if (!days) return "—";
  return nights ? t("duration.daysNights", { days, nights }) : t("duration.days", { days });
}
