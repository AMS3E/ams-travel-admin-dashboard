"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useEffectEvent, useRef } from "react";
import { CAMBODIA_BOUNDS, type GeoPoint } from "@/features/catalog/geo";

export type MapLayer = "map" | "satellite";

/**
 * A request to move the view to a pin placed from outside the map — a search,
 * the device's position. A new object each time, so asking for the same place
 * twice still moves the map back to it.
 */
export interface MapFocus {
  readonly point: GeoPoint;
  readonly zoom: number;
}

interface PinMapProps {
  readonly point: GeoPoint | null;
  /** Metres either side of the point the device is sure of; drawn as a circle. */
  readonly accuracy: number | null;
  readonly focus: MapFocus | null;
  readonly layer: MapLayer;
  readonly readOnly: boolean;
  readonly onPick: (point: GeoPoint) => void;
}

/** Tiles are drawn to 256 px; past zoom 18 imagery over Cambodia is only enlarged. */
const LAYERS: Readonly<Record<MapLayer, readonly L.TileLayer[]>> = {
  map: [
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      className: "map-tiles",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
  ],
  satellite: [
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      maxNativeZoom: 18,
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    }),
    /* Road and place names over the photograph, so a spot can be found by name. */
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, maxNativeZoom: 18 },
    ),
  ],
};

const PIN = L.divIcon({
  className: "",
  iconSize: [30, 40],
  iconAnchor: [15, 38],
  /* The ring behind the tip pulses while the icon carries the `landed` class (see globals.css). */
  html: `<span class="pin-pulse" aria-hidden="true"></span><svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true" style="display:block;position:relative;filter:drop-shadow(0 2px 2px rgb(16 24 40 / 0.3))">
    <path d="M15 1C7.3 1 1 7.1 1 14.7 1 25 15 39 15 39s14-14 14-24.3C29 7.1 22.7 1 15 1Z" fill="#0b6bf2" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="14.5" r="5" fill="#ffffff"/>
  </svg>`,
});

function latLng(point: GeoPoint): L.LatLngTuple {
  return [point.latitude, point.longitude];
}

/**
 * The listing's pin on an OpenStreetMap or satellite map. Clicking the map
 * moves the pin there, and the pin can be dragged; both report the new point
 * through `onPick`. Leaflet touches `window` as it loads, so this is only ever
 * rendered in the browser.
 */
export default function PinMap({ point, accuracy, focus, layer, readOnly, onPick }: PinMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  /* The last point chosen on the map itself: the view is already where the person is looking. */
  const picked = useRef<GeoPoint | null>(null);
  const pick = useEffectEvent((next: GeoPoint) => {
    picked.current = next;
    onPick(next);
  });
  const initial = useRef(point);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const created = L.map(element, {
      /* A form scrolls past the map; the wheel zooms only once someone is working in it. */
      scrollWheelZoom: false,
      zoomSnap: 0.5,
      worldCopyJump: true,
    });
    created.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="noreferrer" target="_blank">Leaflet</a>');
    const start = initial.current;
    if (start) created.setView(latLng(start), 16);
    else created.fitBounds([[...CAMBODIA_BOUNDS[0]], [...CAMBODIA_BOUNDS[1]]]);

    created.on("focus click", () => created.scrollWheelZoom.enable());
    created.on("blur mouseout", () => created.scrollWheelZoom.disable());
    map.current = created;

    /* The map is laid out inside a form step; keep its tiles in step with its size. */
    const resize = new ResizeObserver(() => created.invalidateSize());
    resize.observe(element);
    return () => {
      resize.disconnect();
      created.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
  }, []);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    const layers = LAYERS[layer];
    layers.forEach((tiles) => tiles.addTo(current));
    return () => layers.forEach((tiles) => tiles.remove());
  }, [layer]);

  useEffect(() => {
    const current = map.current;
    if (!current || readOnly) return;
    const onClick = (event: L.LeafletMouseEvent) =>
      pick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    current.on("click", onClick);
    current.getContainer().style.cursor = "crosshair";
    return () => {
      current.off("click", onClick);
      current.getContainer().style.cursor = "";
    };
  }, [readOnly]);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    if (!point) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const created = L.marker(latLng(point), {
        icon: PIN,
        draggable: !readOnly,
        autoPan: true,
        keyboard: false,
        title: "Listing location",
      });
      created.on("dragend", () => {
        const at = created.getLatLng();
        pick({ latitude: at.lat, longitude: at.lng });
      });
      marker.current = created.addTo(current);
    } else {
      marker.current.setLatLng(latLng(point));
    }
    /* A pin typed or pasted somewhere off screen is brought into view. */
    const fromMap =
      picked.current !== null &&
      Math.abs(picked.current.latitude - point.latitude) < 1e-6 &&
      Math.abs(picked.current.longitude - point.longitude) < 1e-6;
    if (!fromMap && !current.getBounds().contains(latLng(point))) {
      current.setView(latLng(point), Math.max(current.getZoom(), 15));
    }
  }, [point, readOnly]);

  useEffect(() => {
    if (!marker.current) return;
    if (readOnly) marker.current.dragging?.disable();
    else marker.current.dragging?.enable();
  }, [readOnly]);

  useEffect(() => {
    const current = map.current;
    circle.current?.remove();
    circle.current = null;
    if (!current || !point || !accuracy) return;
    circle.current = L.circle(latLng(point), {
      radius: accuracy,
      color: "#0b6bf2",
      weight: 1,
      fillColor: "#0b6bf2",
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(current);
  }, [point, accuracy]);

  useEffect(() => {
    if (!focus) return;
    map.current?.setView(latLng(focus.point), focus.zoom);
    /* A pin put down from outside the map — a link, a search, the device — pulses once, so the eye finds where it landed. */
    const element = marker.current?.getElement();
    if (!element) return;
    element.classList.add("landed");
    const timer = setTimeout(() => element.classList.remove("landed"), 2400);
    return () => {
      clearTimeout(timer);
      element.classList.remove("landed");
    };
  }, [focus]);

  return <div aria-label="Map: click to place the pin, or drag the pin" className="size-full" ref={container} role="application" />;
}
