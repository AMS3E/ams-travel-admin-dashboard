"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/toolbar";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import { hasAnyPermission, hasPermission, reviewsDesk } from "@/features/auth/permissions";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import { formatDateTime, formatRelative } from "@/features/dashboard/format";
import {
  REQUEST_LABELS,
  REQUEST_TONES,
  isAwaitingDecision,
  type PublishDesk,
  type PublishRequestResponse,
  type RequesterRole,
} from "../api/contracts";
import { useGetPublishRequestsQuery } from "../api/publishing-api";
import { listingLabel, listingRows, type ListingRow } from "../listings";
import { PUBLISH_REQUEST_POLL_INTERVAL, decidesRequest, reviewPageOf, submissionDesk } from "../workflow";
import { RequestDrafts } from "./request-drafts";

/**
 * A desk's requests, from where the viewer stands. The desk that answers them
 * sees a queue: each listing with its photo, where it is and who sent it, and
 * Review — the decision is made beside the listing itself, never on a name
 * alone. The account that sent them sees its drafts ready to send, then what
 * it sent and what became of it.
 */
export function PublishRequestsPage({ desk, deskPage, requester, userId = null, approvalsOnly = false }: {
  readonly desk?: PublishDesk;
  /** The desk's own pages — `partner`, `contributor`, `editor`, `bdo` — for the link to its record. */
  readonly deskPage?: string;
  /** On an editor's or a BDO's page: only that role's requests, though both share the STAFF desk. */
  readonly requester?: RequesterRole;
  readonly userId?: string | null;
  readonly approvalsOnly?: boolean;
}) {
  const { data: user, isLoading: loadingUser } = useGetCurrentUserQuery();
  const grants = user?.roles ?? [];
  /*
   * Whose side of this desk the viewer is on. An editor reviews contributor
   * drafts but submits to the staff desk, a BDO reviews partner listings but
   * submits to the staff desk — so the answer is per desk, not per account.
   */
  const canReview = desk
    ? reviewsDesk(grants, desk)
    : hasAnyPermission(grants, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"]);
  const [tab, setTab] = useState(approvalsOnly ? "PENDING_REVIEW" : "all");
  const draftDesk = submissionDesk(grants);
  const showDrafts = !canReview && draftDesk !== null && (!desk || desk === draftDesk) && !approvalsOnly;
  const query = useGetPublishRequestsQuery(
    { mine: !canReview },
    { skip: !user, pollingInterval: PUBLISH_REQUEST_POLL_INTERVAL, skipPollingIfUnfocused: true, refetchOnMountOrArgChange: true },
  );
  /* The listings themselves, for each row's photo and address. */
  const workspace = useGetDashboardQuery(undefined, { skip: !user });

  const listings = new Map(listingRows(workspace.data ?? {}).map((row) => [row.id, row]));
  const onThisPage = (query.data ?? []).filter((item) =>
    (!desk || item.desk === desk) && (!requester || item.requestedByRole === requester));
  /*
   * A Requests page is the work still in hand, on either side of the desk. A
   * published request has done its work: the listing is live, and the record of
   * the decision is on All List Approvals. Only that page keeps them.
   */
  const hidesApproved = !approvalsOnly;
  const ofDesk = hidesApproved ? onThisPage.filter((item) => item.status !== "PUBLISHED") : onThisPage;
  const approved = hidesApproved ? onThisPage.length - ofDesk.length : 0;
  const rows = ofDesk.filter((item) => tab === "all" || item.status === tab || (tab === "PENDING_REVIEW" && isAwaitingDecision(item)));
  const counts = new Map<string, number>([["all", ofDesk.length]]);
  for (const item of ofDesk) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-4">
      {showDrafts && draftDesk && query.data && !query.isError && (
        <RequestDrafts
          approvesOwn={hasPermission(grants, "PERM_DESTINATION_PUBLISH")}
          desk={draftDesk}
          onSubmitted={() => setTab("all")}
          refreshing={query.isFetching}
          requests={query.data}
          userId={userId}
        />
      )}
      {showDrafts && <h2 className="text-lg font-semibold text-ink">Submitted requests</h2>}
      <section aria-label="Publish requests" className="panel min-w-0 overflow-hidden">
        <Toolbar>
          <Select
            aria-label="Filter publish requests"
            className="h-8 w-48 text-sm"
            value={tab}
            onChange={(event) => setTab(event.target.value)}
          >
            <option value="all">All requests ({counts.get("all") ?? 0})</option>
            <option value="PENDING_REVIEW">Pending review ({counts.get("PENDING_REVIEW") ?? 0})</option>
            <option value="DRAFT">Changes requested ({counts.get("DRAFT") ?? 0})</option>
            {hidesApproved ? null : <option value="PUBLISHED">Published ({counts.get("PUBLISHED") ?? 0})</option>}
            <option value="REJECTED">Rejected ({counts.get("REJECTED") ?? 0})</option>
            <option value="UNPUBLISHED">Unpublished ({counts.get("UNPUBLISHED") ?? 0})</option>
          </Select>
          <span className="text-xs text-muted tabular-nums">{rows.length} shown</span>
        </Toolbar>
        {approved ? (
          <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">
            {approved === 1 ? "1 approved listing is" : `${approved} approved listings are`} live on the website and{" "}
            {approved === 1 ? "is" : "are"} no longer listed here: find {approved === 1 ? "it" : "them"} in{" "}
            {canReview && deskPage ? (
              <Link className="font-medium text-teal-deep hover:underline" href={`/${deskPage}-listing-approvals`}>All List Approvals</Link>
            ) : (
              <Link className="font-medium text-teal-deep hover:underline" href="/destinations">All Destinations</Link>
            )}
            .
          </p>
        ) : null}
        {query.isLoading || loadingUser || query.error ? (
          <div className="p-3">
            <QueryState
              loading={query.isLoading || loadingUser}
              error={query.error}
              retry={query.refetch}
            />
          </div>
        ) : null}
        <div className="divide-y divide-line">
          {rows.map((item) => (
            <article key={item.id} id={`request-${item.id}`} className="scroll-mt-20 px-4 py-3 target:bg-teal-soft/40">
              <RequestRow
                decides={decidesRequest(grants, item, userId)}
                item={item}
                listing={listings.get(item.targetId)}
              />
            </article>
          ))}
        </div>
        {!query.isFetching && !query.isError && !rows.length && (
          <EmptyState
            description={
              tab === "all" && approved && canReview
                ? "Everything sent to your desk has been answered. Approved listings are on All List Approvals."
                : tab === "all" && approved
                ? "Everything you sent has been approved. Send another draft when it is ready."
                : tab === "all"
                ? "Requests appear here once an attraction, a stay or a food listing is sent for review."
                : tab === "PENDING_REVIEW" && !hidesApproved && (counts.get("PUBLISHED") ?? 0) > 0
                  ? `Nothing is waiting for a decision. Choose Published to see the ${counts.get("PUBLISHED")} already live.`
                  : "Nothing has this status yet. Choose another one, or All requests."
            }
            icon={Inbox}
            title={tab === "all" && approved ? (canReview ? "Your queue is clear" : "Nothing in progress") : tab === "PENDING_REVIEW" ? "Your queue is clear" : "No publish requests in this view"}
          />
        )}
      </section>
    </div>
  );
}

/**
 * One request: the listing's photo and name, what it is, where, who sent it
 * and when, the last word on it, and where to read it in full. A reviewer's
 * pending request says Review; everything else says View.
 */
function RequestRow({ item, listing, decides }: {
  readonly item: PublishRequestResponse;
  readonly listing: ListingRow | undefined;
  readonly decides: boolean;
}) {
  const href = reviewPageOf(item);
  return (
    <div className="flex items-start gap-3">
      <Link
        aria-hidden
        className="relative hidden h-14 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-sand-deep sm:block"
        href={href}
        tabIndex={-1}
      >
        {listing?.cover ? (
          <Image alt="" className="object-cover" fill sizes="80px" src={listing.cover} unoptimized />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-4 text-muted" strokeWidth={1.75} />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link className="min-w-0 truncate text-sm font-medium text-ink hover:text-teal-deep hover:underline" href={href}>
            {item.targetName}
          </Link>
          <Badge tone="neutral">{listingLabel(item.targetType)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {[listing?.detail, item.requestedByName ?? "Unknown account"].filter(Boolean).join(" · ")}
          {" · "}
          <time dateTime={item.requestedAt} title={formatDateTime(item.requestedAt)}>sent {formatRelative(item.requestedAt)}</time>
        </p>
        {item.reviewNote ? (
          <p className="mt-2 line-clamp-2 rounded-md bg-sand px-3 py-1.5 text-sm text-ink-soft">
            <span className="font-medium text-ink">
              {item.status === "PENDING_REVIEW" ? "Earlier feedback" : "Decision"}
              {item.reviewerName ? ` from ${item.reviewerName}` : ""}:
            </span>{" "}
            {item.reviewNote}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge dot tone={REQUEST_TONES[item.status]}>{REQUEST_LABELS[item.status]}</Badge>
        <Link className={buttonVariants({ size: "sm", variant: decides ? "default" : "secondary" })} href={href}>
          {decides ? "Review" : "View"}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
