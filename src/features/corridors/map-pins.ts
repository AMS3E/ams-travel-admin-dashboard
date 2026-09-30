import type { MapStop } from "@/features/corridors/api/contracts";
import { TRANSPORT_LABELS, formatDistance, formatMinutes, shortTime } from "@/features/corridors/format";

/** A stop's point, when its destination is pinned. */
export function pointOf(stop: MapStop): { readonly lat: number; readonly lng: number } | null {
  return stop.latitude == null || stop.longitude == null ? null : { lat: stop.latitude, lng: stop.longitude };
}

/** Stops in view grouped by place: a day that ends where the next begins is one marker with both numbers. */
export function groupByPlace(stops: readonly MapStop[]): MapStop[][] {
  const places = new Map<string, MapStop[]>();
  for (const stop of stops) {
    const at = pointOf(stop);
    if (!at) continue;
    const key = `${at.lat.toFixed(5)},${at.lng.toFixed(5)}`;
    places.set(key, [...(places.get(key) ?? []), stop]);
  }
  return [...places.values()];
}

/** A numbered pin; its `data-selected` is switched when the stop is chosen. */
export function pinElement(numbers: readonly number[], extraClass = ""): HTMLElement {
  const pin = document.createElement("div");
  pin.className = `grid h-7 min-w-7 place-items-center rounded-full border-2 border-white bg-primary px-1.5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-md transition-transform data-[selected=true]:scale-125 data-[selected=true]:bg-inverse data-[selected=true]:text-inverse-foreground ${extraClass}`;
  pin.dataset.selected = "false";
  pin.textContent = numbers.join(", ");
  return pin;
}

/** What a marker opens on: the place's photo, name, summary, times and the way there. Built from nodes, not HTML: names and notes are text. */
export function infoContent(stop: MapStop): HTMLElement {
  const root = document.createElement("div");
  root.className = "w-60 font-sans text-ink";
  if (stop.coverUrl) {
    const image = document.createElement("img");
    image.src = stop.coverUrl;
    image.alt = "";
    image.className = "mb-2 h-24 w-full rounded-md object-cover";
    root.append(image);
  }
  const title = document.createElement("div");
  title.className = "m-0 text-sm font-semibold";
  title.textContent = `${stop.sequence}. ${stop.name}`;
  root.append(title);
  const subtitle = document.createElement("div");
  subtitle.className = "m-0 text-xs text-muted";
  subtitle.textContent = [`Day ${stop.dayNumber}`, stop.subtitle].filter(Boolean).join(" · ");
  root.append(subtitle);
  if (stop.summary) {
    const summary = document.createElement("div");
    summary.className = "m-0 mt-1.5 line-clamp-3 text-xs text-ink-soft";
    summary.textContent = stop.summary;
    root.append(summary);
  }
  const facts: string[] = [];
  const arrive = shortTime(stop.arrivalTime);
  const leave = shortTime(stop.departureTime);
  if (arrive || leave) facts.push([arrive && `Arrive ${arrive}`, leave && `leave ${leave}`].filter(Boolean).join(", "));
  if (stop.recommendedDurationMinutes != null) facts.push(`Stay ${formatMinutes(stop.recommendedDurationMinutes)}`);
  if (stop.transportType && (stop.distanceKm != null || stop.travelMinutes != null)) {
    facts.push(`${formatDistance(stop.distanceKm)} · ${formatMinutes(stop.travelMinutes)} by ${TRANSPORT_LABELS[stop.transportType].toLowerCase()}`);
  } else if (stop.transportType) {
    facts.push(`By ${TRANSPORT_LABELS[stop.transportType].toLowerCase()}`);
  }
  if (facts.length) {
    const list = document.createElement("ul");
    list.className = "m-0 mt-1.5 list-none space-y-0.5 p-0 text-xs text-ink-soft";
    for (const fact of facts) {
      const item = document.createElement("li");
      item.textContent = fact;
      list.append(item);
    }
    root.append(list);
  }
  if (stop.href) {
    const link = document.createElement("a");
    link.href = stop.href;
    link.className = "map-link mt-2 inline-block text-xs font-medium text-teal-deep hover:underline";
    link.textContent = "Open destination";
    root.append(link);
  }
  return root;
}
