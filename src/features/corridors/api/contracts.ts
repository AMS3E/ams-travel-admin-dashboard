/**
 * The API's tourism corridors, as the CMS reads them.
 *
 * `GET /corridors/{id}/itinerary` is the corridor with its days, each day's
 * stops in travel order, the destination each stop is at, and the road route
 * Google Routes worked out between them. `PUT` on the same path replaces the
 * days and stops.
 */

export type CorridorStatus = "DRAFT" | "PUBLISHED";

/** How the stored road route stands against the stops as they are now. */
export type CorridorRouteStatus = "NONE" | "MISSING" | "CURRENT" | "STALE";

export type TransportType =
  | "CAR"
  | "MINIVAN"
  | "BUS"
  | "TUK_TUK"
  | "MOTORBIKE"
  | "BICYCLE"
  | "WALK"
  | "BOAT"
  | "FLIGHT";

export interface CorridorSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  readonly status: CorridorStatus;
  readonly isFeatured: boolean;
  readonly durationDays: number | null;
  readonly durationNights: number | null;
  readonly stopCount: number;
  readonly totalDistanceKm: number | null;
  readonly totalDurationMinutes: number | null;
  readonly estimatedBudgetMin: number | null;
  readonly estimatedBudgetMax: number | null;
  readonly startDestinationId: string | null;
  readonly endDestinationId: string | null;
  readonly routeStatus: CorridorRouteStatus;
  readonly routeCalculatedAt: string | null;
  readonly routeError: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface ItineraryDestination {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly shortDescription: string | null;
  readonly coverUrl: string | null;
  readonly provinceId: string;
  readonly provinceName: string | null;
  readonly regionId: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface ItineraryStop {
  readonly id: string;
  /** The stop's number over the whole corridor: the number on its marker. */
  readonly sequence: number;
  readonly stopOrder: number;
  readonly destination: ItineraryDestination;
  /** `HH:mm:ss` or `HH:mm`. */
  readonly arrivalTime: string | null;
  readonly departureTime: string | null;
  readonly recommendedDurationMinutes: number | null;
  /** How the stop is reached from the one before; null on the first stop. */
  readonly transportType: TransportType | null;
  readonly distanceFromPreviousKm: number | null;
  readonly travelTimeFromPreviousMinutes: number | null;
  /** The road from the stop before, as Google encodes a line; only while the route is current. */
  readonly routePolyline: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly notes: string | null;
}

export interface ItineraryDay {
  readonly id: string;
  readonly dayNumber: number;
  readonly title: string | null;
  readonly description: string | null;
  readonly startTime: string | null;
  readonly notes: string | null;
  readonly distanceKm: number | null;
  readonly travelMinutes: number | null;
  readonly stops: readonly ItineraryStop[];
}

export interface CorridorRoute {
  readonly status: CorridorRouteStatus;
  readonly encodedPolyline: string | null;
  readonly totalDistanceKm: number | null;
  readonly totalDurationMinutes: number | null;
  readonly calculatedAt: string | null;
  readonly error: string | null;
  /** Whether the API can work roads out: a Google key, or an OpenStreetMap routing server. */
  readonly configured: boolean;
}

export interface CorridorItinerary {
  readonly corridor: CorridorSummary;
  readonly days: readonly ItineraryDay[];
  readonly route: CorridorRoute;
}

/** `PUT /corridors/{id}/itinerary`: days and stops in order; times as `HH:mm`. */
export interface ItineraryStopInput {
  readonly destinationId: string;
  readonly arrivalTime: string | null;
  readonly departureTime: string | null;
  readonly recommendedDurationMinutes: number | null;
  readonly transportType: TransportType | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly notes: string | null;
}

export interface ItineraryDayInput {
  readonly title: string | null;
  readonly description: string | null;
  readonly startTime: string | null;
  readonly notes: string | null;
  readonly stops: readonly ItineraryStopInput[];
}

/** A new corridor's overview; its slug is made from the name. */
export interface CorridorOverviewInput {
  readonly name: string;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly coverKey: string | null;
  readonly estimatedBudgetMin: number | null;
  readonly estimatedBudgetMax: number | null;
  readonly isFeatured: boolean;
  /** Tourism Corridors interests, whose pages on the website list it. */
  readonly interestIds: readonly string[];
}

/** `POST /corridors/route-preview`: the roads between stops not saved yet; a leg's figures are null when not worked out. */
export interface RoutePreviewLeg {
  readonly fromDestinationId: string;
  readonly toDestinationId: string;
  readonly transportType: TransportType;
  readonly distanceKm: number | null;
  readonly minutes: number | null;
  readonly polyline: string | null;
}

export interface RoutePreview {
  readonly configured: boolean;
  readonly legs: readonly RoutePreviewLeg[];
  readonly error: string | null;
}

/*
 * What the dashboard's corridor routes (`app/api/corridors/...`) answer. A
 * refusal — a permission, a stop out of range, Spring's own reason — comes back
 * as `{ ok: false, message }` with 200, for the screen to show as it is.
 */

/** `POST /api/corridors`: a corridor in one go — overview, days and stops, published when asked and allowed. */
export interface CreateCorridorInput {
  readonly overview: CorridorOverviewInput;
  readonly days: readonly ItineraryDayInput[];
  readonly publish: boolean;
}

export type CreateCorridorResult =
  | { readonly ok: true; readonly id: string }
  /** `id` when the corridor was created but a later step failed: open it, do not create it again. */
  | { readonly ok: false; readonly message: string; readonly id?: string };

export type ItineraryResult =
  | { readonly ok: true; readonly itinerary: CorridorItinerary }
  | { readonly ok: false; readonly message: string };

export type PublishResult =
  | { readonly ok: true; readonly corridor: CorridorSummary }
  | { readonly ok: false; readonly message: string };

export type RoutePreviewResult =
  | { readonly ok: true; readonly preview: RoutePreview }
  | { readonly ok: false; readonly message: string };

/** One stop of a plan not saved yet, for `POST /api/corridors/route-preview`. */
export interface PreviewStopInput {
  readonly destinationId: string;
  readonly transportType: TransportType | null;
}

/** A destination the builder can add as a stop. */
export interface DestinationChoice {
  readonly id: string;
  readonly name: string;
  readonly provinceName: string | null;
  readonly status: string | null;
  readonly coverUrl: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly shortDescription: string | null;
  /** Its category names, e.g. "Temples", for telling places apart while choosing. */
  readonly categories: readonly string[];
}

/** What the map needs of a stop, whether saved or still in the builder. */
export interface MapStop {
  readonly key: string;
  readonly sequence: number;
  readonly dayNumber: number;
  readonly name: string;
  readonly subtitle: string | null;
  /** A line about the place: the stop's own description, else the destination's short one. */
  readonly summary: string | null;
  readonly coverUrl: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly arrivalTime: string | null;
  readonly departureTime: string | null;
  readonly recommendedDurationMinutes: number | null;
  readonly transportType: TransportType | null;
  readonly distanceKm: number | null;
  readonly travelMinutes: number | null;
  /** The road from the stop before; null draws a straight dashed line. */
  readonly routePolyline: string | null;
  readonly href: string | null;
}
