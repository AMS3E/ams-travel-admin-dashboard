"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useTranslations } from "next-intl";
import { useZoomTitles } from "@/lib/use-zoom-titles";
import { useEffect, useEffectEvent, useRef } from "react";
import { CAMBODIA_BOUNDS } from "@/features/catalog/geo";
import type { MapStop } from "@/features/corridors/api/contracts";
import type { CorridorsT } from "@/features/corridors/format";
import { groupByPlace, infoContent, pinElement, pointOf } from "@/features/corridors/map-pins";
import { decodePolyline, type LatLngPair } from "@/features/corridors/route-geometry";

const ROUTE_COLOR = "#0b6bf2";

export interface StreetCorridorMapProps {
  readonly stops: readonly MapStop[];
  readonly day: number | null;
  readonly selectedKey: string | null;
  readonly onSelect?: (key: string) => void;
}

/**
 * The corridor on OpenStreetMap, for when no Google key is set: the same
 * numbered markers, day filter and stop details as the Google map. A leg
 * whose road is known follows it; any other is a dashed straight line until
 * it is. Leaflet touches `window` as it loads, so this is only ever rendered
 * in the browser.
 */
export default function StreetCorridorMap({ stops, day, selectedKey, onSelect }: StreetCorridorMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const popup = useRef<L.Popup | null>(null);
  const byKey = useRef(new Map<string, { readonly marker: L.Marker; readonly pin: HTMLElement }>());
  /* The places the view was last fitted to: typing a time redraws the markers, but leaves the view where it is. */
  const fitted = useRef<string | null>(null);
  /* The stop the map last went to: it goes again only when another is chosen. */
  const visited = useRef<string | null>(null);
  const selectedKeyRef = useRef(selectedKey);
  const t = useTranslations("corridors");
  const select = useEffectEvent((key: string) => onSelect?.(key));
  /* A stop's card in the words of the moment, without redrawing the markers when they change. */
  const showStop = useEffectEvent((stop: MapStop) => openStop(map.current, popup.current, stop, t));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    // Nothing written on the map: OpenStreetMap is credited under it.
    const created = L.map(element, { scrollWheelZoom: false, zoomSnap: 0.5, worldCopyJump: true, attributionControl: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { className: "map-tiles", maxZoom: 19 }).addTo(created);
    created.fitBounds([[...CAMBODIA_BOUNDS[0]], [...CAMBODIA_BOUNDS[1]]]);
    /* A page scrolls past the map; the wheel zooms only once someone is working in it. */
    created.on("focus click", () => created.scrollWheelZoom.enable());
    created.on("blur mouseout", () => created.scrollWheelZoom.disable());
    layer.current = L.layerGroup().addTo(created);
    popup.current = L.popup({ maxWidth: 280, minWidth: 240, offset: [0, -10] });
    map.current = created;

    const resize = new ResizeObserver(() => created.invalidateSize());
    resize.observe(element);
    return () => {
      resize.disconnect();
      created.remove();
      map.current = null;
      layer.current = null;
      popup.current = null;
      fitted.current = null;
    };
  }, []);

  /* Markers and lines for what is shown: redrawn when the stops or the day change. */
  useEffect(() => {
    const current = map.current;
    const group = layer.current;
    if (!current || !group) return;
    group.clearLayers();
    byKey.current.clear();

    const visible = stops.filter((stop) => day == null || stop.dayNumber === day);
    const bounds = L.latLngBounds([]);

    for (let index = 1; index < stops.length; index++) {
      const from = stops[index - 1];
      const to = stops[index];
      // A single day shows the roads between its own stops, not the way in from the day before.
      if (day != null && (from.dayNumber !== day || to.dayNumber !== day)) continue;
      const start = pointOf(from);
      const end = pointOf(to);
      if (!start || !end) continue;
      const path: LatLngPair[] = to.routePolyline ? decodePolyline(to.routePolyline) : [[start.lat, start.lng], [end.lat, end.lng]];
      // A road line is solid; a dashed straight line is a leg whose road is not known yet.
      const solid = Boolean(to.routePolyline);
      L.polyline(path, {
        color: ROUTE_COLOR,
        weight: 4,
        opacity: solid ? 0.85 : 0.9,
        dashArray: solid ? undefined : "6 8",
        interactive: false,
      }).addTo(group);
      for (const point of path) bounds.extend(point);
    }

    const groups = groupByPlace(visible);
    for (const place of groups) {
      const at = pointOf(place[0])!;
      const pin = pinElement(
        place.map((stop) => stop.sequence),
        "absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-pointer",
      );
      const marker = L.marker(at, {
        icon: L.divIcon({ className: "", html: pin, iconSize: [0, 0], iconAnchor: [0, 0] }),
        title: place.map((stop) => `${stop.sequence}. ${stop.name}`).join("\n"),
        riseOnHover: true,
      }).addTo(group);
      marker.on("click", () => {
        const chosen = place.find((stop) => stop.key === selectedKeyRef.current) ?? place[0];
        showStop(chosen);
        select(chosen.key);
      });
      for (const stop of place) byKey.current.set(stop.key, { marker, pin });
      bounds.extend(at);
    }

    const shape = `${day ?? "all"}|${visible.map((stop) => `${stop.latitude},${stop.longitude}`).join(";")}`;
    if (shape !== fitted.current) {
      fitted.current = shape;
      if (groups.length === 1) current.setView(pointOf(groups[0][0])!, 12);
      else if (bounds.isValid()) current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    }
    return () => {
      current.closePopup();
    };
  }, [stops, day]);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  /* The selected stop's pin stands out, and the map comes to it. */
  useEffect(() => {
    const current = map.current;
    if (!current) return;
    for (const { pin, marker } of byKey.current.values()) {
      pin.dataset.selected = "false";
      marker.setZIndexOffset(0);
    }
    if (!selectedKey) {
      visited.current = null;
      return;
    }
    const entry = byKey.current.get(selectedKey);
    const stop = stops.find((candidate) => candidate.key === selectedKey);
    if (!entry || !stop) return;
    entry.pin.dataset.selected = "true";
    entry.marker.setZIndexOffset(1000);
    if (visited.current === selectedKey) return;
    visited.current = selectedKey;
    current.setView(entry.marker.getLatLng(), Math.max(current.getZoom(), 11));
    showStop(stop);
    // Runs after the drawing effect, whose markers it reads.
  }, [selectedKey, stops, day]);

  useZoomTitles(container);

  return <div aria-label={t("map.label")} className="size-full" ref={container} role="region" />;
}

function openStop(map: L.Map | null, popup: L.Popup | null, stop: MapStop, t: CorridorsT) {
  const at = pointOf(stop);
  if (!map || !popup || !at) return;
  popup.setLatLng(at).setContent(infoContent(stop, t)).openOn(map);
}
