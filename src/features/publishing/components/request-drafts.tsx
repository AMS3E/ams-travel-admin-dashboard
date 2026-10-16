"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import type { PublishDesk, PublishRequestResponse } from "../api/contracts";
import { useSubmitPublishRequestMutation } from "../api/publishing-api";
import { listingPath, listingRows, type ListingRow } from "../listings";
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
  const t = useTranslations("publishing");
  const workspace = useGetDashboardQuery(undefined, { skip: userId === null, refetchOnMountOrArgChange: true });
  const { refetch } = workspace;
  useEffect(() => {
    // A reviewer can publish in another session while this page stays open.
    if (userId !== null) void refetch();
  }, [requests, userId, refetch]);
  const [submit, mutation] = useSubmitPublishRequestMutation();
  const [submitted, setSubmitted] = useState("");
  const reviewer = t(`reviewer.${desk}`);
  const drafts = submittableListings(listingRows(workspace.data ?? {}), requests, userId);

  async function send(listing: ListingRow) {
    setSubmitted("");
    try {
      const result = await submit({ targetType: listing.type, targetId: listing.id }).unwrap();
      setSubmitted(approvesOwn
        ? t("drafts.submittedOwn", { name: listing.name })
        : t("drafts.submittedTo", { name: listing.name, reviewer: result.desk ? t(`reviewer.${result.desk}`) : reviewer }));
      onSubmitted();
    } catch {
      // QueryState displays the API error while the draft stays available.
    }
  }

  return (
    <section id="request-drafts" aria-labelledby="request-drafts-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="request-drafts-title" className="text-lg font-semibold text-ink">{t("drafts.title")}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {t("drafts.intro")}{" "}
            {approvesOwn ? t("drafts.introOwn") : t("drafts.introTo", { reviewer })}
          </p>
        </div>
        <Link href="/create" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Plus className="size-3.5" />{t("drafts.newDestination")}
        </Link>
      </div>
      {submitted && <p role="status" className="rounded-md border border-success/20 bg-success-soft px-3 py-2.5 text-sm text-success">{submitted}</p>}
      {userId === null ? <p role="alert" className="text-sm text-heritage">{t("drafts.profileError")}</p> : (
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
                <Badge tone="neutral">{t(`listing.${listing.type}`)}</Badge>
                <Badge dot tone={returned ? "warning" : "neutral"}>{returned ? t("status.DRAFT") : listing.status === "ARCHIVED" ? t("drafts.archived") : t("drafts.draft")}</Badge>
              </span>
            </div>
            {listing.summary && <p className="line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{listing.summary}</p>}
            {returned?.reviewNote && <p className="rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">{t("drafts.feedback", { note: returned.reviewNote })}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={listingPath(listing)} className={buttonVariants({ variant: "secondary", size: "sm" })}>{t("drafts.reviewContent")}</Link>
              <Button type="submit" size="sm" disabled={mutation.isLoading || refreshing || workspace.isFetching}>
                {mutation.isLoading && mutation.originalArgs?.targetId === listing.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {approvesOwn
                  ? t(returned ? "drafts.resubmitOwn" : "drafts.submitOwn")
                  : t(returned ? "drafts.resubmitTo" : "drafts.submitTo", { reviewer })}
              </Button>
            </div>
          </form>
        );
      })}
      {userId !== null && !workspace.isFetching && !workspace.isError && !drafts.length && <p className="panel px-4 py-6 text-center text-sm text-muted">{t("drafts.empty")}</p>}
    </section>
  );
}
