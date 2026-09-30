import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquareWarning, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Metric, MetricStrip } from "@/components/ui/metric-strip";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { canCreateResource, canManageResource } from "@/features/auth/permissions";
import { getRecords } from "@/features/catalog/api/catalog.server";
import type { FoodResponse, StayResponse } from "@/features/catalog/api/contracts";
import { getDestinations } from "@/features/dashboard/api/dashboard.server";
import { formatDateTime } from "@/features/dashboard/format";
import {
  DESK_LABELS,
  REQUEST_LABELS,
  REQUEST_TONES,
  lastActivityOf,
  listingHref,
} from "@/features/publishing/api/contracts";
import { isAuthor, listingRows } from "@/features/publishing/listings";
import { getMyRequests } from "@/features/publishing/api/publishing.server";
import { publishingHref } from "@/features/publishing/workflow";

/**
 * What this account has put into the catalogue — attractions, stays and food
 * listings — and where each piece stands.
 *
 * Read from the same workspace list and request history the dashboards use, so
 * a number here and a number there cannot disagree.
 */
export async function ProfileContributions({
  grants,
  userId,
  submitsTo,
}: {
  readonly grants: readonly string[];
  readonly userId: string;
  readonly submitsTo: string | null;
}) {
  /* A stay or a food listing is read only by an account that writes them. */
  const writesListings = canManageResource(grants, "stays");
  const [destinations, stays, foods, requests] = await Promise.all([
    getDestinations(),
    writesListings ? getRecords("stays").catch(() => []) : [],
    writesListings ? getRecords("foods").catch(() => []) : [],
    getMyRequests(),
  ]);
  const mine = listingRows({
    destinations,
    stays: stays as unknown as StayResponse[],
    foods: foods as unknown as FoodResponse[],
  }).filter((listing) => isAuthor(listing, userId));
  const live = mine.filter((listing) => listing.status === "PUBLISHED");
  const returned = requests.filter((request) => request.status === "DRAFT");
  const requestsHref = publishingHref(grants);
  const pending = requests.filter((request) => request.status === "PENDING_REVIEW");

  return (
    <ContributionsFrame requestsHref={requests.length ? requestsHref : null}>
      <MetricStrip className="rounded-none border-x-0 border-t-0">
        <Metric hint="Attractions, stays and food listings you started" label="Created" value={mine.length} />
        <Metric hint="On the public site" label="Live" tone={live.length ? "success" : "neutral"} value={live.length} />
        <Metric hint={submitsTo ? `Waiting on ${submitsTo}` : "Awaiting a decision"} label="In review" tone={pending.length ? "warning" : "neutral"} value={pending.length} />
        {/* Every listing not approved yet, whether it waits in review or not. */}
        <Metric hint="Not approved yet" label="Drafts" value={mine.filter((listing) => listing.status !== "PUBLISHED").length} />
      </MetricStrip>

      {returned.length ? (
        <Link
          className="flex items-center gap-2.5 border-b border-line bg-gold-soft px-4 py-2.5 text-sm text-gold-deep transition-colors hover:bg-gold-soft/70"
          href={requestsHref}
        >
          <MessageSquareWarning aria-hidden className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">{returned.length === 1 ? "One submission" : `${returned.length} submissions`}</span>{" "}
            came back with changes to make.
          </span>
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      ) : null}

      <h3 className="px-4 pt-3 pb-1 text-xs font-medium text-muted">Latest submissions</h3>
      {requests.length ? (
        <ul className="divide-y divide-line">
          {requests.slice(0, 5).map((request) => (
            <li className="flex items-center gap-3 px-4 py-2.5" key={request.id}>
              <div className="min-w-0 flex-1">
                <Link className="block truncate text-sm font-medium text-ink hover:text-teal-deep hover:underline" href={listingHref(request)}>
                  {request.targetName}
                </Link>
                <p className="truncate text-xs text-muted">
                  {DESK_LABELS[request.desk]} · <time dateTime={lastActivityOf(request)}>{formatDateTime(lastActivityOf(request))}</time>
                </p>
              </div>
              <Badge dot tone={REQUEST_TONES[request.status]}>
                {REQUEST_LABELS[request.status]}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 pt-2 pb-5 text-center">
          <p className="text-sm font-medium text-ink">Nothing submitted yet</p>
          <p className="mx-auto mt-0.5 max-w-sm text-sm text-muted">
            When you send a destination for approval, it appears here with the decision it gets.
          </p>
          {canCreateResource(grants, "destinations") ? (
            <Link className={buttonVariants({ className: "mt-3", size: "sm" })} href="/destinations/new">
              <Plus aria-hidden className="size-3.5" />
              Create a destination
            </Link>
          ) : null}
        </div>
      )}
    </ContributionsFrame>
  );
}

/** The section while the workspace list is still on its way. */
export function ContributionsSkeleton() {
  return (
    <ContributionsFrame requestsHref={null}>
      <div aria-busy className="animate-pulse p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div className="h-16 rounded-md bg-sand-deep" key={index} />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <div className="h-9 rounded-md bg-sand-deep" key={index} />
          ))}
        </div>
      </div>
    </ContributionsFrame>
  );
}

function ContributionsFrame({
  requestsHref,
  children,
}: {
  readonly requestsHref: string | null;
  readonly children: ReactNode;
}) {
  return (
    <Surface aria-labelledby="contributions-heading" className="overflow-hidden">
      <SurfaceHeader
        actions={
          requestsHref ? (
            <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href={requestsHref}>
              All requests
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          ) : null
        }
        description="What you have added to the catalogue, and where it stands."
        id="contributions-heading"
        title="Your contributions"
      />
      {children}
    </Surface>
  );
}
