import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ListOrdered, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Metric, MetricStrip } from "@/components/ui/metric-strip";
import { canCreateResource, canDeleteResource, canSetStatus } from "@/features/auth/permissions";
import { mapsSettings } from "@/features/corridors/api/corridors.server";
import { loadCorridorPage } from "@/features/corridors/api/load-corridor.server";
import { CorridorGallery } from "@/features/corridors/components/corridor-gallery";
import { ItineraryView } from "@/features/corridors/components/itinerary-view";
import { PublishButton } from "@/features/corridors/components/publish-button";
import { ROUTE_STATUS, formatBudget, formatDistance, formatDuration, formatMinutes } from "@/features/corridors/format";
import { PageHeader } from "@/features/shell/components/page-header";

interface CorridorPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export async function generateMetadata({ params }: CorridorPageProps): Promise<Metadata> {
  const { itinerary } = await loadCorridorPage((await params).id);
  return { title: itinerary.corridor.name };
}

/** A corridor at a glance: its standing, its figures, its itinerary on the map, and its photos. */
export default async function CorridorDetailPage({ params }: CorridorPageProps) {
  const { id } = await params;
  const { admin, itinerary } = await loadCorridorPage(id);
  const { corridor, route } = itinerary;
  const published = corridor.status === "PUBLISHED";
  const routeInfo = ROUTE_STATUS[route.status];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: "ghost" })} href={`/corridors/${id}/preview`}>
              <Eye aria-hidden className="size-4" />
              Preview
            </Link>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/corridors/${id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              Edit details
            </Link>
            {canSetStatus(admin.roles, "corridors") ? <PublishButton corridorId={id} published={published} /> : null}
            <Link className={buttonVariants()} href={`/corridors/${id}/itinerary`}>
              <ListOrdered aria-hidden className="size-4" />
              Build itinerary
            </Link>
          </>
        }
        backHref="/corridors"
        backLabel="Tourism Corridors"
        description={corridor.shortDescription ?? corridor.description ?? undefined}
        title={corridor.name}
      />

      <MetricStrip>
        <Metric label="Status" value={<Badge dot tone={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>} />
        <Metric label="Duration" value={formatDuration(corridor.durationDays, corridor.durationNights)} />
        <Metric label="Stops" value={corridor.stopCount} />
        <Metric label="Distance" value={route.status === "CURRENT" ? formatDistance(route.totalDistanceKm) : undefined} />
        <Metric label="Travel time" value={route.status === "CURRENT" ? formatMinutes(route.totalDurationMinutes) : undefined} />
        <Metric hint="per person" label="Budget" value={formatBudget(corridor.estimatedBudgetMin, corridor.estimatedBudgetMax)} />
        <Metric
          hint={route.status === "CURRENT" && route.calculatedAt ? `Worked out ${new Date(route.calculatedAt).toLocaleDateString()}` : routeInfo.hint}
          label="Road route"
          tone={route.status === "CURRENT" ? "success" : route.status === "NONE" ? "neutral" : "warning"}
          value={<Badge tone={routeInfo.tone}>{routeInfo.label}</Badge>}
        />
      </MetricStrip>

      {!route.configured ? (
        <p className="rounded-lg border border-line bg-sand px-4 py-3 text-sm text-ink-soft">
          Road routes are not calculated: the API has no <code className="font-mono text-xs">GOOGLE_MAPS_API_KEY</code>. The map joins the stops with
          straight lines until one is set.
        </p>
      ) : route.error && route.status !== "CURRENT" ? (
        <p className="rounded-lg border border-gold-deep/15 bg-gold-soft px-4 py-3 text-sm text-gold-deep" role="status">
          The last attempt to work the route out failed: {route.error}
        </p>
      ) : null}

      <ItineraryView itinerary={itinerary} maps={mapsSettings()} />

      <CorridorGallery
        canAdd={canCreateResource(admin.roles, "corridor-media")}
        canDelete={canDeleteResource(admin.roles, "corridor-media")}
        corridor={corridor}
      />
    </div>
  );
}
