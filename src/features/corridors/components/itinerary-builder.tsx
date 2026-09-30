"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { Eye, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { CorridorItinerary, DestinationChoice } from "@/features/corridors/api/contracts";
import {
  useRecalculateRouteMutation,
  useSaveItineraryMutation,
  useSetCorridorPublishedMutation,
} from "@/features/corridors/api/corridors-api";
import { settled } from "@/store/api/api-error";
import { ItineraryDaysEditor } from "@/features/corridors/components/itinerary-days-editor";
import { ItineraryMapPanel } from "@/features/corridors/components/itinerary-map-panel";
import { ROUTE_STATUS, formatDistance, formatMinutes } from "@/features/corridors/format";
import {
  draftFrom,
  draftReducer,
  inputFrom,
  knownLegs,
  mapStopsFrom,
  startingDays,
} from "@/features/corridors/itinerary-draft";
import { useItinerarySelection } from "@/features/corridors/use-itinerary-selection";
import { useRoadPreview } from "@/features/corridors/use-road-preview";
import { cn } from "@/lib/utils";

interface ItineraryBuilderProps {
  readonly corridorId: string;
  readonly initial: CorridorItinerary;
  readonly destinations: readonly DestinationChoice[];
  readonly maps: { readonly apiKey: string | null; readonly mapId: string | null };
  readonly canPublish: boolean;
}

type Notice = { readonly tone: "success" | "warning" | "danger"; readonly text: string };

/** The saved itinerary as the builder edits it: a corridor with no days yet opens on an empty Day 1. */
const editable = (itinerary: CorridorItinerary) => startingDays(draftFrom(itinerary));

/**
 * Plans a corridor day by day: add days, add existing destinations as stops,
 * drag them into order, and set when the traveller arrives, leaves and how
 * they travel. Saving writes the whole itinerary; the API then works the road
 * route out again for any leg that changed, and the map redraws it.
 */
export function ItineraryBuilder({ corridorId, initial, destinations, maps, canPublish }: ItineraryBuilderProps) {
  const [saved, setSaved] = useState(initial);
  const [days, dispatch] = useReducer(draftReducer, initial, editable);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "route" | "publish" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saveItinerary] = useSaveItineraryMutation();
  const [recalculateRoute] = useRecalculateRouteMutation();
  const [setCorridorPublished] = useSetCorridorPublishedMutation();

  const savedBody = useMemo(() => JSON.stringify(inputFrom(editable(saved))), [saved]);
  const dirty = JSON.stringify(inputFrom(days)) !== savedBody;

  const places = useMemo(() => {
    const byId = new Map<string, DestinationChoice>();
    for (const day of saved.days) {
      for (const stop of day.stops) {
        const place = stop.destination;
        byId.set(place.id, {
          id: place.id,
          name: place.name,
          provinceName: place.provinceName,
          status: place.status,
          coverUrl: place.coverUrl,
          latitude: place.latitude,
          longitude: place.longitude,
          shortDescription: place.shortDescription,
          categories: [],
        });
      }
    }
    for (const destination of destinations) byId.set(destination.id, destination);
    return byId;
  }, [saved, destinations]);

  const savedLegs = useMemo(() => knownLegs(saved), [saved]);
  /* New legs get their road as the plan is edited, not only once it is saved. */
  const legs = useRoadPreview(days, savedLegs);
  const mapStops = useMemo(() => mapStopsFrom(days, places, legs), [days, places, legs]);
  const selection = useItinerarySelection(mapStops);
  const stopCount = mapStops.length;
  const published = saved.corridor.status === "PUBLISHED";
  const routeInfo = ROUTE_STATUS[saved.route.status];

  /* Leaving with unsaved stops asks first. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function adopt(itinerary: CorridorItinerary) {
    setSaved(itinerary);
    dispatch({ type: "reset", days: editable(itinerary) });
    selection.setSelected(null);
  }

  function save() {
    setBusy("save");
    setNotice(null);
    startTransition(async () => {
      const result = await settled(saveItinerary({ corridorId, days: inputFrom(days) }).unwrap());
      setBusy(null);
      if (!result.ok) {
        setNotice({ tone: "danger", text: result.message });
        return;
      }
      adopt(result.itinerary);
      const route = result.itinerary.route;
      if (route.status === "CURRENT" || route.status === "NONE") {
        setNotice({ tone: "success", text: route.status === "CURRENT" ? "Itinerary saved. The road route is up to date." : "Itinerary saved." });
      } else if (!route.configured) {
        setNotice({ tone: "warning", text: "Itinerary saved. The road route is not calculated: routing is off on the API (no GOOGLE_MAPS_API_KEY or OSM_ROUTING_URL), so the map joins the stops with straight lines." });
      } else {
        setNotice({ tone: "warning", text: `Itinerary saved, but the road route could not be worked out${route.error ? `: ${route.error}` : "."}` });
      }
    });
  }

  function recalculate() {
    setBusy("route");
    setNotice(null);
    startTransition(async () => {
      const result = await settled(recalculateRoute(corridorId).unwrap());
      setBusy(null);
      if (!result.ok) {
        setNotice({ tone: "danger", text: result.message });
        return;
      }
      adopt(result.itinerary);
      setNotice({ tone: "success", text: "Road route recalculated." });
    });
  }

  function togglePublished() {
    setBusy("publish");
    setNotice(null);
    startTransition(async () => {
      const result = await settled(setCorridorPublished({ corridorId, published: !published }).unwrap());
      setBusy(null);
      if (!result.ok) {
        setNotice({ tone: "danger", text: result.message });
        return;
      }
      setSaved((current) => ({ ...current, corridor: result.corridor }));
      setNotice({ tone: "success", text: result.corridor.status === "PUBLISHED" ? "Published: the corridor is on the website." : "Unpublished: the corridor is a draft again." });
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Pinned under the top bar on a solid ground, so nothing scrolls through behind it. */}
        <div className="shell-backdrop sticky top-14 z-20 pt-3 pb-1">
          <Surface>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge dot tone={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>
                {dirty ? (
                  <Badge dot tone="warning">Unsaved changes</Badge>
                ) : (
                  <Badge dot title={routeInfo.hint} tone={routeInfo.tone}>
                    {routeInfo.label}
                  </Badge>
                )}
                <span className="text-xs text-muted tabular-nums">
                  {days.length} {days.length === 1 ? "day" : "days"} · {stopCount} {stopCount === 1 ? "stop" : "stops"}
                  {!dirty && saved.route.status === "CURRENT"
                    ? ` · ${formatDistance(saved.route.totalDistanceKm)} · ${formatMinutes(saved.route.totalDurationMinutes)} travelling`
                    : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/corridors/${corridorId}/preview`}>
                  <Eye aria-hidden className="size-4" />
                  Preview
                </Link>
                <Button
                  disabled={pending || dirty || stopCount < 2 || !saved.route.configured}
                  onClick={recalculate}
                  size="sm"
                  title={
                    !saved.route.configured
                      ? "Routing is off on the API"
                      : dirty
                        ? "Save the itinerary first"
                        : "Work the road route out again"
                  }
                  type="button"
                  variant="secondary"
                >
                  {busy === "route" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <RefreshCw aria-hidden className="size-4" />}
                  Recalculate route
                </Button>
                {canPublish ? (
                  <Button
                    disabled={pending || dirty}
                    onClick={togglePublished}
                    size="sm"
                    title={dirty ? "Save the itinerary first" : undefined}
                    type="button"
                    variant="secondary"
                  >
                    {busy === "publish" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
                    {published ? "Unpublish" : "Publish"}
                  </Button>
                ) : null}
                <Button disabled={pending || !dirty} onClick={save} size="sm" type="button">
                  {busy === "save" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                  Save itinerary
                </Button>
              </div>
            </div>
            {notice ? (
              <p
                className={cn(
                  "border-t px-4 py-2 text-xs",
                  notice.tone === "success" && "border-success/15 bg-success-soft text-success",
                  notice.tone === "warning" && "border-gold-deep/15 bg-gold-soft text-gold-deep",
                  notice.tone === "danger" && "border-heritage/15 bg-heritage-soft text-heritage",
                )}
                role={notice.tone === "danger" ? "alert" : "status"}
              >
                {notice.text}
              </p>
            ) : !dirty && saved.route.error && saved.route.status !== "CURRENT" ? (
              <p className="border-t border-gold-deep/15 bg-gold-soft px-4 py-2 text-xs text-gold-deep" role="status">
                Last route attempt failed: {saved.route.error}
              </p>
            ) : null}
          </Surface>
        </div>

        <ItineraryDaysEditor
          days={days}
          destinations={destinations}
          dispatch={dispatch}
          legs={legs}
          onSelect={selection.selectStop}
          places={places}
          selected={selection.selected}
        />
      </div>

      <ItineraryMapPanel
        days={days.length}
        description="Numbered in travel order, along the real roads. Click a stop or a marker."
        maps={maps}
        selection={selection}
        stops={mapStops}
      />
    </div>
  );
}
