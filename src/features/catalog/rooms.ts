/**
 * What the Rooms step works out from a room's values, kept pure so the rules
 * are tested without a browser: how many the beds sleep, the name a room would
 * have, the templates a property type starts from, and the property's summary.
 *
 * A room is its registry form values — strings for numbers, as every form in
 * the dashboard holds them — so a room made here saves through the same path
 * and the same checks as any other row.
 */

import type { _Translator, Messages } from "next-intl";
import type { EnumOption, FormValues } from "@/features/catalog/resource";
import { ROOM_BEDS, ROOM_HOUSEKEEPING, ROOM_TYPES, ROOM_VIEWS } from "@/features/catalog/resources";

/** The Rooms step's words, from `useTranslations("forms.rooms")`. */
export type RoomsWords = _Translator<Messages, "forms.rooms">;

/** The bed counts a room holds, by the registry's column names. */
export type BedName = "singleBeds" | "doubleBeds" | "queenBeds" | "kingBeds" | "bunkBeds" | "sofaBeds" | "futonBeds";

/** A word in front of the name, Booking.com-style; not stored, only used to suggest one. */

/** Days of free cancellation offered as one click; empty is non-refundable. */
export const CANCELLATION_CHOICES = ["", "0", "1", "3", "7", "14"] as const;

function count(values: FormValues, name: string): number {
  const raw = values[name];
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function price(values: FormValues): number | null {
  const raw = values.pricePerNight;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** How many people the beds sleep: a single, a sofa bed or a futon one, the rest two. */
export function sleepsOf(values: FormValues): number {
  return ROOM_BEDS.reduce((total, bed) => total + count(values, bed.name) * bed.sleeps, 0);
}

export function bedsOf(values: FormValues): number {
  return ROOM_BEDS.reduce((total, bed) => total + count(values, bed.name), 0);
}

/** "1 king bed · 2 single beds", in the order a card lists them. */
export function bedLine(values: FormValues, t: RoomsWords): string {
  return ROOM_BEDS.flatMap((bed) => {
    const n = count(values, bed.name);
    if (!n) return [];
    return [t(`beds.${bed.name as BedName}`, { count: n })];
  }).join(" · ");
}

/** A room type's name; `options` are the registry's, in the reader's language where given. */
export function roomTypeLabel(roomType: unknown, t: RoomsWords, options: readonly EnumOption[] = ROOM_TYPES): string {
  return options.find((option) => option.value === roomType)?.label ?? t("roomFallback");
}

export function viewLabel(view: unknown, options: readonly EnumOption[] = ROOM_VIEWS): string | null {
  return options.find((option) => option.value === view)?.label ?? null;
}

/** "Free cancellation until 3 days before arrival", or "Non-refundable". */
export function cancellationLabel(days: unknown, t: RoomsWords): string {
  if (typeof days !== "string" || !days.trim()) return t("cancellation.none");
  const n = Number.parseInt(days, 10);
  if (!Number.isFinite(n) || n < 0) return t("cancellation.none");
  if (n === 0) return t("cancellation.sameDay");
  return t("cancellation.days", { count: n });
}

export const LAYOUT_FOR_TYPE: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  SUITE: { bedrooms: 1, livingRooms: 1, bathroomCount: 1 },
  STUDIO: { bedrooms: 1, livingRooms: 0, bathroomCount: 1 },
  APARTMENT: { bedrooms: 1, livingRooms: 1, bathroomCount: 1 },
  BUNGALOW: { bedrooms: 1, livingRooms: 1, bathroomCount: 1 },
  VILLA: { bedrooms: 2, livingRooms: 1, bathroomCount: 2 },
  FAMILY: { bedrooms: 1, livingRooms: 0, bathroomCount: 1 },
};

const PLAIN_LAYOUT = { bedrooms: 1, livingRooms: 0, bathroomCount: 1 } as const;

/** "2 bedrooms · 1 living room · 2 bathrooms", the way a listing describes what is inside. */
export function layoutLine(values: FormValues, t: RoomsWords): string {
  const parts: string[] = [];
  const say = (name: "bedrooms" | "livingRooms" | "bathroomCount") => {
    const n = count(values, name);
    if (n > 0) parts.push(t(`layout.${name}`, { count: n }));
  };
  say("bedrooms");
  say("livingRooms");
  say("bathroomCount");
  return parts.join(" · ");
}

/** Whether the layout is worth saying: anything beyond one bedroom and one bathroom. */
export function hasOwnLayout(values: FormValues): boolean {
  return (
    count(values, "bedrooms") !== PLAIN_LAYOUT.bedrooms ||
    count(values, "livingRooms") !== PLAIN_LAYOUT.livingRooms ||
    count(values, "bathroomCount") !== PLAIN_LAYOUT.bathroomCount
  );
}

/** "Ground floor", "3rd floor", "Basement" — empty when it was left open. */
export function floorLabel(floor: unknown, t: RoomsWords): string {
  if (typeof floor !== "string" || !floor.trim()) return "";
  const n = Number.parseInt(floor, 10);
  if (!Number.isFinite(n)) return "";
  if (n < 0) return n === -1 ? t("floor.basement") : t("floor.basementLevel", { level: Math.abs(n) });
  if (n === 0) return t("floor.ground");
  return t("floor.up", { floor: n });
}

export function housekeepingLabel(value: unknown, options: readonly EnumOption[] = ROOM_HOUSEKEEPING): string | null {
  return options.find((option) => option.value === value)?.label ?? null;
}

/**
 * What a week and a month would cost at the nightly price, with the discount a
 * longer stay expects — a starting point the host can type over.
 */
export function suggestWeekly(values: FormValues): string {
  const nightly = price(values);
  return nightly === null || nightly <= 0 ? "" : String(Math.round(nightly * 7 * 0.9));
}

export function suggestMonthly(values: FormValues): string {
  const nightly = price(values);
  return nightly === null || nightly <= 0 ? "" : String(Math.round(nightly * 30 * 0.75));
}

/** What a night works out at over a week or a month, to check a long-stay price against. */
export function perNightOver(total: unknown, nights: number): string | null {
  if (typeof total !== "string" || !total.trim()) return null;
  const amount = Number(total);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return (Math.round((amount / nights) * 100) / 100).toFixed(2).replace(/.00$/, "");
}

/** The beds a type starts with while none are set: a twin two singles, a family room a double and two singles. */
export const BEDS_FOR_TYPE: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  SINGLE: { singleBeds: 1 },
  DOUBLE: { doubleBeds: 1 },
  TWIN: { singleBeds: 2 },
  TWIN_DOUBLE: { doubleBeds: 1 },
  TRIPLE: { doubleBeds: 1, singleBeds: 1 },
  QUADRUPLE: { doubleBeds: 2 },
  FAMILY: { doubleBeds: 1, singleBeds: 2 },
  SUITE: { kingBeds: 1, sofaBeds: 1 },
  STUDIO: { queenBeds: 1 },
  APARTMENT: { queenBeds: 1, sofaBeds: 1 },
  BUNGALOW: { kingBeds: 1 },
  VILLA: { kingBeds: 2 },
  DORM_BED: { singleBeds: 1 },
  DORM_ROOM: { bunkBeds: 3 },
};

/** The same values with the beds a type starts with; other counts back to zero. */
export function withBedsFor(values: FormValues, roomType: string): FormValues {
  const beds = BEDS_FOR_TYPE[roomType] ?? {};
  const layout = LAYOUT_FOR_TYPE[roomType] ?? PLAIN_LAYOUT;
  const next: FormValues = { ...values, roomType };
  for (const bed of ROOM_BEDS) next[bed.name] = String(beds[bed.name] ?? 0);
  for (const [name, value] of Object.entries(layout)) next[name] = String(value);
  const sleeps = sleepsOf(next);
  next.maxAdults = String(Math.max(1, roomType === "DORM_BED" ? 1 : sleeps));
  return next;
}

export interface RoomSummary {
  /** Kinds of room. */
  readonly types: number;
  /** Rooms in all, counting how many of each kind. */
  readonly rooms: number;
  /** The most guests one room takes. */
  readonly guests: number;
  /** The cheapest room on sale with a price. */
  readonly fromPrice: number | null;
  readonly onSale: number;
}

export function roomSummary(rooms: readonly FormValues[]): RoomSummary {
  const selling = rooms.filter((room) => room.status !== "INACTIVE");
  const prices = selling.map(price).filter((value): value is number => value !== null);
  return {
    types: rooms.length,
    rooms: rooms.reduce((total, room) => total + Math.max(1, count(room, "roomCount")), 0),
    guests: rooms.reduce((most, room) => Math.max(most, count(room, "maxAdults") + count(room, "maxChildren")), 0),
    fromPrice: prices.length ? Math.min(...prices) : null,
    onSale: selling.length,
  };
}


/**
 * A long stay that costs less than the nights in it — a week priced at one
 * night's rate is a typing slip, not a bargain, and a guest would book it.
 */
export function longStayWarning(values: FormValues, t: RoomsWords): string | null {
  const nightly = price(values);
  if (nightly === null || nightly <= 0) return null;
  const amount = (name: string): number | null => {
    const raw = values[name];
    if (typeof raw !== "string" || !raw.trim()) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const week = amount("weeklyPrice");
  /* As strings, so a price reads as typed: 1200, not 1,200. */
  if (week !== null && week < nightly * 2) return t("warnings.week", { week: String(week), nightly: String(nightly) });
  const month = amount("monthlyPrice");
  if (month !== null && month < nightly * 5) return t("warnings.month", { month: String(month), nightly: String(nightly) });
  return null;
}

/** Guests the beds cannot hold: more adults than the beds sleep. */
export function capacityWarning(values: FormValues, t: RoomsWords): string | null {
  const sleeps = sleepsOf(values);
  const adults = count(values, "maxAdults");
  if (!sleeps) return t("warnings.noBed");
  if (adults > sleeps) return t("warnings.capacity", { sleeps, adults, more: adults - sleeps });
  return null;
}
