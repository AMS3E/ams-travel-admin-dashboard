"use client";

import { useState } from "react";
import type { MapStop } from "@/features/corridors/api/contracts";

/**
 * The stop picked out on the list and the map, and the day the map shows.
 * Choosing a stop in the list brings its day onto the map; choosing a marker
 * brings its stop into view in the list.
 */
export function useItinerarySelection(stops: readonly MapStop[]) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mapDay, setMapDay] = useState<number | null>(null);

  function selectStop(key: string) {
    setSelected(key);
    const stop = stops.find((candidate) => candidate.key === key);
    if (stop && mapDay != null && stop.dayNumber !== mapDay) setMapDay(stop.dayNumber);
  }

  function selectFromMap(key: string) {
    setSelected(key);
    document.getElementById(`stop-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return { selected, setSelected, mapDay, setMapDay, selectStop, selectFromMap };
}

export type ItinerarySelection = ReturnType<typeof useItinerarySelection>;
