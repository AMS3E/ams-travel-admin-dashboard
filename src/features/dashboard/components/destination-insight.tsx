"use client";

import { useState } from "react";
import { visitLine } from "@/features/dashboard/reviews";
import Image from "next/image";
import { Eye, ImageIcon, MapPin, MessageSquare, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Toolbar } from "@/components/ui/toolbar";
import { hasPermission } from "@/features/auth/permissions";
import { useGetCatalogQuery, useGetCatalogRecordQuery } from "@/features/catalog/api/catalog-api";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDestinationReviewsQuery, useModerateReviewMutation } from "@/features/editorial/api/editorial-api";
import { BASIS_LABELS } from "@/features/verification/api/contracts";
import { useGetDestinationVerificationsQuery } from "@/features/verification/api/verification-api";
import { VerificationHistory } from "@/features/verification/components/verification-history";
import { VerifyButton } from "@/features/verification/components/verify-button";
import type { DestinationStatsPeriod, StampTarget } from "../api/contracts";
import { CheckInCode } from "./check-in-code";
import { useGetPlaceStatsQuery } from "../api/dashboard-api";
import { cambodianDay, formatDateTime } from "../format";
import { PeriodControl, inWindow, periodDates, windowOf, type Period } from "./period-control";
import { StatGrid, StatTile } from "./stat-tile";

const STATUS: Readonly<Record<string, { label: string; tone: "active" | "neutral" | "inactive" }>> = {
  PUBLISHED: { label: "Published", tone: "active" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "inactive" },
};

const count = (value: number) => value.toLocaleString();

/** The kinds of listing the page reads: the catalogue resource, and how the API files its reviews and browses. */
export type PlaceResource = "destinations" | "stays" | "foods";
const TARGET: Readonly<Record<PlaceResource, StampTarget>> = { destinations: "DESTINATION", stays: "STAY", foods: "FOOD" };

/**
 * One place's insight, an attraction, a stay or a food place: the listing as
 * it stands, what travellers made of it over a period, every review, its
 * check-in code, and the Verified badge with its history. Read-only but for
 * moderating a review and filing a verification, which open their own
 * controls; editing the listing is the form's job.
 */
export function DestinationInsight({ id, grants, resource = "destinations" }: {
  readonly id: string;
  readonly grants: readonly string[];
  readonly resource?: PlaceResource;
}) {
  const [period, setPeriod] = useState<Period>("all");
  const [custom, setCustom] = useState<DestinationStatsPeriod>({});
  const window = windowOf(period, custom);
  const dates = periodDates(window);
  const record = useGetCatalogRecordQuery({ resource, id });
  const provinces = useGetCatalogQuery("provinces");
  const stats = useGetPlaceStatsQuery({ id, ...window });
  const reviews = useGetDestinationReviewsQuery({ targetType: TARGET[resource], targetId: id });
  const verifies = hasPermission(grants, "PERM_VERIFIED_BADGE_SET") || hasPermission(grants, "PERM_FULL_CONTROL");
  const manages = hasPermission(grants, "PERM_DESTINATION_EDIT_ANY");
  const history = useGetDestinationVerificationsQuery(id, { skip: !verifies });
  const moderator = hasPermission(grants, "PERM_REVIEW_MODERATE");
  const [moderate, moderation] = useModerateReviewMutation();

  const place = record.data;
  const text = (name: string) => (place && typeof place[name] === "string" && (place[name] as string).trim()) || null;
  const province = provinces.data?.find((row) => row.id === place?.provinceId);
  const provinceName = province && typeof province.name === "string" ? province.name : null;
  const status = STATUS[String(place?.status)];
  const row = stats.data?.place;
  const shown = (reviews.data ?? []).filter((review) => inWindow(review.createdAt, window, cambodianDay));

  return (
    <div className="flex flex-col gap-4">
      {/* The listing as travellers see it, and what it carries today. */}
      <Surface className="flex flex-wrap items-center gap-4 p-4">
        {text("coverUrl") ? (
          <Image alt="" className="size-20 shrink-0 rounded-md object-cover ring-1 ring-line" height={80} src={text("coverUrl")!} unoptimized width={80} />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-md bg-sand-deep text-muted">
            <ImageIcon aria-hidden className="size-6" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {record.isLoading ? <div aria-hidden className="h-10 w-64 animate-pulse rounded bg-sand" /> : null}
          {place ? (
            <>
              <p className="flex items-center gap-1 text-sm text-ink-soft">
                <MapPin aria-hidden className="size-3.5 shrink-0 text-muted" />
                {[text("address"), provinceName && !text("address")?.toLowerCase().includes(provinceName.toLowerCase()) ? provinceName : null]
                  .filter(Boolean)
                  .join(", ") || "No address on the listing yet."}
              </p>
              {text("slogan") ? <p className="mt-0.5 text-sm text-muted italic">“{text("slogan")}”</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2" data-field="standing">
                {status ? <Badge dot tone={status.tone}>{status.label}</Badge> : null}
                {row ? (
                  <Badge tone={row.verified ? "info" : "neutral"}>
                    {row.verified && row.basis ? `Verified · ${BASIS_LABELS[row.basis]}` : row.verified ? "Verified" : "Not verified"}
                  </Badge>
                ) : null}
                {row?.travelerRecommended ? <Badge tone="success">Recommended by Traveler</Badge> : null}
              </div>
            </>
          ) : null}
        </div>
      </Surface>

      {/* What travellers made of it, over the period. */}
      <Surface>
        <Toolbar>
          <PeriodControl custom={custom} onCustom={setCustom} onPeriod={setPeriod} period={period} />
        </Toolbar>
        <div className="p-4">
          {stats.error ? <QueryState error={stats.error} loading={false} retry={stats.refetch} /> : null}
          <StatGrid>
            <StatTile icon={Star} label={row ? `Rating · ${count(row.ratingCount)} ${row.ratingCount === 1 ? "rating" : "ratings"}` : "Rating"} value={row ? (row.averageRating == null ? "—" : row.averageRating.toFixed(1)) : null} />
            <StatTile icon={MessageSquare} label="Reviews" value={row ? count(row.reviewCount) : null} />
            <StatTile icon={Eye} label="Browses" value={row ? count(row.browses) : null} />
            <StatTile icon={Eye} label="Views, all time" value={row ? count(row.viewCount) : null} />
          </StatGrid>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Every review, in the period. */}
        <Surface aria-label="Reviews">
          <SurfaceHeader
            actions={reviews.data ? <span className="text-xs text-muted tabular-nums">{count(shown.length)}</span> : null}
            description={dates ? `Written ${dates}.` : "Every review written so far, newest first."}
            title="Reviews"
          />
          {reviews.isLoading || reviews.error ? (
            <div className="p-3">
              <QueryState error={reviews.error} loading={reviews.isLoading} retry={reviews.refetch} />
            </div>
          ) : null}
          {reviews.data ? (
            shown.length ? (
              <ul className="divide-y divide-line">
                {shown.map((review) => {
                  const visible = review.status === "VISIBLE";
                  const photos = review.photos ?? [];
                  return (
                    <li className="p-4" key={review.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium text-ink">{review.authorName || "Traveler"}</h3>
                          <p className="mt-0.5 text-xs text-muted">{formatDateTime(review.createdAt)}</p>
                          {visitLine(review) ? <p className="mt-0.5 text-xs text-muted">{visitLine(review)}</p> : null}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-ink-soft tabular-nums">
                          <Star aria-hidden className="size-3.5 fill-gold text-gold" />
                          {review.rating} / 5
                        </span>
                      </div>
                      {review.title ? <h4 className="mt-2 text-sm font-medium text-ink">{review.title}</h4> : null}
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{review.content || "No written review."}</p>
                      {photos.length ? (
                        <ul aria-label="Photos" className="mt-3 flex flex-wrap gap-2">
                          {photos.map((photo) =>
                            photo.mediaUrl ? (
                              <li key={photo.id}>
                                <Image alt={photo.caption ?? ""} className="size-14 rounded-md object-cover ring-1 ring-line" height={56} src={photo.mediaUrl} unoptimized width={56} />
                              </li>
                            ) : null,
                          )}
                        </ul>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between">
                        <Badge dot tone={visible ? "success" : "neutral"}>{visible ? "Visible" : "Hidden"}</Badge>
                        {moderator ? (
                          <Button
                            disabled={moderation.isLoading}
                            onClick={() => void moderate({ id: review.id, status: visible ? "HIDDEN" : "VISIBLE" })}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {visible ? "Hide" : "Show"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">{dates ? "No review in this period." : "No reviews yet."}</p>
            )
          ) : null}
        </Surface>

        {/* The code posted on site for check-ins; then the Verified badge, where it stands and every decision behind it. */}
        <div className="flex flex-col gap-4">
          <CheckInCode manages={manages} name={text("name") ?? ""} targetId={id} targetType={TARGET[resource]} />
          <Surface aria-label="Verification" className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Verification</h2>
                {row ? (
                  <Badge tone={row.verified ? "gold" : "neutral"}>
                    {row.verified && row.basis ? `Verified · ${BASIS_LABELS[row.basis]}` : row.verified ? "Verified" : "Not verified"}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {row?.verified ? "Shows as Recommended by AMS Travel in the app." : "Not shown as Recommended by AMS Travel."}
                {row?.travelerRecommended ? " The reviews have earned it Recommended by Traveler." : ""}
              </p>
            </div>
            {verifies && place ? (
              <VerifyButton destination={{ id, name: text("name") ?? "", verified: Boolean(row?.verified && row.basis !== "TRAVELER_SCORE"), resource }} />
            ) : null}
          </Surface>
          {verifies && history.data ? <VerificationHistory history={history.data} /> : null}
        </div>
      </div>
    </div>
  );
}
