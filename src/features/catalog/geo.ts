/**
 * Reading a map point out of what people paste: a coordinate pair copied from
 * Google or Apple Maps, or a link to the place in one of the map apps.
 *
 * Pure functions, shared by the listing form and the route that follows
 * Google's short share links.
 */

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

/** A point read from a link. A map link's `@lat,lng` is only where the map was centred, not a pin. */
export interface LinkedPoint extends GeoPoint {
  readonly exact: boolean;
}

/** A place found by name: what it is called, and where it is. */
export interface PlaceResult extends GeoPoint {
  readonly name: string;
  /** The full address, for telling two places of the same name apart. */
  readonly label: string;
}

/** South-west and north-east corners of Cambodia: the view before anything is pinned. */
export const CAMBODIA_BOUNDS: readonly [readonly [number, number], readonly [number, number]] = [
  [10.35, 102.3],
  [14.7, 107.65],
];

/** Six decimals, about ten centimetres: what the latitude and longitude fields step by. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function isPoint(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function point(latitude: number, longitude: number): GeoPoint | null {
  return isPoint(latitude, longitude)
    ? { latitude: roundCoordinate(latitude), longitude: roundCoordinate(longitude) }
    : null;
}

/**
 * `13.412469, 103.866986` as Google Maps copies it, `13.41247° N, 103.86699° E`
 * as Apple Maps does, or the two numbers separated by a space.
 */
const PAIR =
  /^\s*(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i;

export function parseCoordinatePair(text: string): GeoPoint | null {
  const match = PAIR.exec(text);
  if (!match) return null;
  const latitude = Number(match[1]) * (match[2]?.toUpperCase() === "S" ? -1 : 1);
  const longitude = Number(match[3]) * (match[4]?.toUpperCase() === "W" ? -1 : 1);
  return point(latitude, longitude);
}

const NUMBER = String.raw`(-?\d{1,3}\.\d+)`;

/** Where each app writes the place itself, most precise first. */
const EXACT: readonly RegExp[] = [
  /* Google's place data: `!3d13.4124693!4d103.8669857`. */
  new RegExp(String.raw`!3d${NUMBER}!4d${NUMBER}`, "g"),
  /* `?q=13.41,103.86`, `?ll=` (Apple), `?destination=`, `?coordinate=`, `?query=`. */
  new RegExp(String.raw`[?&](?:q|query|ll|sll|destination|daddr|coordinate)=(?:loc:)?${NUMBER}\s*,\s*\+?${NUMBER}`, "g"),
  /* `/maps/search/13.41,+103.86`, `/maps/place/13.41,103.86`, `/maps/dir//13.41,103.86`. */
  new RegExp(String.raw`/maps/(?:search|place|dir)/+${NUMBER}\s*,\s*\+?${NUMBER}`, "g"),
  /* A `geo:` URI, as Android shares a point. */
  new RegExp(String.raw`^geo:${NUMBER}\s*,\s*${NUMBER}`, "g"),
];

/** OpenStreetMap's marker. */
const OSM_MARKER = new RegExp(String.raw`[?&]mlat=${NUMBER}&mlon=${NUMBER}`);

/** Where the map was looking when the link was copied: near the place, not on it. */
const CENTRE: readonly RegExp[] = [
  new RegExp(String.raw`/@${NUMBER},${NUMBER}`, "g"),
  new RegExp(String.raw`#map=\d{1,2}/${NUMBER}/${NUMBER}`, "g"),
];

function lastMatch(pattern: RegExp, text: string): RegExpExecArray | null {
  pattern.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) last = match;
  return last;
}

/**
 * The first link in what was pasted. Sharing from the Google Maps app copies
 * the place's name and address along with it.
 */
export function findLink(text: string): string | null {
  return /(?:https?:\/\/|geo:)[^\s<>"]+/i.exec(text)?.[0] ?? null;
}

/** The point a map link carries, or null when it carries none. */
export function pointInMapLink(link: string): LinkedPoint | null {
  let text = link.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    /* A stray `%` — read it as it came. */
  }

  for (const pattern of EXACT) {
    const match = lastMatch(pattern, text);
    const found = match && point(Number(match[1]), Number(match[2]));
    if (found) return { ...found, exact: true };
  }
  const marker = OSM_MARKER.exec(text);
  const pinned = marker && point(Number(marker[1]), Number(marker[2]));
  if (pinned) return { ...pinned, exact: true };

  for (const pattern of CENTRE) {
    const match = lastMatch(pattern, text);
    const found = match && point(Number(match[1]), Number(match[2]));
    if (found) return { ...found, exact: false };
  }
  return null;
}

/**
 * Google's share links (`maps.app.goo.gl/…`, `goo.gl/maps/…`, `g.co/kgs/…`)
 * carry nothing until they are followed — the server does that.
 */
export function isShortMapLink(text: string): boolean {
  return /^\s*https:\/\/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps\/|g\.co\/kgs\/)[\w-]+\/?(?:\?\S*)?\s*$/i.test(text);
}

/** Hosts a short link may pass through on its way to the map. */
export function isGoogleHost(hostname: string): boolean {
  return /(?:^|\.)(?:google\.com|google\.com\.kh|goo\.gl|g\.co)$/i.test(hostname);
}
