"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import type { MapStop } from "@/features/corridors/api/contracts";
import { CorridorMap } from "@/features/corridors/components/corridor-map";
import { DayTabs } from "@/features/corridors/components/day-tabs";
import type { ItinerarySelection } from "@/features/corridors/use-itinerary-selection";

interface ItineraryMapPanelProps {
  readonly stops: readonly MapStop[];
  readonly days: number;
  readonly maps: { readonly apiKey: string | null; readonly mapId: string | null };
  readonly selection: ItinerarySelection;
  readonly description: string;
}

/** The plan on the map beside it, one day or all of them; it stays in view while the list scrolls. */
export function ItineraryMapPanel({ stops, days, maps, selection, description }: ItineraryMapPanelProps) {
  const t = useTranslations("corridors.map");
  const { mapDay, setMapDay, selected, selectFromMap } = selection;
  // A day removed while the map showed it: show them all.
  const day = mapDay != null && mapDay <= days ? mapDay : null;

  return (
    <Surface className="min-w-0 lg:sticky lg:top-[4.25rem]">
      <SurfaceHeader
        actions={<DayTabs days={days} onChange={setMapDay} value={day} />}
        description={description}
        title={
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="size-4 text-muted" />
            {t("routeMap")}
          </span>
        }
      />
      <div className="p-3">
        <CorridorMap
          apiKey={maps.apiKey}
          className="h-[420px] lg:h-[calc(100dvh-13.75rem)]"
          day={day}
          mapId={maps.mapId}
          onSelect={selectFromMap}
          selectedKey={selected}
          stops={stops}
        />
      </div>
    </Surface>
  );
}
