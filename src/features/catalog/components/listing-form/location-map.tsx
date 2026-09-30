"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ExternalLink, LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findLink,
  isShortMapLink,
  parseCoordinatePair,
  pointInMapLink,
  roundCoordinate,
  type GeoPoint,
  type PlaceResult,
} from "@/features/catalog/geo";
import { useLazyResolveMapLinkQuery, useLazySearchPlacesQuery } from "@/features/catalog/api/geo-api";
import type { FormValues } from "@/features/catalog/resource";
import { cn } from "@/lib/utils";
import { toApiError } from "@/store/api/api-error";
import type { MapFocus, MapLayer } from "./pin-map";

const PinMap = dynamic(() => import("./pin-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      Loading the map…
    </div>
  ),
});

/** A phone outdoors settles within a few metres; stop listening once it is this close. */
const PRECISE_METRES = 15;
/** Past this, the position is a guess from Wi-Fi or the mobile network. */
const ROUGH_METRES = 100;
/** How long a device is given to find a better fix. */
const LOCATE_MS = 20_000;

type Tone = "info" | "success" | "warning" | "error";
interface Notice {
  readonly tone: Tone;
  readonly text: string;
}

const TONES: Readonly<Record<Tone, string>> = {
  info: "border-line bg-sand text-ink-soft",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-gold/30 bg-gold-soft text-gold-deep",
  error: "border-heritage/25 bg-heritage-soft text-heritage",
};

function coordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

/** Close enough to see the entrance when the position is good, wide enough to find it when not. */
function zoomFor(accuracy: number): number {
  if (accuracy <= 30) return 18;
  if (accuracy <= 150) return 17;
  if (accuracy <= 1000) return 15;
  return 13;
}

function metres(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

const LOCATION_ERRORS: Readonly<Record<number, string>> = {
  1: "Location is blocked for this site. Allow it from the icon beside the address bar, then try again — or drop the pin by hand.",
  2: "This device could not work out where it is. Turn on location services, or drop the pin by hand.",
  3: "Finding your position took too long. Try again with a clear view of the sky, or drop the pin by hand.",
};

/**
 * Where the listing is. Four ways to put the pin down, all ending in the
 * latitude and longitude fields under it:
 *
 * - **Use my location** — standing at the place with a phone, the device's GPS.
 * - **Search** — a place name, found through OpenStreetMap.
 * - **The map** — click a spot, or drag the pin onto the entrance.
 * - **Paste** — coordinates, or a Google Maps link (share links included).
 */
export function LocationMap({ disabled = false }: { disabled?: boolean }) {
  const { control, setValue } = useFormContext<FormValues>();
  const latitude = coordinate(useWatch({ control, name: "latitude" }), 90);
  const longitude = coordinate(useWatch({ control, name: "longitude" }), 180);
  const point = useMemo<GeoPoint | null>(
    () => (latitude !== null && longitude !== null ? { latitude, longitude } : null),
    [latitude, longitude],
  );

  const [layer, setLayer] = useState<MapLayer>("map");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [query, setQuery] = useState("");
  const [searchPlaces] = useLazySearchPlacesQuery();
  const [resolveMapLink] = useLazyResolveMapLinkQuery();
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<readonly PlaceResult[] | null>(null);

  const [pasted, setPasted] = useState("");
  const [reading, setReading] = useState(false);
  /* A paste, then Enter or leaving the box, must not follow the same link twice. */
  const following = useRef(false);

  const [locating, setLocating] = useState<{ readonly accuracy: number | null } | null>(null);
  const watch = useRef<number | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopWatching() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    if (deadline.current !== null) clearTimeout(deadline.current);
    watch.current = null;
    deadline.current = null;
  }
  useEffect(() => stopWatching, []);

  /** Writes the point into both fields; `zoom` also moves the map to it. */
  function place(next: GeoPoint, options: { zoom?: number; accuracy?: number | null } = {}) {
    setValue("latitude", String(roundCoordinate(next.latitude)), { shouldDirty: true, shouldValidate: true });
    setValue("longitude", String(roundCoordinate(next.longitude)), { shouldDirty: true, shouldValidate: true });
    setAccuracy(options.accuracy ?? null);
    if (options.zoom !== undefined) setFocus({ point: next, zoom: options.zoom });
  }

  function pickOnMap(next: GeoPoint) {
    if (disabled) return;
    if (watch.current !== null) {
      stopWatching();
      setLocating(null);
    }
    place(next);
    setNotice(null);
  }

  function clearPin() {
    setValue("latitude", "", { shouldDirty: true, shouldValidate: true });
    setValue("longitude", "", { shouldDirty: true, shouldValidate: true });
    setAccuracy(null);
    setNotice(null);
  }

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setNotice({ tone: "error", text: "This browser cannot share its location. Drop the pin on the map instead." });
      return;
    }
    if (!window.isSecureContext) {
      setNotice({
        tone: "error",
        text: "Browsers share your location only with a secure (https) address. Open the dashboard over https, or drop the pin by hand.",
      });
      return;
    }

    stopWatching();
    setNotice(null);
    setResults(null);
    setLocating({ accuracy: null });
    let best = Number.POSITIVE_INFINITY;
    let done = false;

    const finish = (failure?: GeolocationPositionError) => {
      if (done) return;
      done = true;
      stopWatching();
      setLocating(null);
      if (best === Number.POSITIVE_INFINITY) {
        setNotice({ tone: "error", text: LOCATION_ERRORS[failure?.code ?? 3] ?? LOCATION_ERRORS[2] });
      } else if (best > ROUGH_METRES) {
        setNotice({
          tone: "warning",
          text: `This is only roughly where you are — within ${metres(best)}. A computer guesses from Wi-Fi; drag the pin onto the exact spot, or try again on a phone at the place.`,
        });
      } else {
        setNotice({
          tone: "success",
          text: `Pinned where you are standing, to within ${metres(best)}. Drag the pin if the entrance is somewhere else.`,
        });
      }
    };

    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: within } = position.coords;
        if (within >= best) return;
        best = within;
        place({ latitude: lat, longitude: lng }, { zoom: zoomFor(within), accuracy: within });
        setLocating({ accuracy: within });
        if (within <= PRECISE_METRES) finish();
      },
      /* A failure after a first fix still leaves a usable pin. */
      (failure) => finish(failure),
      { enableHighAccuracy: true, maximumAge: 0, timeout: LOCATE_MS },
    );
    deadline.current = setTimeout(() => finish(), LOCATE_MS);
  }

  async function search() {
    const text = query.trim();
    if (text.length < 2 || searching) return;
    setSearching(true);
    setNotice(null);
    try {
      setResults(await searchPlaces(text, true).unwrap());
    } catch (error) {
      const problem = toApiError(error);
      setResults(null);
      setNotice({
        tone: "error",
        text: problem && problem.status > 0
          ? (problem.message ?? "Place search failed. Drop the pin on the map instead.")
          : "Place search could not be reached. Drop the pin on the map instead.",
      });
    } finally {
      setSearching(false);
    }
  }

  function choose(result: PlaceResult) {
    place(result, { zoom: 17 });
    setResults(null);
    setQuery(result.name);
    setNotice({
      tone: "info",
      text: `Pinned at ${result.name}, as OpenStreetMap places it. Switch to Satellite and drag the pin onto the entrance if it is off.`,
    });
  }

  /** Reads a pasted pair or link. `settled` is a paste, Enter or leaving the box — a link is only followed then. */
  async function readPasted(text: string, settled: boolean) {
    setPasted(text);
    const trimmed = text.trim();
    if (!trimmed) return;

    const pair = parseCoordinatePair(trimmed);
    if (pair) {
      place(pair, { zoom: 17 });
      setPasted("");
      setNotice({ tone: "info", text: "Pinned at the coordinates you pasted." });
      return;
    }
    if (!settled) return;

    const link = findLink(trimmed);
    if (!link) {
      setNotice({ tone: "error", text: "Paste a latitude and a longitude separated by a comma, or a Google Maps link." });
      return;
    }

    let found = pointInMapLink(link);
    if (!found && isShortMapLink(link)) {
      if (following.current) return;
      following.current = true;
      setReading(true);
      try {
        found = await resolveMapLink(link, true).unwrap();
      } catch (error) {
        const problem = toApiError(error);
        setNotice({
          tone: "error",
          text: (problem && problem.status > 0 ? problem.message : null) ?? "That link could not be read. Copy the coordinates instead.",
        });
        return;
      } finally {
        following.current = false;
        setReading(false);
      }
    }

    if (!found) {
      setNotice({
        tone: "error",
        text: "That link does not say where the place is. In Google Maps, right-click (or long-press) the spot and copy the numbers instead.",
      });
      return;
    }
    place(found, { zoom: 17 });
    setPasted("");
    setNotice(
      found.exact
        ? { tone: "info", text: "Pinned at the place in the link." }
        : {
            tone: "warning",
            text: "The link only shows where the map was looking, not a pin. Check the pin is on the place and drag it if not.",
          },
    );
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    /* Enter would otherwise submit the whole listing form. */
    if (event.key !== "Enter") return;
    event.preventDefault();
    void search();
  }

  const busyLocating = locating !== null;

  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
              <Input
                aria-label="Search for a place"
                className="pl-8"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search a place, e.g. Bayon Temple"
                value={query}
              />
            </div>
            <Button disabled={disabled || searching || query.trim().length < 2} onClick={() => void search()} type="button" variant="secondary">
              {searching ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              Search
            </Button>
          </div>

          {results ? (
            <div className="glass absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line shadow-pop">
              <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-muted">
                <span>{results.length ? `${results.length} ${results.length === 1 ? "place" : "places"} in Cambodia` : "No places found"}</span>
                <button aria-label="Close the results" className="rounded-sm p-0.5 hover:bg-sand-deep hover:text-ink" onClick={() => setResults(null)} type="button">
                  <X aria-hidden className="size-3.5" />
                </button>
              </div>
              {results.length ? (
                <ul className="quiet-scroll max-h-64 overflow-y-auto">
                  {results.map((result) => (
                    <li key={`${result.latitude},${result.longitude},${result.label}`}>
                      <button
                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-sand focus-visible:bg-sand focus-visible:outline-none"
                        onClick={() => choose(result)}
                        type="button"
                      >
                        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{result.name}</span>
                          <span className="block truncate text-xs text-muted">{result.label}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-muted">
                  Nothing in Cambodia matches “{query.trim()}”. Try another spelling, or click the map.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <Button
          disabled={disabled}
          onClick={() => {
            if (busyLocating) {
              stopWatching();
              setLocating(null);
              setNotice(point ? { tone: "info", text: "Stopped. The pin stays at the last position found." } : null);
            } else {
              locate();
            }
          }}
          type="button"
          variant={busyLocating ? "secondary" : "default"}
        >
          {busyLocating ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <LocateFixed aria-hidden className="size-4" />}
          {busyLocating ? "Stop" : "Use my location"}
        </Button>
      </div>

      <div className="isolate overflow-hidden rounded-lg border border-line bg-sand">
        <div className="relative h-80 md:h-96">
          <PinMap accuracy={accuracy} focus={focus} layer={layer} onPick={pickOnMap} point={point} readOnly={disabled} />

          <div className="absolute top-2.5 right-2.5 z-[1000] flex rounded-md border border-line-strong bg-paper p-0.5 shadow-xs" role="group" aria-label="Map style">
            {(["map", "satellite"] as const).map((option) => (
              <button
                aria-pressed={layer === option}
                className={cn(
                  "h-7 rounded-sm px-2.5 text-xs font-medium transition-colors",
                  layer === option ? "bg-inverse text-inverse-foreground" : "text-ink-soft hover:bg-sand-deep hover:text-ink",
                )}
                key={option}
                onClick={() => setLayer(option)}
                type="button"
              >
                {option === "map" ? "Map" : "Satellite"}
              </button>
            ))}
          </div>

          {busyLocating ? (
            <div className="absolute inset-x-0 bottom-0 z-[1000] flex items-center gap-2 border-t border-line bg-paper/95 px-3 py-2 text-xs text-ink-soft">
              <LoaderCircle aria-hidden className="size-3.5 animate-spin text-teal" />
              {locating.accuracy === null
                ? "Finding your position… allow location if the browser asks."
                : `Improving the position… within ${metres(locating.accuracy)} so far.`}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-line bg-paper px-3 py-2 text-xs text-muted">
          {point ? (
            <>
              <span className="flex items-center gap-2">
                <MapPin aria-hidden className="size-3.5 text-teal" />
                <span className="font-mono text-ink-soft tabular-nums">
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </span>
                {accuracy ? <span>± {metres(accuracy)}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <a
                  className="inline-flex items-center gap-1 font-medium text-teal-deep hover:underline"
                  href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Check in Google Maps
                  <ExternalLink aria-hidden className="size-3" />
                </a>
                {disabled ? null : (
                  <button className="font-medium text-ink-soft hover:text-heritage" onClick={clearPin} type="button">
                    Remove pin
                  </button>
                )}
              </span>
            </>
          ) : (
            <span>No pin yet. Click the map where the place is, search for it, or use your location.</span>
          )}
        </div>
      </div>

      {notice ? (
        <p className={cn("rounded-md border px-3 py-2 text-xs", TONES[notice.tone])} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Paste coordinates or a map link <span className="text-xs font-normal text-muted">(fills Latitude and Longitude below)</span>
        </span>
        <div className="relative md:max-w-xl">
          <Input
            className="pr-8 font-mono text-sm"
            disabled={disabled}
            readOnly={reading}
            onBlur={(event) => void readPasted(event.target.value, true)}
            onChange={(event) => void readPasted(event.target.value, false)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void readPasted(event.currentTarget.value, true);
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!text) return;
              event.preventDefault();
              void readPasted(text, true);
            }}
            placeholder="13.412469, 103.866986  or  https://maps.app.goo.gl/…"
            spellCheck={false}
            value={pasted}
          />
          {reading ? <LoaderCircle aria-hidden className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted" /> : null}
        </div>
      </label>
    </div>
  );
}
