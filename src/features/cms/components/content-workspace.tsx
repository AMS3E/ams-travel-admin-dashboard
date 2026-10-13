"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FilePenLine, ImageIcon, Loader2, PencilLine, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import { hasAnyPermission } from "@/features/auth/permissions";
import { byName } from "@/features/catalog/resources";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import { formatDateTime, formatRelative } from "@/features/dashboard/format";
import {
  DESK_PLURAL_LABELS,
  DESK_REVIEWERS,
  REQUEST_LABELS,
  REQUEST_TONES,
  lastActivityOf,
  type PublishDesk,
  type PublishRequestResponse,
  type RequesterRole,
} from "@/features/publishing/api/contracts";
import { useSubmitPublishRequestMutation } from "@/features/publishing/api/publishing-api";
import { isAuthor, listingLabel, listingPath, listingRows, type ListingRow } from "@/features/publishing/listings";
import { decidesRequest, reviewPageOf, submissionDesk } from "@/features/publishing/workflow";
import { apiErrorMessage } from "@/store/api/api-error";
import { QueryState } from "./query-state";

/** Where a draft stands: waiting on the viewer, with another reviewer, sent back, or with nobody. */
type DraftState = "review" | "waiting" | "returned" | "unsent";
type DraftView = "all" | DraftState;

const VIEWS: readonly { readonly value: DraftView; readonly label: string }[] = [
  { value: "all", label: "All drafts" },
  { value: "review", label: "Waiting for your review" },
  { value: "waiting", label: "With a reviewer" },
  { value: "returned", label: "Sent back for changes" },
  { value: "unsent", label: "Not with a reviewer" },
];

/**
 * Drafts and own content: attractions, stays and food listings not yet live.
 *
 * `desk` brings in what was submitted to the viewer's desk; `own` brings in
 * what the viewer wrote (a partner's stays and food listings: the ones listed
 * in their name). Drafts with neither is every unpublished row the viewer's
 * workspace holds — an administrator's view. `requester` narrows the STAFF
 * desk to an editor's or a BDO's submissions.
 *
 * Each draft shows its photo, where it is, who sent it and when it last
 * changed, and what can be done with it from here: review it and edit it
 * before approving, for the desk that answers it; edit it and send it, for
 * its author.
 */
export function ContentWorkspace({ userId, desk, requester, own = false }: {
  /* Kept so the drafts pages read the same; there is only the drafts view now. */
  readonly view?: "drafts";
  readonly userId: string | null;
  readonly desk?: PublishDesk;
  readonly requester?: RequesterRole;
  readonly own?: boolean;
}) {
  const query = useGetDashboardQuery();
  const { data: user } = useGetCurrentUserQuery();
  const grants = user?.roles ?? [];
  const [search, setSearch] = useState("");
  const [view, setView] = useState<DraftView>("all");
  const data = query.data;
  const submitted = new Set(data?.requests
    ?.filter((request) => request.desk === desk && (!requester || request.requestedByRole === requester))
    .map((request) => request.targetId));
  const latest = latestRequests([...(data?.requests ?? []), ...(data?.mine ?? [])]);
  const everything = !desk && !own;
  /* An author who cannot publish sends a draft to their reviewer from here. */
  const sendsTo = submissionDesk(grants);
  const publishes = hasAnyPermission(grants, ["PERM_DESTINATION_EDIT_ANY", "PERM_FULL_CONTROL"]);

  const stateOf = (item: ListingRow): DraftState => {
    const request = latest.get(item.id);
    if (request?.status === "PENDING_REVIEW") return decidesRequest(grants, request, userId) ? "review" : "waiting";
    if (request?.status === "DRAFT") return "returned";
    /* Never sent, withdrawn, rejected — or approved and since taken off the site. */
    return "unsent";
  };

  /* A to Z, like every list. */
  const drafts = listingRows(data ?? {}).toSorted((a, b) => byName(a.name, b.name)).filter((item) =>
    item.status !== "PUBLISHED" && (everything || (desk && submitted.has(item.id)) || (own && isAuthor(item, userId))));
  const counts = new Map<DraftView, number>([["all", drafts.length]]);
  for (const item of drafts) counts.set(stateOf(item), (counts.get(stateOf(item)) ?? 0) + 1);
  const rows = drafts.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) && (view === "all" || stateOf(item) === view));

  const scope = desk && own
    ? `${DESK_PLURAL_LABELS[desk]} submitted to you, and your own drafts.`
    : desk
      ? `${requester ? `${requester === "EDITOR" ? "Editor" : "BDO"} submissions` : DESK_PLURAL_LABELS[desk]} submitted to your desk and not yet published. Review one to read it in full, edit it and decide.`
      : own
        ? "Your drafts. Edit one, then send it for review when it is ready."
        : null;
  const needsProfile = own && userId === null;

  return <section aria-label="Drafts" className="panel min-w-0 overflow-hidden">
    <Toolbar>
      <SearchField className="max-w-sm" label="Search workspace content" onChange={setSearch} placeholder="Search attractions, stays, food…" value={search} />
      <Select aria-label="Show drafts" className="h-8 w-56 text-sm" onChange={(event) => setView(event.target.value as DraftView)} value={view}>
        {VIEWS.map((option) => (
          <option key={option.value} value={option.value}>{option.label} ({counts.get(option.value) ?? 0})</option>
        ))}
      </Select>
      <span className="ml-auto text-xs text-muted tabular-nums">{rows.length} {rows.length === 1 ? "listing" : "listings"}</span>
    </Toolbar>
    {scope && <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">{scope}</p>}
    {query.isLoading || query.error ? <div className="p-3"><QueryState loading={query.isLoading} error={query.error} retry={query.refetch} /></div> : null}
    {needsProfile && <p role="alert" className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage">Your content profile could not be loaded. Reload this page to try again.</p>}
    {!!data?.failures.length && <p role="alert" className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage">Some workspace data could not be loaded: {data.failures.join(", ")}. Refresh to try again.</p>}
    <ul className="divide-y divide-line">
      {rows.map((item) => (
        <li className="px-4 py-3" key={item.id}>
          <DraftRow
            item={item}
            mine={isAuthor(item, userId)}
            request={latest.get(item.id) ?? null}
            reviews={stateOf(item) === "review"}
            sendsTo={!publishes && isAuthor(item, userId) ? sendsTo : null}
          />
        </li>
      ))}
    </ul>
    {!query.isFetching && !query.isError && !data?.failures.length && !rows.length && !needsProfile && (
      <EmptyState
        description={search ? "Try another name." : view === "review" ? "Nothing is waiting for your decision." : "Unpublished attractions, stays and food listings in your workspace appear here."}
        icon={FilePenLine}
        title="No drafts match this view"
      />
    )}
  </section>;
}

/**
 * One draft: its photo, name and kind, where it is, who sent it and when it
 * last changed, the last word on it, and what to do next.
 */
function DraftRow({ item, mine, request, reviews, sendsTo }: {
  readonly item: ListingRow;
  /** The viewer's own: who it is from goes without saying. */
  readonly mine: boolean;
  readonly request: PublishRequestResponse | null;
  /** Waiting on the viewer's own decision. */
  readonly reviews: boolean;
  /** The desk this author sends it to, when they cannot publish it themselves. */
  readonly sendsTo: PublishDesk | null;
}) {
  const [submit, submission] = useSubmitPublishRequestMutation();
  const [problem, setProblem] = useState<string | null>(null);
  const open = request?.status === "PENDING_REVIEW";
  /* Corrected on the way to a decision, the form comes back to the review. */
  const editHref = reviews && request ? `${listingPath(item)}?review=${request.id}` : listingPath(item);
  /* The name and the photo open what matters most: the review when it waits on the viewer, else the form. */
  const mainHref = reviews && request ? reviewPageOf(request) : editHref;

  async function send(desk: PublishDesk) {
    setProblem(null);
    try {
      await submit({ targetType: item.type, targetId: item.id }).unwrap();
    } catch (error) {
      setProblem(`It could not be sent to ${DESK_REVIEWERS[desk]}: ${apiErrorMessage(error)}`);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Link aria-hidden className="relative hidden h-14 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-sand-deep sm:block" href={mainHref} tabIndex={-1}>
        {item.cover ? (
          <Image alt="" className="object-cover" fill sizes="80px" src={item.cover} unoptimized />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-4 text-muted" strokeWidth={1.75} />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link className="min-w-0 truncate text-sm font-medium text-ink hover:text-teal-deep hover:underline" href={mainHref}>
            {item.name}
          </Link>
          <Badge tone="neutral">{listingLabel(item.type)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {[item.detail || "No address yet", !mine && request?.requestedByName ? `from ${request.requestedByName}` : null].filter(Boolean).join(" · ")}
          {item.updatedAt ? (
            <>
              {" · "}
              <time dateTime={item.updatedAt} title={formatDateTime(item.updatedAt)}>changed {formatRelative(item.updatedAt)}</time>
            </>
          ) : null}
        </p>
        {request?.reviewNote && request.status !== "PUBLISHED" ? (
          <p className="mt-2 line-clamp-2 rounded-md bg-sand px-3 py-1.5 text-sm text-ink-soft">
            <span className="font-medium text-ink">{open ? "Earlier feedback" : "Feedback"}{request.reviewerName ? ` from ${request.reviewerName}` : ""}:</span>{" "}
            {request.reviewNote}
          </p>
        ) : null}
        {problem ? <p className="mt-2 text-xs font-medium text-heritage" role="alert">{problem}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {request && request.status !== "PUBLISHED" ? (
          <Badge dot tone={REQUEST_TONES[request.status]}>{REQUEST_LABELS[request.status]}</Badge>
        ) : (
          <Badge dot tone="neutral">{item.status === "ARCHIVED" ? "Archived" : "Not sent"}</Badge>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {reviews && request ? (
            <Link className={buttonVariants({ size: "sm" })} href={reviewPageOf(request)}>
              Review
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          ) : request && open ? (
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={reviewPageOf(request)}>
              View request
            </Link>
          ) : null}
          <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={editHref}>
            <PencilLine aria-hidden className="size-3.5" />
            Edit
          </Link>
          {sendsTo && !open ? (
            <Button disabled={submission.isLoading} onClick={() => void send(sendsTo)} size="sm" type="button">
              {submission.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Send aria-hidden className="size-3.5" />}
              {request?.status === "DRAFT" ? "Send again" : "Send for review"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Each listing's most recent request, from the queue and the viewer's own submissions together. */
function latestRequests(requests: readonly PublishRequestResponse[]): ReadonlyMap<string, PublishRequestResponse> {
  const latest = new Map<string, PublishRequestResponse>();
  for (const request of requests) {
    const current = latest.get(request.targetId);
    if (!current || Date.parse(lastActivityOf(request)) > Date.parse(lastActivityOf(current))) {
      latest.set(request.targetId, request);
    }
  }
  return latest;
}
