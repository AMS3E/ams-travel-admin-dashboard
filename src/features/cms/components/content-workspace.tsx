"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import {
  REQUEST_TONES,
  lastActivityOf,
  type PublishDesk,
  type PublishRequestResponse,
  type RequesterRole,
} from "@/features/publishing/api/contracts";
import { useSubmitPublishRequestMutation } from "@/features/publishing/api/publishing-api";
import { isAuthor, listingPath, listingRows, type ListingRow } from "@/features/publishing/listings";
import { decidesRequest, reviewPageOf, submissionDesk } from "@/features/publishing/workflow";
import { useDates } from "@/i18n/use-dates";
import { useApiErrorMessage } from "@/store/api/api-error";
import { QueryState } from "./query-state";

/** Where a draft stands: waiting on the viewer, with another reviewer, sent back, or with nobody. */
type DraftState = "review" | "waiting" | "returned" | "unsent";
type DraftView = "all" | DraftState;

const VIEWS: readonly DraftView[] = ["all", "review", "waiting", "returned", "unsent"];

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
  const t = useTranslations("cms");
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
    ? t("drafts.scopeDeskAndOwn", { desk: t(`deskPlural.${desk}`) })
    : desk
      ? t("drafts.scopeDesk", { what: requester ? t(`drafts.submissions.${requester === "EDITOR" ? "EDITOR" : "BDO"}`) : t(`deskPlural.${desk}`) })
      : own
        ? t("drafts.scopeOwn")
        : null;
  const needsProfile = own && userId === null;

  return <section aria-label={t("drafts.label")} className="panel min-w-0 overflow-hidden">
    <Toolbar>
      <SearchField className="max-w-sm" label={t("drafts.search")} onChange={setSearch} placeholder={t("drafts.searchPlaceholder")} value={search} />
      <Select aria-label={t("drafts.show")} className="h-8 w-56 text-sm" onChange={(event) => setView(event.target.value as DraftView)} value={view}>
        {VIEWS.map((option) => (
          <option key={option} value={option}>{t(`drafts.views.${option}`)} ({counts.get(option) ?? 0})</option>
        ))}
      </Select>
      <span className="ml-auto text-xs text-muted tabular-nums">{t("listings", { count: rows.length })}</span>
    </Toolbar>
    {scope && <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">{scope}</p>}
    {query.isLoading || query.error ? <div className="p-3"><QueryState loading={query.isLoading} error={query.error} retry={query.refetch} /></div> : null}
    {needsProfile && <p role="alert" className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage">{t("drafts.noProfile")}</p>}
    {!!data?.failures.length && <p role="alert" className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage">{t("drafts.failures", { list: data.failures.join(", ") })}</p>}
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
        description={search ? t("drafts.empty.search") : view === "review" ? t("drafts.empty.review") : t("drafts.empty.none")}
        icon={FilePenLine}
        title={t("drafts.empty.title")}
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
  const t = useTranslations("cms");
  const publishing = useTranslations("publishing");
  const { relative, dateTime } = useDates();
  const errorMessage = useApiErrorMessage();
  const [submit, submission] = useSubmitPublishRequestMutation();
  const [problem, setProblem] = useState<string | null>(null);
  const open = request?.status === "PENDING_REVIEW";
  /* Corrected on the way to a decision, the form comes back to the review. */
  const editHref = reviews && request ? `${listingPath(item)}?review=${request.id}` : listingPath(item);
  /* The name and the photo open what matters most: the review when it waits on the viewer, else the form. */
  const mainHref = reviews && request ? reviewPageOf(request) : editHref;
  const feedback = open ? t("drafts.feedback.earlier") : t("drafts.feedback.label");

  async function send(desk: PublishDesk) {
    setProblem(null);
    try {
      await submit({ targetType: item.type, targetId: item.id }).unwrap();
    } catch (error) {
      setProblem(t("drafts.sendFailed", { reviewer: t(`reviewer.${desk}`), problem: errorMessage(error) }));
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
          <Badge tone="neutral">{t(`listing.${item.type}`)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {[item.detail || t("drafts.noAddress"), !mine && request?.requestedByName ? t("drafts.from", { name: request.requestedByName }) : null].filter(Boolean).join(" · ")}
          {item.updatedAt ? (
            <>
              {" · "}
              <time dateTime={item.updatedAt} title={dateTime(item.updatedAt)}>{t("drafts.changed", { when: relative(item.updatedAt) })}</time>
            </>
          ) : null}
        </p>
        {request?.reviewNote && request.status !== "PUBLISHED" ? (
          <p className="mt-2 line-clamp-2 rounded-md bg-sand px-3 py-1.5 text-sm text-ink-soft">
            <span className="font-medium text-ink">
              {request.reviewerName
                ? t("drafts.feedback.from", { label: feedback, name: request.reviewerName })
                : t("drafts.feedback.plain", { label: feedback })}
            </span>{" "}
            {request.reviewNote}
          </p>
        ) : null}
        {problem ? <p className="mt-2 text-xs font-medium text-heritage" role="alert">{problem}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {request && request.status !== "PUBLISHED" ? (
          <Badge dot tone={REQUEST_TONES[request.status]}>{publishing(`status.${request.status}`)}</Badge>
        ) : (
          <Badge dot tone="neutral">{item.status === "ARCHIVED" ? t("status.ARCHIVED") : t("drafts.notSent")}</Badge>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {reviews && request ? (
            <Link className={buttonVariants({ size: "sm" })} href={reviewPageOf(request)}>
              {t("drafts.review")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          ) : request && open ? (
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={reviewPageOf(request)}>
              {t("drafts.viewRequest")}
            </Link>
          ) : null}
          <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={editHref}>
            <PencilLine aria-hidden className="size-3.5" />
            {t("drafts.edit")}
          </Link>
          {sendsTo && !open ? (
            <Button disabled={submission.isLoading} onClick={() => void send(sendsTo)} size="sm" type="button">
              {submission.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Send aria-hidden className="size-3.5" />}
              {request?.status === "DRAFT" ? t("drafts.sendAgain") : t("drafts.send")}
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
