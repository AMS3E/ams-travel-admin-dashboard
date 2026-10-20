import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canSetStatus } from "@/features/auth/permissions";
import { getDestinationChoices, mapsSettings } from "@/features/corridors/api/corridors.server";
import { loadCorridorPage } from "@/features/corridors/api/load-corridor.server";
import { ItineraryBuilder } from "@/features/corridors/components/itinerary-builder";
import { PageHeader } from "@/features/shell/components/page-header";

interface ItineraryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: ItineraryPageProps): Promise<Metadata> {
  const [{ itinerary }, t] = await Promise.all([loadCorridorPage((await params).id), getTranslations("corridors")]);
  return { title: t("itinerary.metaTitle", { name: itinerary.corridor.name }) };
}

/** Days, stops, times and transport, with the route drawn beside them. */
export default async function CorridorItineraryPage({ params }: ItineraryPageProps) {
  const { id } = await params;
  const [{ admin, itinerary }, destinations, t] = await Promise.all([loadCorridorPage(id), getDestinationChoices(), getTranslations("corridors")]);

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5">
      <PageHeader
        backHref={`/corridors/${id}`}
        backLabel={itinerary.corridor.name}
        description={t("itinerary.description")}
        title={t("itinerary.title")}
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
