"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CircleAlert, CircleCheck, ClipboardPaste, ExternalLink, LoaderCircle, LocateFixed, MapPin, Maximize2, Minimize2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findLink,
  isShortMapLink,
  parseCoordinatePair,
  pointInMapLink,
  provinceKey,
  roundCoordinate,
  type GeoPoint,
  type PlaceDetails,
  type PlaceResult,
} from "@/features/catalog/geo";
import { useLazyDescribePlaceQuery, useLazyResolveMapLinkQuery, useLazySearchPlacesQuery } from "@/features/catalog/api/geo-api";
import type { FormValues, ReferenceOption } from "@/features/catalog/resource";
import { cn } from "@/lib/utils";
import { toApiError } from "@/store/api/api-error";
import type { MapFocus, MapLayer } from "./pin-map";

function MapLoading() {
  const t = useTranslations("forms.map");
  return (
    <div className="flex size-full items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {t("loading")}
    </div>
  );
}

const PinMap = dynamic(() => import("./pin-map"), {
  ssr: false,
  loading: () => <MapLoading />,
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

/** Why the device's position could not be had, by the browser's error code. */
const LOCATION_ERRORS: Readonly<Record<number, "blocked" | "unavailable" | "timeout">> = {
  1: "blocked",
  2: "unavailable",
  3: "timeout",
};

interface LocationMapProps {
  readonly disabled?: boolean;
  /** The provinces the form's Province field offers, to fill it from the pin; none where the form has no such field. */
  readonly provinces?: readonly ReferenceOption[];
  /** Which of the form's fields the pin may fill: a stay has an address and no province. */
  readonly fills?: { readonly province: boolean; readonly address: boolean };
}

/**
 * Where the listing is: one box, the map, and what the pin knows filled in.
 *
 * The box takes what an editor already has — the place's Google Maps link,
 * pasted or brought in with Paste link — or its name, looked up through
 * OpenStreetMap; a pair of coordinates typed into it works too. The map takes
 * a click or a drag of the pin, and its crosshair button the device's own
 * position, for someone standing at the place. Latitude and longitude are
 * shown under the map, since the pin is them; Edit beside them opens their
 * two boxes, for the rare time the numbers themselves need adjusting.
 *
 * Each time the pin is put down or moved the map is asked what is there. The
 * province follows the pin: where the pin is decides it. The address follows
 * it too while it is empty or still as the map wrote it; an address a person
 * wrote is never replaced, and the map's is offered beside it instead. A
 * province changed by hand afterwards that the pin disagrees with is pointed
 * out, not changed.
 */
export function LocationMap({ disabled = false, provinces = [], fills = { province: false, address: false } }: LocationMapProps) {
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<FormValues>();
  const t = useTranslations("forms.map");
  const actions = useTranslations("forms.actions");
  const findId = useId();
  /* The two coordinate boxes, open only when asked for. */
  const [editing, setEditing] = useState(false);
  /* The last pair typed by hand that the map was asked about, so leaving each box does not ask twice. */
  const settled = useRef("");
  const latitude = coordinate(useWatch({ control, name: "latitude" }), 90);
  const longitude = coordinate(useWatch({ control, name: "longitude" }), 180);
  const point = useMemo<GeoPoint | null>(
    () => (latitude !== null && longitude !== null ? { latitude, longitude } : null),
    [latitude, longitude],
  );
  const provinceId = useWatch({ control, name: "provinceId" });
  const address = useWatch({ control, name: "address" });

  const [layer, setLayer] = useState<MapLayer>("map");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [query, setQuery] = useState("");
  const [searchPlaces] = useLazySearchPlacesQuery();
  const [resolveMapLink] = useLazyResolveMapLinkQuery();
  const [describePlace] = useLazyDescribePlaceQuery();
  const [finding, setFinding] = useState(false);
  /* The map is being asked what is at the pin: the province and the address are on their way. */
  const [describing, setDescribing] = useState(false);
  /* The map over the whole window, for finding a spot in comfort. */
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<readonly PlaceResult[] | null>(null);
  /* A paste, then Enter, must not follow the same link twice. */
  const following = useRef(false);

  /* What the map says is at the pin, and what this box filled from it. */
  const [found, setFound] = useState<PlaceDetails | null>(null);
  const [filled, setFilled] = useState<{ readonly provinceId: string | null; readonly address: string | null }>({ provinceId: null, address: null });
  /* The latest pin asked about: an answer for an earlier one is dropped. */
  const asked = useRef(0);

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

  /* Over the whole window: the page behind stays put, Escape brings the form back, and the box is ready to type in. */
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    document.getElementById(findId)?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, findId]);

  const provinceOf = (name: string | undefined) => (name ? provinces.find((option) => provinceKey(option.label) === provinceKey(name)) : undefined);

  /** Writes the point into both fields; `zoom` also moves the map to it. */
  function place(next: GeoPoint, options: { zoom?: number; accuracy?: number | null } = {}) {
    setValue("latitude", String(roundCoordinate(next.latitude)), { shouldDirty: true, shouldValidate: true });
    setValue("longitude", String(roundCoordinate(next.longitude)), { shouldDirty: true, shouldValidate: true });
    setAccuracy(options.accuracy ?? null);
    if (options.zoom !== undefined) setFocus({ point: next, zoom: options.zoom });
  }

  /**
   * Asks the map what is at the pin — unless the search already said — and
   * fills the province and the address from it. Quiet when the map cannot
   * say: the pin is what matters, and the fields are there to fill by hand.
   */
  async function describe(next: GeoPoint, known?: PlaceDetails) {
    if (!fills.province && !fills.address) return;
    const turn = ++asked.current;
    let details = known?.province || known?.address ? known : undefined;
    if (!details) {
      setDescribing(true);
      try {
        details = await describePlace({ latitude: roundCoordinate(next.latitude), longitude: roundCoordinate(next.longitude) }, true).unwrap();
      } catch {
        return;
      } finally {
        /* A later pin's lookup may still be running; only the latest clears the line. */
        if (turn === asked.current) setDescribing(false);
      }
    }
    if (turn !== asked.current) return;
    setFound(details);

    const values = getValues();
    let nextProvince = filled.provinceId;
    let nextAddress = filled.address;
    /* The province is where the pin is: it follows every move, whoever chose it before. */
    const province = fills.province ? provinceOf(details.province) : undefined;
    const provinceNow = typeof values.provinceId === "string" ? values.provinceId : "";
    if (province) {
      if (provinceNow !== province.value) setValue("provinceId", province.value, { shouldDirty: true, shouldValidate: true });
      nextProvince = province.value;
    }
    const addressNow = typeof values.address === "string" ? values.address.trim() : "";
    if (fills.address && details.address && (!addressNow || addressNow === filled.address) && addressNow !== details.address) {
      setValue("address", details.address, { shouldDirty: true, shouldValidate: true });
      nextAddress = details.address;
    }
    setFilled({ provinceId: nextProvince, address: nextAddress });
  }

  function pickOnMap(next: GeoPoint) {
    if (disabled) return;
    if (watch.current !== null) {
      stopWatching();
      setLocating(null);
    }
    place(next);
    setNotice(null);
    void describe(next);
  }

  /**
   * Numbers typed by hand, once a box is left or Done is pressed: the map goes
   * to them and is asked what is there, as for any other pin. Half a pair, or
   * a number off the map, waits.
   */
  function settle() {
    const lat = coordinate(getValues("latitude"), 90);
    const lng = coordinate(getValues("longitude"), 180);
    if (lat === null || lng === null) return;
    const key = `${lat},${lng}`;
    if (key === settled.current) return;
    settled.current = key;
    const next = { latitude: lat, longitude: lng };
    setAccuracy(null);
    setFocus({ point: next, zoom: 17 });
    setNotice({ tone: "success", text: t("notices.pinnedCoordinates") });
    void describe(next);
  }

  function clearPin() {
    setValue("latitude", "", { shouldDirty: true, shouldValidate: true });
    setValue("longitude", "", { shouldDirty: true, shouldValidate: true });
    setAccuracy(null);
    setNotice(null);
    setFound(null);
    asked.current += 1;
  }

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setNotice({ tone: "error", text: t("errors.noGeolocation") });
      return;
    }
    if (!window.isSecureContext) {
      setNotice({ tone: "error", text: t("errors.insecure") });
      return;
    }

    stopWatching();
    setNotice(null);
    setResults(null);
    setLocating({ accuracy: null });
    let best = Number.POSITIVE_INFINITY;
    let last: GeoPoint | null = null;
    let done = false;

    const finish = (failure?: GeolocationPositionError) => {
      if (done) return;
      done = true;
      stopWatching();
      setLocating(null);
      if (last) void describe(last);
      if (best === Number.POSITIVE_INFINITY) {
        setNotice({ tone: "error", text: t(`errors.${LOCATION_ERRORS[failure?.code ?? 3] ?? "unavailable"}`) });
      } else if (best > ROUGH_METRES) {
        setNotice({ tone: "warning", text: t("notices.rough", { distance: metres(best) }) });
      } else {
        setNotice({ tone: "success", text: t("notices.precise", { distance: metres(best) }) });
      }
    };

    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: within } = position.coords;
        if (within >= best) return;
        best = within;
        last = { latitude: lat, longitude: lng };
        place(last, { zoom: zoomFor(within), accuracy: within });
        setLocating({ accuracy: within });
        if (within <= PRECISE_METRES) finish();
      },
      /* A failure after a first fix still leaves a usable pin. */
      (failure) => finish(failure),
      { enableHighAccuracy: true, maximumAge: 0, timeout: LOCATE_MS },
    );
    deadline.current = setTimeout(() => finish(), LOCATE_MS);
  }

  function choose(result: PlaceResult) {
    place(result, { zoom: 17 });
    setResults(null);
    setQuery(result.name);
    setNotice({ tone: "success", text: t("notices.pinnedAt", { name: result.name }) });
    void describe(result, result);
  }

  /** A pasted link, followed to the point it names. */
  async function followLink(link: string) {
    let at = pointInMapLink(link);
    if (!at && isShortMapLink(link)) {
      if (following.current) return;
      following.current = true;
      setFinding(true);
      try {
        at = await resolveMapLink(link, true).unwrap();
      } catch (error) {
        const problem = toApiError(error);
        setNotice({
          tone: "error",
          text: (problem && problem.status > 0 ? problem.message : null) ?? t("errors.linkUnreadable"),
        });
        return;
      } finally {
        following.current = false;
        setFinding(false);
      }
    }
    if (!at) {
      setNotice({ tone: "error", text: t("errors.linkNoPlace") });
      return;
    }
    place(at, { zoom: 17 });
    setQuery("");
    setNotice(
      at.exact
        ? { tone: "success", text: t("notices.pinnedFromGoogle") }
        : /* The link names where the map was looking, not a pin: still a success, with a gentle word to check. */
          { tone: "success", text: t("notices.pinnedFromLink") },
    );
    void describe(at);
  }

  /**
   * The one box: a pair of coordinates is pinned, a map link is followed, and
   * anything else is a name to search for. A name is searched only when asked
   * — Enter or Find — as OpenStreetMap's policy requires.
   */
  async function find(text: string) {
    const trimmed = text.trim();
    if (!trimmed || finding) return;
    setNotice(null);

    const pair = parseCoordinatePair(trimmed);
    if (pair) {
      setResults(null);
      place(pair, { zoom: 17 });
      setQuery("");
      setNotice({ tone: "success", text: t("notices.pinnedCoordinates") });
      void describe(pair);
      return;
    }
    const link = findLink(trimmed);
    if (link) {
      setResults(null);
      await followLink(link);
      return;
    }
    if (trimmed.length < 2) return;
    setFinding(true);
    try {
      setResults(await searchPlaces(trimmed, true).unwrap());
    } catch (error) {
      const problem = toApiError(error);
      setResults(null);
      setNotice({
        tone: "error",
        text: problem && problem.status > 0 ? (problem.message ?? t("errors.searchFailed")) : t("errors.searchUnreachable"),
      });
    } finally {
      setFinding(false);
    }
  }

  /**
   * Paste link: what was copied in Google Maps, brought in with one click. A
   * browser that will not hand over the clipboard leaves the cursor in the
   * box, for the keyboard's own paste.
   */
  async function pasteLink() {
    const box = document.getElementById(findId);
    let text = "";
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      box?.focus();
      setNotice({ tone: "info", text: t("notices.pasteKeys") });
      return;
    }
    if (!text || (!parseCoordinatePair(text) && !findLink(text))) {
      box?.focus();
      setNotice({ tone: "info", text: t("notices.nothingCopied") });
      return;
    }
    setQuery(text);
    await find(text);
  }

  function onFindKey(event: KeyboardEvent<HTMLInputElement>) {
    /* Enter would otherwise submit the whole listing form. */
    if (event.key !== "Enter") return;
    event.preventDefault();
    void find(query);
  }

  const busyLocating = locating !== null;
  /* The province the map names for the pin, and whether the form says another. */
  const mapProvince = fills.province ? provinceOf(found?.province) : undefined;
  const provinceNow = typeof provinceId === "string" ? provinceId : "";
  const disagrees = Boolean(point && mapProvince && provinceNow && provinceNow !== mapProvince.value);
  const chosenProvince = provinces.find((option) => option.value === provinceNow)?.label;
  const filledProvince = Boolean(filled.provinceId && filled.provinceId === provinceNow);
  const filledAddress = Boolean(filled.address && typeof address === "string" && address.trim() === filled.address);
  const coordinateError = (errors.latitude?.message ?? errors.longitude?.message) as string | undefined;
  /* The map's own line for the pin, offered when the box holds a different one that a person wrote. */
  const addressNow = typeof address === "string" ? address.trim() : "";
  const offered = fills.address && point && found?.address && addressNow && addressNow !== found.address ? found.address : null;
  const latitudeBox = register("latitude");
  const longitudeBox = register("longitude");
  /* One line under the map: how the pin got there, what is being looked up, and what was filled in. */
  const which = (province: boolean, address: boolean) => (province && address ? "both" : province ? "province" : address ? "address" : null);
  const filledWhat = which(filledProvince, filledAddress);
  const lookingFor = which(fills.province, fills.address) ?? "address";
  /* Not on a red line: what went wrong is the whole message. */
  const filledText = !describing && point && filledWhat && notice?.tone !== "error" ? t("notices.filled", { what: filledWhat }) : null;
  /* Something filled in is a success in its own right, so a pin clicked onto the map gets a green line too. */
  const statusTone: Tone = notice?.tone ?? (filledText ? "success" : "info");
  const showStatus = Boolean(notice || describing || filledText);

  return (
    <div
      aria-label={expanded ? t("fullWindow") : undefined}
      aria-modal={expanded || undefined}
      className={cn("flex flex-col gap-3 md:col-span-2", expanded && "fixed inset-0 z-[100] overflow-y-auto bg-paper p-3 sm:p-4")}
      role={expanded ? "dialog" : undefined}
    >
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={t("find")}
              className={cn("pl-8", finding && "text-muted")}
              disabled={disabled}
              id={findId}
              readOnly={finding}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onFindKey}
              onPaste={(event) => {
                /* A pasted link or pair of coordinates is acted on at once; a pasted name waits for Enter. */
                const text = event.clipboardData.getData("text").trim();
                if (!text || (!parseCoordinatePair(text) && !findLink(text))) return;
                event.preventDefault();
                setQuery(text);
                void find(text);
              }}
              placeholder={t("findPlaceholder")}
              spellCheck={false}
              value={query}
            />
          </div>
          <Button disabled={disabled || finding} onClick={() => void pasteLink()} type="button" variant="secondary">
            <ClipboardPaste aria-hidden className="size-4" />
            {t("pasteLink")}
          </Button>
          <Button disabled={disabled || finding || query.trim().length < 2} onClick={() => void find(query)} type="button">
            {finding ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
            {t("findButton")}
          </Button>
          {expanded ? (
            <Button className="ml-auto" onClick={() => setExpanded(false)} type="button" variant="secondary">
              {actions("done")}
            </Button>
          ) : null}
        </div>
        {finding ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-teal" data-map-finding role="status">
            <LoaderCircle aria-hidden className="size-3.5 shrink-0 animate-spin" />
            {t("finding")}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">{t("howToCopy")}</p>
        )}

        {results ? (
          <div className="glass absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-muted">
              <span>{results.length ? t("results", { count: results.length }) : t("noResults")}</span>
              <button aria-label={t("closeResults")} className="rounded-sm p-0.5 hover:bg-sand-deep hover:text-ink" onClick={() => setResults(null)} type="button">
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
              <p className="px-3 py-3 text-sm text-muted">{t("noMatch", { query: query.trim() })}</p>
            )}
          </div>
        ) : null}
      </div>

      <div className={cn("isolate overflow-hidden rounded-lg border border-line bg-sand", expanded && "flex min-h-0 flex-1 flex-col")}>
        <div className={cn("relative", expanded ? "min-h-64 flex-1" : "h-64 md:h-72")}>
          <PinMap accuracy={accuracy} focus={focus} layer={layer} onPick={pickOnMap} point={point} readOnly={disabled} />

          <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-2">
            {/* The map over the whole window, for finding a spot in comfort; Escape or Done brings the form back. */}
            <button
              aria-expanded={expanded}
              className="flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-paper px-2.5 text-xs font-medium text-ink-soft shadow-xs transition-colors hover:bg-sand hover:text-ink"
              onClick={() => setExpanded((open) => !open)}
              title={expanded ? t("backToForm") : t("overWindow")}
              type="button"
            >
              {expanded ? <Minimize2 aria-hidden className="size-3.5" /> : <Maximize2 aria-hidden className="size-3.5" />}
              {expanded ? t("exitFullScreen") : t("fullScreen")}
            </button>
            <div className="flex rounded-md border border-line-strong bg-paper p-0.5 shadow-xs" role="group" aria-label={t("style")}>
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
                  {t(`layers.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {/* For someone standing at the place with a phone: the device's own position. Beside the map, not above it — it is the rare way. */}
          {disabled ? null : (
            <button
              aria-label={busyLocating ? t("stopLocating") : t("useLocation")}
              className="absolute right-2.5 bottom-2.5 z-[1000] grid size-9 place-items-center rounded-md border border-line-strong bg-paper text-ink-soft shadow-xs transition-colors hover:bg-sand hover:text-ink"
              onClick={() => {
                if (busyLocating) {
                  stopWatching();
                  setLocating(null);
                  setNotice(point ? { tone: "info", text: t("notices.stopped") } : null);
                } else {
                  locate();
                }
              }}
              title={busyLocating ? t("stop") : t("useLocationTitle")}
              type="button"
            >
              {busyLocating ? <LoaderCircle aria-hidden className="size-4 animate-spin text-teal" /> : <LocateFixed aria-hidden className="size-4" />}
            </button>
          )}

          {busyLocating ? (
            <div className="absolute inset-x-0 bottom-0 z-[999] flex items-center gap-2 border-t border-line bg-paper/95 px-3 py-2 pr-14 text-xs text-ink-soft">
              <LoaderCircle aria-hidden className="size-3.5 animate-spin text-teal" />
              {locating.accuracy === null ? t("locating") : t("improving", { distance: metres(locating.accuracy) })}
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
                {disabled ? null : (
                  <button
                    aria-expanded={editing}
                    className="font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                    onClick={() => setEditing((open) => !open)}
                    type="button"
                  >
                    {editing ? actions("done") : actions("edit")}
                  </button>
                )}
              </span>
              <span className="flex items-center gap-3">
                <a
                  className="inline-flex items-center gap-1 font-medium text-teal-deep hover:underline"
                  href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("checkGoogle")}
                  <ExternalLink aria-hidden className="size-3" />
                </a>
                {disabled ? null : (
                  <button className="font-medium text-ink-soft hover:text-heritage" onClick={clearPin} type="button">
                    {t("removePin")}
                  </button>
                )}
              </span>
            </>
          ) : (
            <>
              <span>{t("noPin")}</span>
              {disabled ? null : (
                <button
                  aria-expanded={editing}
                  className="font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                  onClick={() => setEditing((open) => !open)}
                  type="button"
                >
                  {editing ? actions("done") : t("enterCoordinates")}
                </button>
              )}
            </>
          )}
        </div>

        {/* The numbers themselves, for the rare time they need adjusting by hand: open on Edit, and whenever one is wrong. */}
        {(editing || coordinateError) && !disabled ? (
          <div className="grid gap-3 border-t border-line bg-paper px-3 py-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-soft">{t("latitude")}</span>
              <Input
                {...latitudeBox}
                aria-invalid={errors.latitude ? true : undefined}
                onBlur={(event) => {
                  void latitudeBox.onBlur(event);
                  settle();
                }}
                className="font-mono tabular-nums"
                inputMode="decimal"
                placeholder="13.412469"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-soft">{t("longitude")}</span>
              <Input
                {...longitudeBox}
                aria-invalid={errors.longitude ? true : undefined}
                onBlur={(event) => {
                  void longitudeBox.onBlur(event);
                  settle();
                }}
                className="font-mono tabular-nums"
                inputMode="decimal"
                placeholder="103.866986"
              />
            </label>
          </div>
        ) : null}
      </div>

      {showStatus ? (
        <p
          className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-xs", TONES[statusTone])}
          data-map-status
          role={statusTone === "error" ? "alert" : "status"}
        >
          {/* Each sentence with its own mark, so a line that wraps still reads as two things done. */}
          {notice?.text ? (
            <span className="inline-flex items-start gap-1.5">
              {statusTone === "success" ? <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
              <span>{notice.text}</span>
            </span>
          ) : null}
          {describing ? (
            <span className="inline-flex items-center gap-1.5">
              <LoaderCircle aria-hidden className="size-3.5 shrink-0 animate-spin" />
              {t("notices.lookingUp", { what: lookingFor })}
            </span>
          ) : filledText ? (
            <span className="inline-flex items-start gap-1.5">
              <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>{filledText}</span>
            </span>
          ) : null}
        </p>
      ) : null}

      {/* A province chosen by hand that the pin disagrees with: pointed out, never changed. */}
      {disagrees && mapProvince ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-gold/30 bg-gold-soft px-3 py-2 text-xs text-gold-deep" role="status">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          <span>{t("disagrees", { map: mapProvince.label, chosen: chosenProvince ?? t("another") })}</span>
          {disabled ? null : (
            <button
              className="font-medium underline underline-offset-2 hover:text-ink"
              onClick={() => {
                setValue("provinceId", mapProvince.value, { shouldDirty: true, shouldValidate: true });
                setFilled((current) => ({ ...current, provinceId: mapProvince.value }));
              }}
              type="button"
            >
              {t("use", { name: mapProvince.label })}
            </button>
          )}
        </p>
      ) : null}

      {offered && !disabled ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line bg-sand px-3 py-2 text-xs text-ink-soft" role="status">
          <MapPin aria-hidden className="size-3.5 shrink-0 text-muted" />
          <span>{t("offered", { address: offered })}</span>
          <button
            className="font-medium text-teal-deep underline underline-offset-2 hover:text-ink"
            onClick={() => {
              setValue("address", offered, { shouldDirty: true, shouldValidate: true });
              setFilled((current) => ({ ...current, address: offered }));
            }}
            type="button"
          >
            {t("useAddress")}
          </button>
        </p>
      ) : null}

      {coordinateError ? (
        <p className="flex items-center gap-1 text-xs font-medium text-heritage" role="alert">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {coordinateError}
        </p>
      ) : null}
    </div>
  );
}
