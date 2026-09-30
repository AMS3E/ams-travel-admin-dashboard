"use client";

import { useEffect, useMemo, useState } from "react";
import { useLazyPreviewRouteQuery } from "@/features/corridors/api/corridors-api";
import { legKey, legsFromPreview, roadWindow, type DraftDay, type KnownLeg } from "@/features/corridors/itinerary-draft";

/** How long the plan has to stay still before its new legs are asked for: a few stops added in a row cost one request. */
const SETTLE_MS = 700;

interface Found {
  readonly legs: ReadonlyMap<string, KnownLeg>;
  /** Legs asked for that came back with no road — a stop with no pin — so they are not asked for again. */
  readonly tried: ReadonlySet<string>;
}

/**
 * The real roads between a plan's stops while it is edited, before anything
 * is saved. The saved route's legs are used as they are; a leg that is new —
 * a stop added, moved, or reached another way — is asked of the API a moment
 * after the plan stops changing, and kept for as long as the page is open.
 * Once the API says it cannot work roads out, nothing more is asked.
 */
export function useRoadPreview(days: readonly DraftDay[], saved: ReadonlyMap<string, KnownLeg>): ReadonlyMap<string, KnownLeg> {
  const [found, setFound] = useState<Found>({ legs: new Map(), tried: new Set() });
  const [off, setOff] = useState(false);
  const [previewRoute] = useLazyPreviewRouteQuery();

  const legs = useMemo(() => new Map([...found.legs, ...saved]), [found, saved]);
  const wanted = useMemo(
    () => (off ? null : roadWindow(days, (key) => legs.has(key) || found.tried.has(key))),
    [days, legs, found, off],
  );
  const request = wanted ? JSON.stringify(wanted) : null;

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const stops = JSON.parse(request) as NonNullable<typeof wanted>;
      // A plan asked for before is answered from the cache.
      const result = await previewRoute(stops, true)
        .unwrap()
        .catch(() => ({ ok: false as const, message: "" }));
      if (cancelled) return;
      if (result.ok && !result.preview.configured) {
        setOff(true);
        return;
      }
      const asked = stops.slice(1).map((stop, index) => legKey(stops[index].destinationId, stop.destinationId, stop.transportType));
      setFound((current) => ({
        legs: result.ok ? new Map([...current.legs, ...legsFromPreview(result.preview.legs)]) : current.legs,
        tried: new Set([...current.tried, ...asked]),
      }));
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewRoute, request]);

  return legs;
}
