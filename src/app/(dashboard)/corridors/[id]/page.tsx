import type { Metadata } from "next";
import Link from "next/link";
import { getMessages, getTranslations } from "next-intl/server";
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
import { formatBudget, formatDistance, formatDuration, formatMinutes, routeStatusOf } from "@/features/corridors/format";
import { PageHeader } from "@/features/shell/components/page-header";
import { datePartsOf, fillDate } from "@/i18n/dates";

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
  const [{ admin, itinerary }, t, messages] = await Promise.all([loadCorridorPage(id), getTranslations("corridors"), getMessages()]);
  const { corridor, route } = itinerary;
  const published = corridor.status === "PUBLISHED";
  const routeInfo = routeStatusOf(t, route.status);
  const dates = messages.common.dates;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: "ghost" })} href={`/corridors/${id}/preview`}>
              <Eye aria-hidden className="size-4" />
              {t("words.preview")}
            </Link>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/corridors/${id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              {t("detail.edit")}
            </Link>
            {canSetStatus(admin.roles, "corridors") ? <PublishButton corridorId={id} published={published} /> : null}
            <Link className={buttonVariants()} href={`/corridors/${id}/itinerary`}>
              <ListOrdered aria-hidden className="size-4" />
              {t("detail.build")}
            </Link>
          </>
        }
        backHref="/corridors"
        backLabel={t("words.tourismCorridors")}
        description={corridor.shortDescription ?? corridor.description ?? undefined}
        title={corridor.name}
      />

      <MetricStrip>
        <Metric
          label={t("detail.metrics.status")}
          value={<Badge dot tone={published ? "success" : "neutral"}>{published ? t("words.published") : t("words.draft")}</Badge>}
        />
        <Metric label={t("detail.metrics.duration")} value={formatDuration(t, corridor.durationDays, corridor.durationNights)} />
        <Metric label={t("detail.metrics.stops")} value={corridor.stopCount} />
        <Metric label={t("detail.metrics.distance")} value={route.status === "CURRENT" ? formatDistance(t, route.totalDistanceKm) : undefined} />
        <Metric label={t("detail.metrics.travelTime")} value={route.status === "CURRENT" ? formatMinutes(t, route.totalDurationMinutes) : undefined} />
        <Metric
          hint={t("detail.metrics.budgetHint")}
          label={t("detail.metrics.budget")}
          value={formatBudget(t, corridor.estimatedBudgetMin, corridor.estimatedBudgetMax)}
        />
        <Metric
          hint={
            route.status === "CURRENT" && route.calculatedAt
              ? t("detail.workedOut", { date: fillDate(dates.date, datePartsOf(new Date(route.calculatedAt)), dates) })
              : routeInfo.hint
          }
          label={t("detail.metrics.road")}
          tone={route.status === "CURRENT" ? "success" : route.status === "NONE" ? "neutral" : "warning"}
          value={<Badge tone={routeInfo.tone}>{routeInfo.label}</Badge>}
        />
      </MetricStrip>

      {corridor.expectations.length ? (
        <p aria-label={t("detail.expect")} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-medium text-ink-soft">{t("detail.expect")}</span>
          {corridor.expectations.map((label) => (
            <Badge key={label} tone="neutral">{label}</Badge>
          ))}
        </p>
      ) : null}

      {!route.configured ? (
        <p className="rounded-lg border border-line bg-sand px-4 py-3 text-sm text-ink-soft">
          {t.rich("detail.notConfigured", { code: (chunks) => <code className="font-mono text-xs">{chunks}</code> })}
        </p>
      ) : route.error && route.status !== "CURRENT" ? (
        <p className="rounded-lg border border-gold-deep/15 bg-gold-soft px-4 py-3 text-sm text-gold-deep" role="status">
          {t("detail.routeFailed", { error: route.error })}
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
