"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import { DESK_REVIEWERS, type PublishDesk, type PublishRequestResponse } from "../api/contracts";
import { useSubmitPublishRequestMutation } from "../api/publishing-api";
import { listingLabel, listingPath, listingRows, type ListingRow } from "../listings";
import { submittableListings } from "../workflow";

/**
 * The account's own drafts — attractions, stays and food listings — that can
 * go to their reviewer, each with its own Submit. The dashboard read already
 * holds them, scoped to this account; a decision made in another session
 * reaches it when the requests do.
 */
export function RequestDrafts({ userId, desk, approvesOwn = false, requests, refreshing, onSubmitted }: {
  readonly userId: string | null;
  readonly desk: PublishDesk;
  /** This desk answers its own: an editor and a BDO publish what they write. */
  readonly approvesOwn?: boolean;
  readonly requests: readonly PublishRequestResponse[];
  readonly refreshing: boolean;
  readonly onSubmitted: () => void;
}) {
  const workspace = useGetDashboardQuery(undefined, { skip: userId === null, refetchOnMountOrArgChange: true });
  const { refetch } = workspace;
  useEffect(() => {
    // A reviewer can publish in another session while this page stays open.
    if (userId !== null) void refetch();
  }, [requests, userId, refetch]);
  const [submit, mutation] = useSubmitPublishRequestMutation();
  const [submitted, setSubmitted] = useState("");
  const reviewer = DESK_REVIEWERS[desk];
  const drafts = submittableListings(listingRows(workspace.data ?? {}), requests, userId);

  async function send(listing: ListingRow) {
    setSubmitted("");
    try {
      const result = await submit({ targetType: listing.type, targetId: listing.id }).unwrap();
      setSubmitted(approvesOwn
        ? `${listing.name} submitted. Open it below to approve and publish it.`
        : `${listing.name} submitted to ${DESK_REVIEWERS[result.desk] ?? reviewer} for review.`);
      onSubmitted();
    } catch {
      // QueryState displays the API error while the draft stays available.
    }
  }

  return (
    <section id="request-drafts" aria-labelledby="request-drafts-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="request-drafts-title" className="text-lg font-semibold text-ink">Ready to submit</h2>
          <p className="mt-0.5 text-sm text-muted">
            New attractions, stays and food listings appear here as drafts.{" "}
            {approvesOwn ? "Submit one when it is ready, then approve it yourself." : `Submit to ${reviewer} when your content is ready.`}
          </p>
        </div>
        <Link href="/create" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Plus className="size-3.5" />New destination
        </Link>
      </div>
      {submitted && <p role="status" className="rounded-md border border-success/20 bg-success-soft px-3 py-2.5 text-sm text-success">{submitted}</p>}
      {userId === null ? <p role="alert" className="text-sm text-heritage">Your content profile could not be loaded. Reload this page to try again.</p> : (
        <QueryState loading={workspace.isLoading} error={workspace.error ?? mutation.error} retry={workspace.refetch} />
      )}
      {!workspace.isError && drafts.map((listing) => {
        const returned = requests.find((item) => item.targetId === listing.id && item.status === "DRAFT");
        return (
          <form key={listing.id} className="panel flex flex-col gap-2.5 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void send(listing); }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={listingPath(listing)} className="text-sm font-medium text-ink hover:text-teal-deep hover:underline">{listing.name}</Link>
                {listing.detail && <p className="text-xs text-muted">{listing.detail}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge tone="neutral">{listingLabel(listing.type)}</Badge>
                <Badge dot tone={returned ? "warning" : "neutral"}>{returned ? "Changes requested" : listing.status === "ARCHIVED" ? "Archived" : "Draft"}</Badge>
              </span>
            </div>
            {listing.summary && <p className="line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{listing.summary}</p>}
            {returned?.reviewNote && <p className="rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">Reviewer feedback: {returned.reviewNote}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={listingPath(listing)} className={buttonVariants({ variant: "secondary", size: "sm" })}>Review content</Link>
              <Button type="submit" size="sm" disabled={mutation.isLoading || refreshing || workspace.isFetching}>
                {mutation.isLoading && mutation.originalArgs?.targetId === listing.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {returned ? "Resubmit" : "Submit"}{approvesOwn ? " for publishing" : ` to ${reviewer}`}
              </Button>
            </div>
          </form>
        );
      })}
      {userId !== null && !workspace.isFetching && !workspace.isError && !drafts.length && <p className="panel px-4 py-6 text-center text-sm text-muted">Nothing is waiting to be submitted. Create an attraction, a stay or a food listing to start a new request.</p>}
    </section>
  );
}
