"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ArrowDown, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import type { CorridorItinerary, ItineraryStop, MapStop } from "@/features/corridors/api/contracts";
import { CorridorMap } from "@/features/corridors/components/corridor-map";
import { DayTabs } from "@/features/corridors/components/day-tabs";
import { formatDistance, formatMinutes, shortTime, type CorridorsT } from "@/features/corridors/format";
import { cn } from "@/lib/utils";

interface ItineraryViewProps {
  readonly itinerary: CorridorItinerary;
  readonly maps: { readonly apiKey: string | null; readonly mapId: string | null };
  /** The preview reads as the customer page does: larger photos, the notes shown. */
  readonly variant?: "detail" | "preview";
}

/**
 * A corridor's days and stops beside its map, kept in step: choosing a day
 * narrows both, clicking a stop brings the map to it, and clicking a marker
 * brings its stop into view.
 */
export function ItineraryView({ itinerary, maps, variant = "detail" }: ItineraryViewProps) {
  const t = useTranslations("corridors");
  const [day, setDay] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const preview = variant === "preview";

  const stops: MapStop[] = useMemo(
    () =>
      itinerary.days.flatMap((entry) =>
        entry.stops.map((stop) => ({
          key: stop.id,
          sequence: stop.sequence,
          dayNumber: entry.dayNumber,
          name: stop.title || stop.destination.name,
          subtitle: stop.destination.provinceName,
          summary: stop.description || stop.destination.shortDescription,
          coverUrl: stop.destination.coverUrl,
          latitude: stop.destination.latitude,
          longitude: stop.destination.longitude,
          arrivalTime: stop.arrivalTime,
          departureTime: stop.departureTime,
          recommendedDurationMinutes: stop.recommendedDurationMinutes,
          transportType: stop.transportType,
          distanceKm: stop.distanceFromPreviousKm,
          travelMinutes: stop.travelTimeFromPreviousMinutes,
          routePolyline: stop.routePolyline,
          href: `/destinations/${stop.destination.id}`,
        })),
      ),
    [itinerary],
  );

  const shownDays = itinerary.days.filter((entry) => day == null || entry.dayNumber === day);

  function selectFromMap(key: string) {
    setSelected(key);
    document.getElementById(`view-stop-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DayTabs days={itinerary.days.length} onChange={setDay} value={day} />
        </div>

        {itinerary.days.length === 0 ? (
          <Surface className="px-6 py-10 text-center text-sm text-muted">{t("view.noDays")}</Surface>
        ) : null}

        {shownDays.map((entry) => (
          <Surface aria-labelledby={`view-day-${entry.id}`} key={entry.id}>
            <SurfaceHeader
              actions={
                entry.distanceKm != null ? (
                  <span className="text-xs text-muted tabular-nums">
                    {t("words.travelling", { distance: formatDistance(t, entry.distanceKm), time: formatMinutes(t, entry.travelMinutes) })}
                  </span>
                ) : null
              }
              description={
                [entry.startTime ? t("view.setsOff", { time: shortTime(entry.startTime) }) : null, entry.description].filter(Boolean).join(" · ") ||
                undefined
              }
              id={`view-day-${entry.id}`}
              title={[t("words.day", { day: entry.dayNumber }), entry.title].filter(Boolean).join(" · ")}
            />
            <ol className="flex flex-col px-4 py-3">
              {entry.stops.length === 0 ? <li className="py-3 text-sm text-muted">{t("view.noStops")}</li> : null}
              {entry.stops.map((stop, index) => (
                <li key={stop.id}>
                  {stop.sequence > 1 && (index > 0 || day == null) ? <Leg stop={stop} t={t} /> : null}
                  <button
                    aria-pressed={selected === stop.id}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      selected === stop.id ? "border-teal bg-teal-soft/40 ring-2 ring-teal/15" : "border-line hover:bg-sand",
                    )}
                    id={`view-stop-${stop.id}`}
                    onClick={() => setSelected(stop.id)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        selected === stop.id ? "bg-inverse text-inverse-foreground" : "bg-primary text-primary-foreground",
                      )}
                    >
                      {stop.sequence}
                    </span>
                    {stop.destination.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a thumbnail from the API's media path
                      <img
                        alt=""
                        className={cn("shrink-0 rounded-md border border-line object-cover", preview ? "h-20 w-28" : "size-12")}
                        src={stop.destination.coverUrl}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-ink">{stop.title || stop.destination.name}</span>
                        {stop.destination.status !== "PUBLISHED" ? <Badge>{t("view.draftDestination")}</Badge> : null}
                        {stop.destination.latitude == null ? <Badge tone="warning">{t("words.noMapPin")}</Badge> : null}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                        {stop.title ? <span>{stop.destination.name}</span> : null}
                        {stop.destination.provinceName ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin aria-hidden className="size-3" />
                            {stop.destination.provinceName}
                          </span>
                        ) : null}
                        {stop.arrivalTime || stop.departureTime ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock aria-hidden className="size-3" />
                            {[shortTime(stop.arrivalTime), shortTime(stop.departureTime)].filter(Boolean).join("–")}
                          </span>
                        ) : null}
                        {stop.recommendedDurationMinutes != null ? (
                          <span>{t("words.stay", { time: formatMinutes(t, stop.recommendedDurationMinutes) })}</span>
                        ) : null}
                      </span>
                      {preview && (stop.description || stop.destination.shortDescription) ? (
                        <span className="mt-1.5 block text-sm text-ink-soft">{stop.description || stop.destination.shortDescription}</span>
                      ) : null}
                      {stop.notes ? <span className="mt-1.5 block text-xs text-ink-soft">{t("words.note", { note: stop.notes })}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {entry.notes ? <p className="border-t border-line px-4 py-2.5 text-xs text-ink-soft">{t("words.note", { note: entry.notes })}</p> : null}
          </Surface>
        ))}
      </div>

      <div className="min-w-0 lg:sticky lg:top-[4.25rem]">
        <CorridorMap
          apiKey={maps.apiKey}
          className="h-[420px] lg:h-[calc(100dvh-7.25rem)]"
          day={day}
          mapId={maps.mapId}
          onSelect={selectFromMap}
          selectedKey={selected}
          stops={stops}
        />
      </div>
    </div>
  );
}

function Leg({ stop, t }: { readonly stop: ItineraryStop; readonly t: CorridorsT }) {
  const transport = t(`transportWord.${stop.transportType ?? "CAR"}`);
  return (
    <p className="flex items-center gap-2 py-1.5 pl-9 text-xs text-muted">
      <ArrowDown aria-hidden className="size-3.5" />
      {stop.distanceFromPreviousKm === 0
        ? t("words.samePlace")
        : stop.distanceFromPreviousKm != null
          ? t("words.travelBy", {
              distance: formatDistance(t, stop.distanceFromPreviousKm),
              time: formatMinutes(t, stop.travelTimeFromPreviousMinutes),
              transport,
            })
          : t("words.by", { transport })}
    </p>
  );
}
