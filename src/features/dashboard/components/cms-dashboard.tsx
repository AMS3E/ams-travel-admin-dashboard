"use client";

import Link from "next/link";
import { useLocale, useMessages, useTranslations } from "next-intl";
import {
  ArrowRight,
  CircleCheck,
  ImageOff,
  MapPinOff,
  MessageSquareWarning,
  Plus,
  RefreshCw,
  Send,
  TextCursorInput,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Metric, MetricStrip } from "@/components/ui/metric-strip";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import {
  canCreateResource,
  canManageResource,
  hasAnyPermission,
  hasPermission,
} from "@/features/auth/permissions";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import { cambodianDay, cambodianToday } from "@/features/dashboard/format";
import { useDates } from "@/i18n/use-dates";
import { REQUEST_TONES } from "@/features/publishing/api/contracts";
import { publishingHref, reviewPageOf, reviewQueueHref } from "@/features/publishing/workflow";
import { PageHeader } from "@/features/shell/components/page-header";
import { cn } from "@/lib/utils";
import { contentSummary } from "../summary";
import { listingRows } from "@/features/publishing/listings";
import { LISTING_RESOURCES } from "@/features/publishing/api/contracts";
import { ContentStatus, DestinationGrowth } from "./overview-charts";

const ROWS = 6;

function timeOf(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function words(entityType: string): string {
  return entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

interface AttentionItem {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly tone: "warning" | "danger";
  readonly label: string;
  readonly count: number;
  readonly href?: string;
}

/**
 * One person's board: what they wrote, what they are waiting on and what is
 * waiting on them. Nobody is shown another desk's work — a partner's figures
 * count the partner's own listings, a reviewer's count the queue they answer,
 * and only an administrator, who answers for all of it, sees the catalogue
 * whole.
 */
export function CmsDashboard() {
  const t = useTranslations("dashboard");
  const status = useTranslations("publishing");
  const locale = useLocale();
  const records = useMessages().audit.records as Readonly<Record<string, { readonly one: string } | undefined>>;
  const { relative, dateTime } = useDates();
  /* English keeps its lower-case words ("created corridor stop"); other languages name the record type. */
  const typeWord = (entityType: string) => (locale === "en" ? words(entityType) : (records[entityType]?.one ?? words(entityType)));
  const query = useGetDashboardQuery();
  const { data: user } = useGetCurrentUserQuery();
  const grants = user?.roles ?? [];
  const data = query.data;
  const loading = query.isLoading;
  const destinations = data?.destinations;
  const requests = data?.requests;
  const admin = hasPermission(grants, "PERM_FULL_CONTROL");
  const canReview = hasAnyPermission(grants, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"]);
  const canOpenContent = canManageResource(grants, "destinations");
  /* Whoever answers for the whole catalogue: an editor, a BDO, an administrator. */
  const managesAll = hasAnyPermission(grants, ["PERM_DESTINATION_EDIT_ANY", "PERM_FULL_CONTROL"]);
  /* Everyone else writes their own listings and waits for a decision on them. */
  const owner = !managesAll;
  /* A reviewer's links open the queue they answer — a BDO's Partner Requests — not the page of their own submissions. */
  const requestsHref = (canReview ? reviewQueueHref(grants) : null) ?? publishingHref(grants);

  /* Everything All Destinations lists: attractions, stays and food listings. */
  const listings = destinations ? listingRows(data ?? {}) : undefined;
  const published = listings?.filter((listing) => listing.status === "PUBLISHED");
  const unpublished = listings?.filter((listing) => listing.status !== "PUBLISHED");
  const pending = requests?.filter((request) => request.status === "PENDING_REVIEW");
  const returned = requests?.filter((request) => request.status === "DRAFT");
  const rows = listings && requests ? contentSummary(listings, requests) : null;
  const counts = data?.overview?.counts;
  const total = counts?.destinations != null ? counts.destinations + (counts.stays ?? 0) + (counts.foods ?? 0) : listings?.length;
  const hiddenReviews = data?.overview?.reviews.hidden ?? 0;

  /* Today's work, by the Cambodian day the office keeps, with yesterday to read it against. */
  const today = cambodianToday();
  const yesterday = cambodianToday(-1);
  const createdOn = (day: string) => listings?.filter((listing) => cambodianDay(listing.createdAt) === day).length ?? 0;
  const createdToday = createdOn(today);
  const createdYesterday = createdOn(yesterday);
  const approvedOn = (day: string) =>
    requests?.filter((request) => request.status === "PUBLISHED" && cambodianDay(request.publishedAt ?? request.reviewedAt) === day).length ?? 0;
  const approvedToday = approvedOn(today);
  const approvedYesterday = approvedOn(yesterday);

  /* A reviewer works the queue; a submitter follows their own open requests. */
  const openRequests = (canReview ? pending : requests?.filter((request) => request.status === "PENDING_REVIEW" || request.status === "DRAFT")) ?? [];
  const recentRequests = [...openRequests].sort((a, b) => timeOf(b.requestedAt) - timeOf(a.requestedAt)).slice(0, ROWS);
  const recentListings = [...(listings ?? [])]
    .sort((a, b) => timeOf(b.updatedAt ?? b.createdAt) - timeOf(a.updatedAt ?? a.createdAt))
    .slice(0, ROWS);
  const audit = data?.audit?.slice().sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt)).slice(0, ROWS);

  const attention: AttentionItem[] = [];
  if (canReview && pending?.length) {
    attention.push({ id: "pending", icon: Send, tone: "warning", label: t("attention.pending"), count: pending.length, href: requestsHref });
  }
  if (!canReview && returned?.length) {
    attention.push({ id: "returned", icon: Undo2, tone: "warning", label: t("attention.returned"), count: returned.length, href: requestsHref });
  }
  if (canOpenContent && destinations) {
    /* An attraction's own checks: its cover, its About, its pin. */
    const noCover = destinations.filter((destination) => destination.status !== "PUBLISHED" && !destination.coverUrl).length;
    const noPitch = destinations.filter((destination) => destination.status === "PUBLISHED" && !destination.description?.trim()).length;
    const noPin = destinations.filter((destination) => destination.status === "PUBLISHED" && (destination.latitude == null || destination.longitude == null)).length;
    if (noCover) attention.push({ id: "cover", icon: ImageOff, tone: "warning", label: t("attention.cover"), count: noCover, href: "/destinations" });
    if (noPitch) attention.push({ id: "pitch", icon: TextCursorInput, tone: "warning", label: t("attention.pitch"), count: noPitch, href: "/destinations" });
    if (noPin) attention.push({ id: "pin", icon: MapPinOff, tone: "warning", label: t("attention.pin"), count: noPin, href: "/destinations" });
  }
  if (hasPermission(grants, "PERM_REVIEW_MODERATE") && hiddenReviews) {
    attention.push({ id: "reviews", icon: MessageSquareWarning, tone: "danger", label: t("attention.reviews"), count: hiddenReviews, href: "/reviews" });
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <>
            <Button
              aria-label={t("refreshLabel")}
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              size="sm"
              title={t("refreshLabel")}
              variant="secondary"
            >
              <RefreshCw aria-hidden className={cn("size-3.5", query.isFetching && "animate-spin")} />
              {t("refresh")}
            </Button>
            {canCreateResource(grants, "destinations") ? (
              <Link className={buttonVariants({ size: "sm" })} href="/create">
                <Plus aria-hidden className="size-4" />
                {t("createNew")}
              </Link>
            ) : null}
          </>
        }
        description={
          owner
            ? t("description.owner")
            : canReview && !admin
              ? t("description.reviewer")
              : t("description.all")
        }
        title={t("title")}
      />

      <QueryState error={query.error} retry={query.refetch} />
      {data?.failures.length ? (
        <p className="rounded-lg border border-gold-deep/20 bg-gold-soft px-3 py-2 text-sm text-gold-deep" role="alert">
          {t("failures", { list: data.failures.join(", ") })}
        </p>
      ) : null}

      <MetricStrip>
        {owner ? (
          <>
            {/* A partner or a contributor counts what they wrote, and nothing else. */}
            <Metric
              hint={t("metrics.yourListingsHint")}
              href="/destinations"
              label={t("metrics.yourListings")}
              value={loading ? null : listings?.length}
            />
            <Metric
              hint={t("metrics.liveHint")}
              label={t("metrics.live")}
              tone={published?.length ? "success" : "neutral"}
              value={loading ? null : published?.length}
            />
            <Metric
              hint={t("metrics.waitingHint")}
              href={requestsHref}
              label={t("metrics.waiting")}
              tone={pending?.length ? "warning" : "neutral"}
              value={loading ? null : pending?.length}
            />
            <Metric
              hint={t("metrics.sentBackHint")}
              href={requestsHref}
              label={t("metrics.sentBack")}
              tone={returned?.length ? "warning" : "neutral"}
              value={loading ? null : returned?.length}
            />
          </>
        ) : null}
        {!owner && (canOpenContent || loading) ? (
          <Metric
            hint={published ? t("metrics.destinationsHint", { count: published.length }) : undefined}
            href="/destinations"
            label={t("metrics.destinations")}
            value={loading ? null : total}
          />
        ) : null}
        {!owner && (canOpenContent || loading) ? (
          <Metric
            hint={total ? t("metrics.publishedHint", { percent: Math.round(((published?.length ?? 0) / total) * 100) }) : undefined}
            label={t("metrics.published")}
            tone={published?.length ? "success" : "neutral"}
            value={loading ? null : published?.length}
          />
        ) : null}
        {!owner && (canOpenContent || loading) ? (
          <Metric
            hint={t("metrics.unpublishedHint")}
            label={t("metrics.unpublished")}
            value={loading ? null : unpublished?.length}
          />
        ) : null}
        {!owner ? (
          /* What was written today — a listing of any kind, by anyone whose work this board covers. */
          <Metric
            hint={loading ? undefined : createdYesterday ? t("metrics.createdYesterday", { count: createdYesterday }) : t("metrics.noneYesterday")}
            href="/destinations"
            label={t("metrics.createdToday")}
            value={loading ? null : createdToday}
          />
        ) : null}
        {!owner ? (
          /* What went live today, and what is still waiting for the same decision. */
          <Metric
            hint={
              loading
                ? undefined
                : pending?.length
                  ? t("metrics.stillWaiting", { count: pending.length })
                  : approvedYesterday
                    ? t("metrics.approvedYesterday", { count: approvedYesterday })
                    : t("metrics.nothingWaiting")
            }
            href={requestsHref}
            label={t("metrics.approvedToday")}
            tone={approvedToday ? "success" : "neutral"}
            value={loading ? null : approvedToday}
          />
        ) : null}
        {hasPermission(grants, "PERM_REVIEW_MODERATE") ? (
          /* What a moderator acts on is the hidden ones; the total is the background. */
          <Metric
            hint={
              loading
                ? undefined
                : hiddenReviews
                  ? t("metrics.ofWritten", { count: data?.overview?.reviews.total ?? 0 })
                  : data?.overview?.reviews.total
                    ? t("metrics.allVisible")
                    : t("metrics.noneWritten")
            }
            href="/reviews"
            label={hiddenReviews ? t("metrics.reviewsHidden") : t("metrics.reviews")}
            tone={hiddenReviews ? "danger" : "neutral"}
            value={loading ? null : hiddenReviews || (data?.overview ? data.overview.reviews.total : undefined)}
          />
        ) : null}
      </MetricStrip>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {requests !== null ? (
            <Surface aria-labelledby="dash-requests">
              <SurfaceHeader
                actions={<ViewAll href={requestsHref} />}
                description={canReview ? t("requests.descriptionReview") : t("requests.descriptionOwn")}
                id="dash-requests"
                title={canReview ? t("requests.titleReview") : t("requests.titleOwn")}
              />
              {recentRequests.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-sand text-xs text-muted">
                      <tr>
                        <th className="h-8 px-4 font-medium whitespace-nowrap" scope="col">{t("requests.destination")}</th>
                        {canReview ? <th className="h-8 px-4 font-medium whitespace-nowrap" scope="col">{t("requests.submittedBy")}</th> : null}
                        <th className="hidden h-8 px-4 font-medium whitespace-nowrap 2xl:table-cell" scope="col">{t("requests.desk")}</th>
                        <th className="h-8 px-4 font-medium whitespace-nowrap" scope="col">{t("requests.submitted")}</th>
                        <th className="h-8 px-4 text-right font-medium whitespace-nowrap" scope="col">{t("requests.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {recentRequests.map((request) => (
                        <tr className="hover:bg-sand" key={request.id}>
                          <td className="max-w-64 px-4 py-2.5">
                            <Link className="block truncate font-medium text-ink hover:text-teal-deep hover:underline" href={reviewPageOf(request)}>
                              {request.targetName}
                            </Link>
                          </td>
                          {canReview ? <td className="px-4 py-2.5 whitespace-nowrap text-ink-soft">{request.requestedByName ?? t("requests.unknownAccount")}</td> : null}
                          <td className="hidden px-4 py-2.5 whitespace-nowrap text-muted 2xl:table-cell">{status(`desk.${request.desk}`)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted" title={dateTime(request.requestedAt)}>
                            {relative(request.requestedAt)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge dot tone={REQUEST_TONES[request.status]}>{status(`status.${request.status}`)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  {loading ? t("requests.loading") : canReview ? t("requests.noneReview") : t("requests.noneOwn")}
                </p>
              )}
            </Surface>
          ) : null}

          {canOpenContent || listings?.length ? (
            <Surface aria-labelledby="dash-updated">
              <SurfaceHeader
                actions={<ViewAll href="/destinations" />}
                description={owner ? t("listings.descriptionOwn") : t("listings.descriptionAll")}
                id="dash-updated"
                title={owner ? t("listings.titleOwn") : t("listings.titleAll")}
              />
              {recentListings.length ? (
                <ul className="divide-y divide-line">
                  {recentListings.map((listing) => {
                    const live = listing.status === "PUBLISHED";
                    const changed = listing.updatedAt ?? listing.createdAt;
                    return (
                      <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand" key={listing.id}>
                        <div className="min-w-0 flex-1">
                          <Link
                            className="block truncate text-sm font-medium text-ink hover:text-teal-deep hover:underline"
                            href={`/${LISTING_RESOURCES[listing.type]}/${listing.id}`}
                          >
                            {listing.name}
                          </Link>
                          <p className="truncate text-xs text-muted">{listing.detail || listing.summary || t("listings.nothingWritten")}</p>
                        </div>
                        <Badge dot tone={live ? "success" : "neutral"}>
                          {live ? t("listings.published") : listing.status === "ARCHIVED" ? t("listings.archived") : t("listings.draft")}
                        </Badge>
                        <span className="hidden w-24 shrink-0 text-right text-xs text-muted tabular-nums sm:block" title={dateTime(changed)}>
                          {relative(changed)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  {loading ? t("listings.loading") : owner ? t("listings.noneOwn") : t("listings.none")}
                </p>
              )}
            </Surface>
          ) : null}

          {/* The curve of the catalogue is the whole catalogue's business, so only a desk that answers for it sees one. */}
          {managesAll ? <DestinationGrowth listings={listings} /> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Surface aria-labelledby="dash-attention">
            <SurfaceHeader id="dash-attention" title={t("attention.title")} />
            {attention.length ? (
              <ul className="divide-y divide-line">
                {attention.map((item) => {
                  const Icon = item.icon;
                  const body = (
                    <>
                      <Icon aria-hidden className={cn("size-4 shrink-0", item.tone === "danger" ? "text-heritage" : "text-gold-deep")} strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 text-sm text-ink-soft">{item.label}</span>
                      <span className="text-sm font-semibold text-ink tabular-nums">{item.count}</span>
                      {item.href ? <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted" /> : null}
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={item.href}>
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted">
                <CircleCheck aria-hidden className="size-4 text-success" />
                {loading ? t("attention.checking") : t("attention.none")}
              </p>
            )}
          </Surface>

          {canOpenContent || requests ? <ContentStatus rows={rows} /> : null}

          <Surface aria-labelledby="dash-activity">
            <SurfaceHeader
              actions={<ViewAll href={hasPermission(grants, "PERM_AUDIT_VIEW") ? "/audit-logs" : requestsHref} />}
              id="dash-activity"
              title={t("activity.title")}
            />
            {audit?.length ? (
              <ul className="divide-y divide-line">
                {audit.map((entry) => {
                  const name =
                    entry.entityType === "Destination"
                      ? destinations?.find((destination) => destination.id === entry.entityId)?.name
                      : undefined;
                  return (
                    <li className="px-4 py-2.5" key={entry.id}>
                      <p className="text-sm text-ink-soft">
                        {t.rich("activity.line", {
                          b: (chunks) => <span className="font-medium text-ink">{chunks}</span>,
                          name: entry.userName || t("activity.system"),
                          action: entry.action,
                          type: typeWord(entry.entityType),
                        })}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        {name ? <span className="min-w-0 truncate">{name}</span> : null}
                        {name ? <span aria-hidden>·</span> : null}
                        <time className="shrink-0" dateTime={entry.createdAt} title={dateTime(entry.createdAt)}>
                          {relative(entry.createdAt)}
                        </time>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : !hasPermission(grants, "PERM_AUDIT_VIEW") && requests?.length ? (
              <ul className="divide-y divide-line">
                {[...requests].sort((a, b) => timeOf(b.requestedAt) - timeOf(a.requestedAt)).slice(0, ROWS).map((request) => (
                  <li className="px-4 py-2.5" key={request.id}>
                    <Link className="text-sm font-medium text-ink hover:text-teal-deep hover:underline" href={reviewPageOf(request)}>
                      {request.targetName}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {request.requestedByName ?? t("requests.unknownAccount")} · {status(`status.${request.status}`)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">
                {loading ? t("activity.loading") : audit ? t("activity.empty") : t("activity.unavailable")}
              </p>
            )}
          </Surface>

        </div>
      </div>
    </div>
  );
}

function ViewAll({ href }: { readonly href: string }) {
  const t = useTranslations("dashboard");
  return (
    <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href={href}>
      {t("viewAll")}
      <ArrowRight aria-hidden className="size-3" />
    </Link>
  );
}
