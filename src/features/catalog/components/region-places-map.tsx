"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { CAMBODIA_BOUNDS } from "@/features/catalog/geo";
import { pinElement } from "@/features/corridors/map-pins";

export interface MapPlace {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  /** Where the pin's name leads. */
  readonly href: string;
}

/**
 * A region's destinations on OpenStreetMap: a numbered pin for each, in the
 * order the list under the map uses, its name in a popup. Leaflet touches
 * `window` as it loads, so this is only ever rendered in the browser.
 */
export default function RegionPlacesMap({ places }: { readonly places: readonly MapPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

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
    map.current = created;
    const resize = new ResizeObserver(() => created.invalidateSize());
    resize.observe(element);
    return () => {
      resize.disconnect();
      created.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const current = map.current;
    const group = layer.current;
    if (!current || !group) return;
    group.clearLayers();
    const bounds = L.latLngBounds([]);
    places.forEach((place, index) => {
      const icon = L.divIcon({ html: pinElement([index + 1]), className: "", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -12] });
      /* Built from nodes, not HTML: a name is text. */
      const link = document.createElement("a");
      link.href = place.href;
      link.textContent = place.name;
      link.className = "font-medium underline";
      L.marker([place.lat, place.lng], { icon, title: place.name }).bindPopup(link, { maxWidth: 240 }).addTo(group);
      bounds.extend([place.lat, place.lng]);
    });
    if (bounds.isValid()) current.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
  }, [places]);

  return <div className="h-80 w-full" data-field="region-map" ref={container} />;
}
