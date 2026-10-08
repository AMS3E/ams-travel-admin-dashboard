/**
 * What the Rooms step works out from a room's values, kept pure so the rules
 * are tested without a browser: how many the beds sleep, the name a room would
 * have, the templates a property type starts from, and the property's summary.
 *
 * A room is its registry form values — strings for numbers, as every form in
 * the dashboard holds them — so a room made here saves through the same path
 * and the same checks as any other row.
 */

import type { FormValues } from "@/features/catalog/resource";
import { ROOM_BEDS, ROOM_HOUSEKEEPING, ROOM_TYPES, ROOM_VIEWS } from "@/features/catalog/resources";

/** A word in front of the name, Booking.com-style; not stored, only used to suggest one. */
export const ROOM_GRADES = ["", "Budget", "Standard", "Superior", "Deluxe", "Premier", "Executive"] as const;
export type RoomGrade = (typeof ROOM_GRADES)[number];

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
export function bedLine(values: FormValues): string {
  return ROOM_BEDS.flatMap((bed) => {
    const n = count(values, bed.name);
    if (!n) return [];
    return [`${n} ${n === 1 ? bed.label.toLowerCase() : bed.plural}`];
  }).join(" · ");
}

export function roomTypeLabel(roomType: unknown): string {
  return ROOM_TYPES.find((option) => option.value === roomType)?.label ?? "Room";
}

export function viewLabel(view: unknown): string | null {
  return ROOM_VIEWS.find((option) => option.value === view)?.label ?? null;
}

/** "Free cancellation until 3 days before arrival", or "Non-refundable". */
export function cancellationLabel(days: unknown): string {
  if (typeof days !== "string" || !days.trim()) return "Non-refundable";
  const n = Number.parseInt(days, 10);
  if (!Number.isFinite(n) || n < 0) return "Non-refundable";
  if (n === 0) return "Free cancellation until the day of arrival";
  return `Free cancellation until ${n} ${n === 1 ? "day" : "days"} before arrival`;
}

const TYPE_NAMES: Readonly<Record<string, string>> = {
  SINGLE: "Single Room",
  DOUBLE: "Double Room",
  TWIN: "Twin Room",
  TWIN_DOUBLE: "Double or Twin Room",
  TRIPLE: "Triple Room",
  QUADRUPLE: "Quadruple Room",
  FAMILY: "Family Room",
  SUITE: "Suite",
  STUDIO: "Studio",
  APARTMENT: "Apartment",
  BUNGALOW: "Bungalow",
  VILLA: "Villa",
  DORM_BED: "Bed in Dormitory",
  DORM_ROOM: "Dormitory Room",
};

const amenitiesOf = (values: FormValues): readonly string[] => (Array.isArray(values.amenities) ? values.amenities : []);

/**
 * The name a room would be listed under — "Deluxe King Room with Balcony and
 * River View" — from its grade, type, beds, view and a feature worth naming.
 * A double room with a king or a queen bed says so, the way guests search.
 */
export function suggestName(values: FormValues, grade: RoomGrade = ""): string {
  const type = typeof values.roomType === "string" ? values.roomType : "DOUBLE";
  let base = TYPE_NAMES[type] ?? "Room";
  if (type === "DOUBLE" && count(values, "kingBeds")) base = "King Room";
  else if (type === "DOUBLE" && count(values, "queenBeds")) base = "Queen Room";
  if (type === "DORM_BED") {
    const beds = bedsOf(values) + count(values, "bunkBeds");
    base = beds > 1 ? `Bed in ${beds}-Bed Dormitory` : base;
  }

  const features: string[] = [];
  const amenities = amenitiesOf(values);
  if (amenities.includes("private-pool")) features.push("Private Pool");
  else if (amenities.includes("balcony")) features.push("Balcony");
  else if (amenities.includes("terrace")) features.push("Terrace");
  const view = viewLabel(values.view);
  if (view) features.push(view.replace(/\bview\b/, "View"));

  const named = [grade, base].filter(Boolean).join(" ");
  return features.length ? `${named} with ${features.join(" and ")}` : named;
}

/** What a room of each kind is usually made of; everything else is one bedroom and one bathroom. */
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
export function layoutLine(values: FormValues): string {
  const parts: string[] = [];
  const say = (name: string, one: string, many: string) => {
    const n = count(values, name);
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  };
  say("bedrooms", "bedroom", "bedrooms");
  say("livingRooms", "living room", "living rooms");
  say("bathroomCount", "bathroom", "bathrooms");
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
export function floorLabel(floor: unknown): string {
  if (typeof floor !== "string" || !floor.trim()) return "";
  const n = Number.parseInt(floor, 10);
  if (!Number.isFinite(n)) return "";
  if (n < 0) return n === -1 ? "Basement" : `Basement level ${Math.abs(n)}`;
  if (n === 0) return "Ground floor";
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix} floor`;
}

export function housekeepingLabel(value: unknown): string | null {
  return ROOM_HOUSEKEEPING.find((option) => option.value === value)?.label ?? null;
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

/** What the Rooms step calls what a stay lets, and the words around it. */
export interface RoomWords {
  readonly kinds: string;
  readonly total: string;
  readonly biggest: string;
  readonly cheapest: string;
  readonly blank: string;
  readonly fresh: string;
  readonly edit: string;
  readonly add: string;
  readonly save: string;
  readonly copy: string;
  readonly what: string;
  readonly like: string;
  /** The empty list: what is missing, and how to add it. */
  readonly none: string;
  readonly noneHint: string;
}

const ROOMS: RoomWords = {
  kinds: "Kinds of room",
  total: "Rooms in total",
  biggest: "Biggest room sleeps",
  cheapest: "Cheapest room, per night",
  blank: "Blank room",
  fresh: "New room",
  edit: "Edit room",
  add: "Add room",
  save: "Save room",
  copy: "Copy to a new room",
  what: "What kind of room is it?",
  like: "What is the room like?",
  none: "No rooms yet",
  noneHint: "Add each kind of room once. Guests choose by beds, how many it sleeps, and price.",
};

/** Each kind of stay's words: a hostel lets dorms and rooms, a resort rooms and villas, a villa itself. */
export const ROOM_WORDS: Readonly<Record<string, RoomWords>> = {
  HOTEL: ROOMS,
  GUESTHOUSE: {
    ...ROOMS,
    total: "Rooms in the house",
    noneHint: "Add each kind of room once — a fan room and an air-con room are two.",
  },
  HOSTEL: {
    kinds: "Kinds of dorm and room",
    total: "Beds and rooms in total",
    biggest: "Biggest dorm or room sleeps",
    cheapest: "Cheapest bed, per night",
    blank: "Blank dorm or room",
    fresh: "New dorm or room",
    edit: "Edit dorm or room",
    add: "Add dorm or room",
    save: "Save dorm or room",
    copy: "Copy to a new dorm or room",
    what: "Is it a dorm, or a private room?",
    like: "What is it like?",
    none: "No dorms or rooms yet",
    noneHint: "Add each dorm once with its number of beds — guests book one bed — then any private rooms.",
  },
  RESORT: {
    kinds: "Kinds of room and villa",
    total: "Rooms and villas in total",
    biggest: "Biggest room or villa sleeps",
    cheapest: "Cheapest room or villa, per night",
    blank: "Blank room or villa",
    fresh: "New room or villa",
    edit: "Edit room or villa",
    add: "Add room or villa",
    save: "Save room or villa",
    copy: "Copy to a new room or villa",
    what: "What kind of room or villa is it?",
    like: "What is it like?",
    none: "No rooms or villas yet",
    noneHint: "Add each kind of room, bungalow or villa once. Guests choose by setting, beds and price.",
  },
  HOMESTAY: {
    ...ROOMS,
    total: "Rooms for guests",
    like: "What is the room in the home like?",
    none: "No rooms in the home yet",
    noneHint: "Add each room guests can sleep in — say whether it has a fan, a mosquito net and its own bathroom.",
  },
  VILLA: {
    kinds: "Ways to book it",
    total: "To let in all",
    biggest: "Sleeps at most",
    cheapest: "Cheapest night",
    blank: "Blank villa or bedroom",
    fresh: "New villa or bedroom",
    edit: "Edit villa or bedroom",
    add: "Add villa or bedroom",
    save: "Save villa or bedroom",
    copy: "Copy to a new villa or bedroom",
    what: "The whole villa, or one bedroom?",
    like: "What is it like?",
    none: "The villa is not bookable yet",
    noneHint: "Add the whole villa as one entry, with its bedrooms, beds and a night's price — or each bedroom, if they are let one by one.",
  },
  OTHER: ROOMS,
};

export function roomWords(stayType: string): RoomWords {
  return ROOM_WORDS[stayType] ?? ROOMS;
}

export interface RoomTemplate {
  readonly id: string;
  readonly title: string;
  readonly grade: RoomGrade;
  readonly values: Readonly<FormValues>;
}

const template = (id: string, title: string, grade: RoomGrade, roomType: string, extra: FormValues): RoomTemplate => ({
  id,
  title,
  grade,
  values: { roomType, ...BEDS_FOR_TYPE[roomType], ...(LAYOUT_FOR_TYPE[roomType] ?? PLAIN_LAYOUT), ...extra },
});

const ESSENTIALS = ["air-conditioning", "wifi", "hot-water", "toiletries"];
const BUDGET = ["fan", "mosquito-net", "wifi", "hot-water"];

/**
 * One-click starting points for the property's type, the way a host would
 * describe their rooms. Beds are counts as strings, like every form value.
 */
export const ROOM_TEMPLATES: Readonly<Record<string, readonly RoomTemplate[]>> = {
  HOTEL: [
    template("standard-double", "Standard double", "Standard", "DOUBLE", { amenities: [...ESSENTIALS, "tv", "kettle"], sizeSqm: "22" }),
    template("superior-twin", "Superior twin", "Superior", "TWIN", { singleBeds: "2", amenities: [...ESSENTIALS, "tv", "kettle", "desk"], sizeSqm: "26" }),
    template("deluxe-king", "Deluxe king with balcony", "Deluxe", "DOUBLE", { doubleBeds: "0", kingBeds: "1", amenities: [...ESSENTIALS, "tv", "minibar", "safe", "balcony"], sizeSqm: "32" }),
    template("family", "Family room", "", "FAMILY", { maxAdults: "2", maxChildren: "2", amenities: [...ESSENTIALS, "tv", "fridge", "cot-available"], sizeSqm: "38" }),
    template("junior-suite", "Junior suite", "Deluxe", "SUITE", { housekeeping: "DAILY", amenities: [...ESSENTIALS, "tv", "minibar", "safe", "bathtub", "seating-area", "bathrobes"], sizeSqm: "48" }),
  ],
  GUESTHOUSE: [
    template("fan-double", "Double with fan", "Budget", "DOUBLE", { amenities: BUDGET, sizeSqm: "16" }),
    template("ac-double", "Double with air conditioning", "Standard", "DOUBLE", { amenities: [...ESSENTIALS, "tv"], sizeSqm: "18" }),
    template("twin", "Twin room", "Standard", "TWIN", { singleBeds: "2", amenities: [...ESSENTIALS], sizeSqm: "18" }),
  ],
  HOSTEL: [
    template("mixed-dorm", "Bed in 6-bed mixed dorm", "", "DORM_BED", { singleBeds: "0", bunkBeds: "3", maxAdults: "1", roomCount: "6", bathroom: "SHARED", amenities: ["air-conditioning", "wifi", "hot-water", "lockers", "privacy-curtain", "reading-light"] }),
    template("female-dorm", "Bed in 4-bed female dorm", "", "DORM_BED", { singleBeds: "0", bunkBeds: "2", maxAdults: "1", roomCount: "4", bathroom: "SHARED", amenities: ["air-conditioning", "wifi", "hot-water", "safe", "lockers", "privacy-curtain", "reading-light"] }),
    template("private-double", "Private double", "", "DOUBLE", { amenities: ["fan", "wifi", "hot-water"], bathroom: "SHARED" }),
  ],
  RESORT: [
    template("pool-view", "Deluxe double, pool view", "Deluxe", "DOUBLE", { view: "POOL", amenities: [...ESSENTIALS, "balcony", "minibar", "safe"], sizeSqm: "34" }),
    template("garden-bungalow", "Garden bungalow", "", "BUNGALOW", { view: "GARDEN", amenities: [...ESSENTIALS, "terrace", "rain-shower"], sizeSqm: "40" }),
    template("pool-villa", "Pool villa", "Premier", "VILLA", { kingBeds: "1", bedrooms: "1", livingRooms: "1", bathroomCount: "1", amenities: [...ESSENTIALS, "private-pool", "terrace", "bathtub", "minibar"], sizeSqm: "90" }),
  ],
  HOMESTAY: [
    template("family-home", "Room in the family home", "", "DOUBLE", { bathroom: "SHARED", breakfastIncluded: true, amenities: BUDGET }),
    template("homestay-family", "Family room", "", "FAMILY", { bathroom: "SHARED", breakfastIncluded: true, maxAdults: "2", maxChildren: "2", amenities: BUDGET }),
  ],
  VILLA: [
    template("whole-villa", "The whole villa", "", "VILLA", { singleBeds: "2", maxChildren: "2", bedrooms: "3", livingRooms: "1", bathroomCount: "3", housekeeping: "DAILY", amenities: [...ESSENTIALS, "private-pool", "kitchen", "terrace"], sizeSqm: "150" }),
  ],
  OTHER: [template("double", "Double room", "", "DOUBLE", { amenities: ESSENTIALS })],
};

/** A template laid over a fresh room's values, beds settled and the name suggested. */
export function fromTemplate(fresh: FormValues, chosen: RoomTemplate): FormValues {
  const values: FormValues = { ...fresh };
  for (const bed of ROOM_BEDS) values[bed.name] = "0";
  for (const [name, value] of Object.entries(chosen.values)) {
    values[name] = typeof value === "number" ? String(value) : value;
  }
  if (!chosen.values.maxAdults) values.maxAdults = String(Math.max(1, sleepsOf(values)));
  values.name = suggestName(values, chosen.grade);
  return values;
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

/** What a traveller looks for on a room, as a short checklist. */
export function roomChecklist(values: FormValues): readonly { readonly label: string; readonly done: boolean }[] {
  const photos = Array.isArray(values.photoKeys) ? values.photoKeys.length : 0;
  return [
    { label: "Beds", done: bedsOf(values) > 0 },
    { label: "Price per night", done: price(values) !== null },
    { label: "Photos", done: photos > 0 },
    { label: "Size", done: typeof values.sizeSqm === "string" && values.sizeSqm.trim() !== "" },
    { label: "Facilities", done: amenitiesOf(values).length >= 3 },
    { label: "Description", done: typeof values.description === "string" && values.description.trim().length > 0 },
  ];
}

/**
 * A long stay that costs less than the nights in it — a week priced at one
 * night's rate is a typing slip, not a bargain, and a guest would book it.
 */
export function longStayWarning(values: FormValues): string | null {
  const nightly = price(values);
  if (nightly === null || nightly <= 0) return null;
  const amount = (name: string): number | null => {
    const raw = values[name];
    if (typeof raw !== "string" || !raw.trim()) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const week = amount("weeklyPrice");
  if (week !== null && week < nightly * 2) return `A week for ${week} is less than two nights at ${nightly}. Check the weekly price.`;
  const month = amount("monthlyPrice");
  if (month !== null && month < nightly * 5) return `A month for ${month} is less than five nights at ${nightly}. Check the monthly price.`;
  return null;
}

/** Guests the beds cannot hold: more adults than the beds sleep. */
export function capacityWarning(values: FormValues): string | null {
  const sleeps = sleepsOf(values);
  const adults = count(values, "maxAdults");
  if (!sleeps) return "Add at least one bed.";
  if (adults > sleeps) return `The beds sleep ${sleeps}; ${adults} adults need ${adults - sleeps} more ${adults - sleeps === 1 ? "bed" : "beds"}.`;
  return null;
}
