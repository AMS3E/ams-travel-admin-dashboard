import type { Metadata } from "next";
import { canSetStatus } from "@/features/auth/permissions";
import { getDestinationChoices, mapsSettings } from "@/features/corridors/api/corridors.server";
import { loadCorridorPage } from "@/features/corridors/api/load-corridor.server";
import { ItineraryBuilder } from "@/features/corridors/components/itinerary-builder";
import { PageHeader } from "@/features/shell/components/page-header";

interface ItineraryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: ItineraryPageProps): Promise<Metadata> {
  const { itinerary } = await loadCorridorPage((await params).id);
  return { title: `Itinerary · ${itinerary.corridor.name}` };
}

/** Days, stops, times and transport, with the route drawn beside them. */
export default async function CorridorItineraryPage({ params }: ItineraryPageProps) {
  const { id } = await params;
  const [{ admin, itinerary }, destinations] = await Promise.all([loadCorridorPage(id), getDestinationChoices()]);

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5">
      <PageHeader
        backHref={`/corridors/${id}`}
        backLabel={itinerary.corridor.name}
        description="Add days, add destinations as stops, and drag them into travelling order. Saving works the road route out for any leg that changed."
        title="Itinerary builder"
      />
      <ItineraryBuilder
        canPublish={canSetStatus(admin.roles, "corridors")}
        corridorId={id}
        destinations={destinations}
        initial={itinerary}
        maps={mapsSettings()}
      />
    </div>
  );
}
