/**
 * The itinerary as the builder holds it while it is being edited: days and
 * stops with keys of their own, text fields as typed. Pure functions only, so
 * the reordering rules are tested without a browser.
 */

import type {
  CorridorItinerary,
  DestinationChoice,
  ItineraryDayInput,
  MapStop,
  RoutePreviewLeg,
  TransportType,
} from "@/features/corridors/api/contracts";

export interface DraftStop {
  readonly key: string;
  readonly destinationId: string;
  readonly arrivalTime: string;
  readonly departureTime: string;
  /** As typed: minutes. */
  readonly duration: string;
  /** Empty on a stop that is not reached from another. */
  readonly transportType: TransportType | "";
  readonly title: string;
  readonly description: string;
  readonly notes: string;
}

export interface DraftDay {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly startTime: string;
  readonly notes: string;
  readonly stops: readonly DraftStop[];
}

export type DraftAction =
  | { readonly type: "reset"; readonly days: readonly DraftDay[] }
  | { readonly type: "addDay"; readonly key: string }
  | { readonly type: "removeDay"; readonly day: string }
  | { readonly type: "editDay"; readonly day: string; readonly patch: Partial<Omit<DraftDay, "key" | "stops">> }
  | { readonly type: "addStop"; readonly day: string; readonly key: string; readonly destinationId: string }
  | { readonly type: "removeStop"; readonly stop: string }
  | { readonly type: "editStop"; readonly stop: string; readonly patch: Partial<Omit<DraftStop, "key">> }
  /** To `index` within `day`, counted among the stops as they are before the move. */
  | { readonly type: "moveStop"; readonly stop: string; readonly day: string; readonly index: number }
  /** One place earlier or later, crossing into the day before or after at a day's edge. */
  | { readonly type: "shiftStop"; readonly stop: string; readonly by: -1 | 1 };

/** What a new stop is reached by, until someone says otherwise. */
export const DEFAULT_TRANSPORT: TransportType = "CAR";

/** The empty Day 1 a new plan opens on; fixed, so the server and the browser render the same page. */
export const FIRST_DAY_KEY = "first-day";

const time = (value: string | null) => (value ? value.slice(0, 5) : "");

export function blankDay(key: string): DraftDay {
  return { key, title: "", description: "", startTime: "", notes: "", stops: [] };
}

/** A plan with no days opens on an empty Day 1, so the first stop can be added straight away. */
export function startingDays(days: readonly DraftDay[]): readonly DraftDay[] {
  return days.length > 0 ? days : [blankDay(FIRST_DAY_KEY)];
}

export function stopCount(days: readonly DraftDay[]): number {
  return days.reduce((sum, day) => sum + day.stops.length, 0);
}

/** The destinations the plan stops at that match `test`, each once, in travel order. */
export function placesWhere(
  days: readonly DraftDay[],
  places: ReadonlyMap<string, DestinationChoice>,
  test: (place: DestinationChoice) => boolean,
): DestinationChoice[] {
  const ids = [...new Set(days.flatMap((day) => day.stops.map((stop) => stop.destinationId)))];
  return ids.map((id) => places.get(id)).filter((place): place is DestinationChoice => place !== undefined && test(place));
}

export const isUnpublished = (place: DestinationChoice) => Boolean(place.status && place.status !== "PUBLISHED");
export const isUnpinned = (place: DestinationChoice) => place.latitude == null || place.longitude == null;

/** A stop that leaves before it arrives, by its place in travel order (1-based); null when every stop is in order. */
export function firstBackwardsStop(days: readonly DraftDay[]): number | null {
  const stops = days.flatMap((day) => day.stops);
  const index = stops.findIndex((stop) => stop.arrivalTime && stop.departureTime && stop.departureTime < stop.arrivalTime);
  return index < 0 ? null : index + 1;
}

export function draftFrom(itinerary: CorridorItinerary): DraftDay[] {
  return itinerary.days.map((day) => ({
    key: day.id,
    title: day.title ?? "",
    description: day.description ?? "",
    startTime: time(day.startTime),
    notes: day.notes ?? "",
    stops: day.stops.map((stop) => ({
      key: stop.id,
      destinationId: stop.destination.id,
      arrivalTime: time(stop.arrivalTime),
      departureTime: time(stop.departureTime),
      duration: stop.recommendedDurationMinutes == null ? "" : String(stop.recommendedDurationMinutes),
      transportType: stop.transportType ?? "",
      title: stop.title ?? "",
      description: stop.description ?? "",
      notes: stop.notes ?? "",
    })),
  }));
}

const blank = (value: string) => (value.trim() ? value.trim() : null);

/** The request body: empty text as null, minutes as a number, the first stop reached by nothing. */
export function inputFrom(days: readonly DraftDay[]): ItineraryDayInput[] {
  let first = true;
  return days.map((day) => ({
    title: blank(day.title),
    description: blank(day.description),
    startTime: blank(day.startTime),
    notes: blank(day.notes),
    stops: day.stops.map((stop) => {
      const minutes = stop.duration.trim() === "" ? null : Number(stop.duration);
      const transportType = first ? null : stop.transportType || DEFAULT_TRANSPORT;
      first = false;
      return {
        destinationId: stop.destinationId,
        arrivalTime: blank(stop.arrivalTime),
        departureTime: blank(stop.departureTime),
        recommendedDurationMinutes: minutes == null || Number.isNaN(minutes) ? null : Math.round(minutes),
        transportType,
        title: blank(stop.title),
        description: blank(stop.description),
        notes: blank(stop.notes),
      };
    }),
  }));
}

export function draftReducer(days: readonly DraftDay[], action: DraftAction): readonly DraftDay[] {
  switch (action.type) {
    case "reset":
      return action.days;
    case "addDay":
      return [...days, blankDay(action.key)];
    case "removeDay":
      return days.filter((day) => day.key !== action.day);
    case "editDay":
      return days.map((day) => (day.key === action.day ? { ...day, ...action.patch } : day));
    case "addStop":
      return days.map((day) =>
        day.key === action.day
          ? {
              ...day,
              stops: [
                ...day.stops,
                {
                  key: action.key,
                  destinationId: action.destinationId,
                  arrivalTime: "",
                  departureTime: "",
                  duration: "",
                  transportType: DEFAULT_TRANSPORT,
                  title: "",
                  description: "",
                  notes: "",
                },
              ],
            }
          : day,
      );
    case "removeStop":
      return days.map((day) => ({ ...day, stops: day.stops.filter((stop) => stop.key !== action.stop) }));
    case "editStop":
      return days.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => (stop.key === action.stop ? { ...stop, ...action.patch } : stop)),
      }));
    case "moveStop":
      return moveStop(days, action.stop, action.day, action.index);
    case "shiftStop":
      return shiftStop(days, action.stop, action.by);
  }
}

function locate(days: readonly DraftDay[], stopKey: string): { day: number; index: number } | null {
  for (let day = 0; day < days.length; day++) {
    const index = days[day].stops.findIndex((stop) => stop.key === stopKey);
    if (index >= 0) return { day, index };
  }
  return null;
}

function moveStop(days: readonly DraftDay[], stopKey: string, dayKey: string, index: number): readonly DraftDay[] {
  const from = locate(days, stopKey);
  const to = days.findIndex((day) => day.key === dayKey);
  if (!from || to < 0) return days;
  const stop = days[from.day].stops[from.index];
  // Taken out of the same day before the target, the target moves up by one.
  const target = from.day === to && from.index < index ? index - 1 : index;
  if (from.day === to && target === from.index) return days;
  const without = days.map((day, position) =>
    position === from.day ? { ...day, stops: day.stops.filter((candidate) => candidate.key !== stopKey) } : day,
  );
  return without.map((day, position) => {
    if (position !== to) return day;
    const stops = [...day.stops];
    stops.splice(Math.max(0, Math.min(target, stops.length)), 0, stop);
    return { ...day, stops };
  });
}

function shiftStop(days: readonly DraftDay[], stopKey: string, by: -1 | 1): readonly DraftDay[] {
  const from = locate(days, stopKey);
  if (!from) return days;
  const day = days[from.day];
  if (by === -1) {
    if (from.index > 0) return moveStop(days, stopKey, day.key, from.index - 1);
    if (from.day === 0) return days;
    const previous = days[from.day - 1];
    return moveStop(days, stopKey, previous.key, previous.stops.length);
  }
  if (from.index < day.stops.length - 1) return moveStop(days, stopKey, day.key, from.index + 2);
  if (from.day === days.length - 1) return days;
  return moveStop(days, stopKey, days[from.day + 1].key, 0);
}

/** A leg by what it joins and how, as the stored route's legs are matched. */
export function legKey(fromDestination: string, toDestination: string, transport: TransportType | "" | null): string {
  return `${fromDestination}>${toDestination}|${transport || DEFAULT_TRANSPORT}`;
}

export interface KnownLeg {
  readonly distanceKm: number | null;
  readonly minutes: number | null;
  readonly polyline: string | null;
}

/** A stop as the road preview is asked for it: the first reached by nothing. */
export interface PreviewStop {
  readonly destinationId: string;
  readonly transportType: TransportType | null;
}

/**
 * The shortest run of stops, in travel order, that covers every leg whose road
 * is not known — a stop added at the end asks for just the last leg. Null when
 * every leg is known, or there are fewer than two stops.
 */
export function roadWindow(days: readonly DraftDay[], isKnown: (key: string) => boolean): PreviewStop[] | null {
  const stops = days.flatMap((day) => day.stops);
  let first = -1;
  let last = -1;
  for (let index = 1; index < stops.length; index++) {
    if (isKnown(legKey(stops[index - 1].destinationId, stops[index].destinationId, stops[index].transportType))) continue;
    if (first < 0) first = index;
    last = index;
  }
  if (first < 0) return null;
  return stops.slice(first - 1, last + 1).map((stop, index) => ({
    destinationId: stop.destinationId,
    transportType: index === 0 ? null : stop.transportType || DEFAULT_TRANSPORT,
  }));
}

/** The previewed legs by what each joins and how, as the map and the builder look legs up; ones not worked out are left out. */
export function legsFromPreview(legs: readonly RoutePreviewLeg[]): Map<string, KnownLeg> {
  const known = new Map<string, KnownLeg>();
  for (const leg of legs) {
    if (leg.distanceKm == null || !leg.polyline) continue;
    known.set(legKey(leg.fromDestinationId, leg.toDestinationId, leg.transportType), {
      distanceKm: leg.distanceKm,
      minutes: leg.minutes,
      polyline: leg.polyline,
    });
  }
  return known;
}

/** The saved route's legs, while it fits the saved stops; a draft keeps the ones whose ends and transport it kept. */
export function knownLegs(itinerary: CorridorItinerary): ReadonlyMap<string, KnownLeg> {
  const legs = new Map<string, KnownLeg>();
  if (itinerary.route.status !== "CURRENT") return legs;
  const stops = itinerary.days.flatMap((day) => day.stops);
  stops.forEach((stop, index) => {
    if (index === 0) return;
    legs.set(legKey(stops[index - 1].destination.id, stop.destination.id, stop.transportType), {
      distanceKm: stop.distanceFromPreviousKm,
      minutes: stop.travelTimeFromPreviousMinutes,
      polyline: stop.routePolyline,
    });
  });
  return legs;
}

/** The draft's stops in travel order, as the map draws them. */
export function mapStopsFrom(
  days: readonly DraftDay[],
  places: ReadonlyMap<string, DestinationChoice>,
  legs: ReadonlyMap<string, KnownLeg>,
): MapStop[] {
  const stops: MapStop[] = [];
  let previous: DraftStop | null = null;
  days.forEach((day, dayIndex) => {
    for (const stop of day.stops) {
      const place = places.get(stop.destinationId);
      const leg = previous ? legs.get(legKey(previous.destinationId, stop.destinationId, stop.transportType)) : undefined;
      const minutes = Number(stop.duration);
      stops.push({
        key: stop.key,
        sequence: stops.length + 1,
        dayNumber: dayIndex + 1,
        name: place?.name ?? "Unknown destination",
        subtitle: place?.provinceName ?? null,
        summary: stop.description.trim() || place?.shortDescription || null,
        coverUrl: place?.coverUrl ?? null,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        arrivalTime: stop.arrivalTime || null,
        departureTime: stop.departureTime || null,
        recommendedDurationMinutes: stop.duration.trim() && !Number.isNaN(minutes) ? minutes : null,
        transportType: previous ? stop.transportType || DEFAULT_TRANSPORT : null,
        distanceKm: leg?.distanceKm ?? null,
        travelMinutes: leg?.minutes ?? null,
        routePolyline: leg?.polyline ?? null,
        href: `/destinations/${stop.destinationId}`,
      });
      previous = stop;
    }
  });
  return stops;
}
