"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { MapStop } from "@/features/corridors/api/contracts";
import type { CorridorsT } from "@/features/corridors/format";
import { loadGoogleMaps, mapIdOrDemo, mapsKeyRefused, onMapsKeyRefused } from "@/features/corridors/google-maps";
import { groupByPlace, infoContent, pinElement, pointOf } from "@/features/corridors/map-pins";
import { cn } from "@/lib/utils";

function MapLoading() {
  const t = useTranslations("corridors.map");
  return (
    <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {t("loading")}
    </p>
  );
}

const StreetCorridorMap = dynamic(() => import("./street-corridor-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

const CAMBODIA = { lat: 12.56, lng: 104.99 };
const ROUTE_COLOR = "#0b6bf2";

interface CorridorMapProps {
  /** The browser key for Google Maps; without one the corridor is drawn on OpenStreetMap. */
  readonly apiKey: string | null;
  readonly mapId: string | null;
  /** Every stop of the corridor in travel order; `day` narrows what is drawn. */
  readonly stops: readonly MapStop[];
  /** Only this day's stops and the roads between them; null for all days. */
  readonly day: number | null;
  readonly selectedKey: string | null;
  readonly onSelect?: (key: string) => void;
  readonly className?: string;
}

/**
 * A corridor on a map: a numbered marker for each stop, in travel order, and
 * the real road between them. A leg whose road is not known yet — a stop just
 * added, or one with no pin — is a dashed straight line until it is. Clicking a
 * marker selects its stop; selecting a stop elsewhere brings the map to it.
 * Google Maps draws it when the dashboard has a browser key; OpenStreetMap
 * does otherwise, with its credit under the map rather than on it.
 */
export function CorridorMap({ apiKey, ...props }: CorridorMapProps) {
  const t = useTranslations("corridors.map");
  if (!apiKey) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className={cn("relative isolate overflow-hidden rounded-lg border border-line bg-sand", props.className)}>
          <StreetCorridorMap day={props.day} onSelect={props.onSelect} selectedKey={props.selectedKey} stops={props.stops} />
        </div>
        <p className="text-right text-2xs text-muted">
          {t.rich("credit", {
            link: (chunks) => (
              <a className="hover:text-ink hover:underline" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    );
  }
  return <GoogleCorridorMap apiKey={apiKey} {...props} />;
}

type LoadState = "loading" | "ready" | "failed" | "refused";

interface Libraries {
  readonly Polyline: typeof google.maps.Polyline;
  readonly InfoWindow: typeof google.maps.InfoWindow;
  readonly LatLngBounds: typeof google.maps.LatLngBounds;
  readonly AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  readonly encoding: typeof google.maps.geometry.encoding;
}

interface Drawn {
  readonly markers: readonly google.maps.marker.AdvancedMarkerElement[];
  readonly lines: readonly google.maps.Polyline[];
  /** Each stop's marker, and the pin inside it; stops at one place share both. */
  readonly byKey: ReadonlyMap<string, { readonly marker: google.maps.marker.AdvancedMarkerElement; readonly pin: HTMLElement }>;
}

function GoogleCorridorMap({ apiKey, mapId, stops, day, selectedKey, onSelect, className }: CorridorMapProps & { readonly apiKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const libraries = useRef<Libraries | null>(null);
  const info = useRef<google.maps.InfoWindow | null>(null);
  const drawn = useRef<Drawn | null>(null);
  /* The places the view was last fitted to: typing a time redraws the markers, but leaves the view where it is. */
  const fitted = useRef<string | null>(null);
  /* The stop the map last went to: it goes again only when another is chosen. */
  const visited = useRef<string | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const t = useTranslations("corridors");
  const select = useEffectEvent((key: string) => onSelect?.(key));
  /* A marker's card in the words of the moment, without redrawing the markers when they change. */
  const showInfo = useEffectEvent((current: google.maps.Map, stop: MapStop, marker: google.maps.marker.AdvancedMarkerElement) =>
    openInfo(info.current, current, stop, marker, t),
  );
  /* Read when a marker is clicked: which of the stops at that place is chosen. */
  const selectedKeyRef = useRef(selectedKey);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onMapsKeyRefused(() => setState("refused"));
    loadGoogleMaps(apiKey)
      .then(async () => {
        const [maps, marker, geometry, core] = await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
          google.maps.importLibrary("geometry") as Promise<google.maps.GeometryLibrary>,
          google.maps.importLibrary("core") as Promise<google.maps.CoreLibrary>,
        ]);
        if (cancelled || !container.current) return;
        map.current = new maps.Map(container.current, {
          center: CAMBODIA,
          zoom: 7,
          mapId: mapIdOrDemo(mapId),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        info.current = new maps.InfoWindow({ maxWidth: 280 });
        libraries.current = {
          Polyline: maps.Polyline,
          InfoWindow: maps.InfoWindow,
          LatLngBounds: core.LatLngBounds,
          AdvancedMarkerElement: marker.AdvancedMarkerElement,
          encoding: geometry.encoding,
        };
        setState(mapsKeyRefused() ? "refused" : "ready");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [apiKey, mapId]);

  /* Markers and lines for what is shown: redrawn when the stops or the day change. */
  useEffect(() => {
    const current = map.current;
    const lib = libraries.current;
    if (state !== "ready" || !current || !lib) return;

    const visible = stops.filter((stop) => day == null || stop.dayNumber === day);
    const bounds = new lib.LatLngBounds();
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const byKey = new Map<string, { marker: google.maps.marker.AdvancedMarkerElement; pin: HTMLElement }>();

    for (const group of groupByPlace(visible)) {
      const at = pointOf(group[0])!;
      const pin = pinElement(group.map((stop) => stop.sequence));
      const marker = new lib.AdvancedMarkerElement({
        map: current,
        position: at,
        content: pin,
        title: group.map((stop) => `${stop.sequence}. ${stop.name}`).join("\n"),
        gmpClickable: true,
      });
      marker.addListener("click", () => {
        const chosen = group.find((stop) => stop.key === selectedKeyRef.current) ?? group[0];
        showInfo(current, chosen, marker);
        select(chosen.key);
      });
      for (const stop of group) byKey.set(stop.key, { marker, pin });
      markers.push(marker);
      bounds.extend(at);
    }

    const lines: google.maps.Polyline[] = [];
    for (let index = 1; index < stops.length; index++) {
      const from = stops[index - 1];
      const to = stops[index];
      // A single day shows the roads between its own stops, not the way in from the day before.
      if (day != null && (from.dayNumber !== day || to.dayNumber !== day)) continue;
      const start = pointOf(from);
      const end = pointOf(to);
      if (!start || !end) continue;
      const path = to.routePolyline ? lib.encoding.decodePath(to.routePolyline) : [start, end];
      const solid = Boolean(to.routePolyline);
      lines.push(
        new lib.Polyline({
          map: current,
          path,
          clickable: false,
          strokeColor: ROUTE_COLOR,
          strokeOpacity: solid ? 0.85 : 0,
          strokeWeight: 4,
          icons: solid
            ? []
            : [{ icon: { path: "M 0,-1 0,1", strokeColor: ROUTE_COLOR, strokeOpacity: 0.9, scale: 3 }, offset: "0", repeat: "14px" }],
        }),
      );
      for (const point of path) bounds.extend(point);
    }

    const shape = `${day ?? "all"}|${visible.map((stop) => `${stop.latitude},${stop.longitude}`).join(";")}`;
    if (shape !== fitted.current) {
      fitted.current = shape;
      if (markers.length === 1) {
        current.setCenter(markers[0].position as google.maps.LatLngLiteral);
        current.setZoom(12);
      } else if (!bounds.isEmpty()) {
        current.fitBounds(bounds, 56);
      }
    }
    drawn.current = { markers, lines, byKey };

    return () => {
      info.current?.close();
      markers.forEach((marker) => {
        marker.map = null;
      });
      lines.forEach((line) => line.setMap(null));
      drawn.current = null;
    };
  }, [state, stops, day]);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  /* The selected stop's pin stands out, and the map comes to it. */
  useEffect(() => {
    const current = map.current;
    const shown = drawn.current;
    if (state !== "ready" || !current || !shown) return;
    for (const { pin } of shown.byKey.values()) pin.dataset.selected = "false";
    if (!selectedKey) {
      visited.current = null;
      return;
    }
    const entry = shown.byKey.get(selectedKey);
    const stop = stops.find((candidate) => candidate.key === selectedKey);
    if (!entry || !stop) return;
    entry.pin.dataset.selected = "true";
    if (visited.current === selectedKey) return;
    visited.current = selectedKey;
    current.panTo(entry.marker.position as google.maps.LatLngLiteral);
    if ((current.getZoom() ?? 0) < 11) current.setZoom(12);
    showInfo(current, stop, entry.marker);
    // Runs after the drawing effect, whose markers it reads.
  }, [selectedKey, state, stops, day]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-sand", className)}>
      <div aria-label={t("map.label")} className="size-full" ref={container} role="region" />
      {state === "loading" ? (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted">{t("map.loading")}</p>
      ) : null}
      {state === "failed" || state === "refused" ? (
        <MapNotice className="absolute inset-0 rounded-none border-0" title={state === "refused" ? t("map.refusedTitle") : t("map.failedTitle")}>
          {state === "refused" ? t("map.refused") : t("map.failed")}
        </MapNotice>
      ) : null}
    </div>
  );
}

function MapNotice({ title, children, className }: { readonly title: string; readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-line bg-sand px-6 py-10 text-center", className)}>
      <span className="grid size-9 place-items-center rounded-lg border border-line bg-paper text-muted">
        <TriangleAlert aria-hidden className="size-4" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-xs text-muted">{children}</p>
    </div>
  );
}

function openInfo(
  window: google.maps.InfoWindow | null,
  map: google.maps.Map,
  stop: MapStop,
  marker: google.maps.marker.AdvancedMarkerElement,
  t: CorridorsT,
) {
  if (!window) return;
  window.setContent(infoContent(stop, t));
  window.open({ map, anchor: marker });
}
