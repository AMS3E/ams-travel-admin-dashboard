import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { mapsSettings } from "@/features/corridors/api/corridors.server";
import { loadCorridorPage } from "@/features/corridors/api/load-corridor.server";
import { ItineraryView } from "@/features/corridors/components/itinerary-view";
import { formatBudget, formatDistance, formatDuration, formatMinutes } from "@/features/corridors/format";
import { PageHeader } from "@/features/shell/components/page-header";

interface PreviewPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { itinerary } = await loadCorridorPage((await params).id);
  return { title: `Preview · ${itinerary.corridor.name}` };
}

/** The corridor as a traveller reads it — drafts included, so it can be checked before it is published. */
export default async function CorridorPreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const { itinerary } = await loadCorridorPage(id);
  const { corridor, route } = itinerary;
  const facts = [
    formatDuration(corridor.durationDays, corridor.durationNights),
    `${corridor.stopCount} ${corridor.stopCount === 1 ? "stop" : "stops"}`,
    route.status === "CURRENT" ? `${formatDistance(route.totalDistanceKm)} · ${formatMinutes(route.totalDurationMinutes)} travelling` : null,
    corridor.estimatedBudgetMin != null || corridor.estimatedBudgetMax != null
      ? `${formatBudget(corridor.estimatedBudgetMin, corridor.estimatedBudgetMax)} per person`
      : null,
  ].filter((fact): fact is string => Boolean(fact && fact !== "—"));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "secondary" })} href={`/corridors/${id}/itinerary`}>
            <ListOrdered aria-hidden className="size-4" />
            Back to the builder
          </Link>
        }
        backHref={`/corridors/${id}`}
        backLabel={corridor.name}
        description="How the corridor reads on the website."
        title="Preview"
      />

      <section className="panel overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {corridor.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the cover, from the API's media path
            <img alt="" className="h-48 w-full object-cover md:h-full" src={corridor.coverUrl} />
          ) : (
            <div className="hidden bg-sand md:block" />
          )}
          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Tourism corridor</Badge>
              {corridor.status !== "PUBLISHED" ? <Badge>Draft — not on the website yet</Badge> : null}
            </div>
            <h2 className="heading text-2xl font-semibold text-ink">{corridor.name}</h2>
            {corridor.shortDescription ? <p className="text-md text-ink-soft">{corridor.shortDescription}</p> : null}
            {facts.length ? (
              <ul className="flex flex-wrap gap-2">
                {facts.map((fact) => (
                  <li className="rounded-full border border-line bg-sand px-2.5 py-1 text-xs font-medium text-ink-soft" key={fact}>
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
            {corridor.description && corridor.description !== corridor.shortDescription ? (
              <p className="text-sm text-muted">{corridor.description}</p>
            ) : null}
          </div>
        </div>
      </section>

      <ItineraryView itinerary={itinerary} maps={mapsSettings()} variant="preview" />
    </div>
  );
}
