"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { hasAnyPermission, hasPermission } from "@/features/auth/permissions";
import { DESK_LABELS } from "../api/contracts";
import { useGetPublishRequestsQuery } from "../api/publishing-api";
import { readSeenAt, subscribeToSeen, writeSeenAt } from "../seen";
import {
  PUBLISH_REQUEST_POLL_INTERVAL,
  publishingHref,
  requestPageOf,
  reviewQueueHref,
  seenMark,
  unseenRequests,
} from "../workflow";

/**
 * The bell in the top bar.
 *
 * The red badge counts what has arrived since this account last looked, so
 * looking clears it — opening the bell, following one of its links, or simply
 * being on the requests page. What is still waiting does not disappear with
 * it: the count stays on the bell in grey and in the panel's heading, because
 * a desk with five requests open should still see five.
 */
export function PublishingNotifications({ grants, accountId, open, onToggle, onClose }: {
  readonly grants: readonly string[];
  /** Whose marks these are: two people sharing a browser keep their own. */
  readonly accountId: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}) {
  const canReview = hasAnyPermission(grants, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"]);
  const enabled = canReview || hasPermission(grants, "PERM_PUBLISH_REQUEST_SUBMIT");
  const query = useGetPublishRequestsQuery({ mine: !canReview }, {
    skip: !enabled,
    pollingInterval: PUBLISH_REQUEST_POLL_INTERVAL,
    skipPollingIfUnfocused: true,
    refetchOnMountOrArgChange: true,
  });
  /* undefined until the browser has been asked; null when this account has never looked. */
  const seenAt = useSyncExternalStore(
    subscribeToSeen,
    useCallback(() => readSeenAt(accountId), [accountId]),
    () => undefined,
  );
  const pathname = usePathname();
  /* A reviewer is sent to the queue they answer — a BDO to Partner Requests — and each request to its own desk's page. */
  const href = (canReview ? reviewQueueHref(grants) : null) ?? publishingHref(grants);
  const pending = query.data?.filter((item) => item.status === "PENDING_REVIEW");
  const unseen = query.isError ? [] : unseenRequests(pending ?? [], seenAt);
  /*
   * Each request's link — its review, beside the listing, under its own desk —
   * and standing on that desk's page, or on the review, is looking at it too. Worked out here, before the callback, so the
   * compiler can keep that memoised.
   */
  const links: Record<string, string> = {};
  let onItsPage = false;
  for (const item of pending ?? []) {
    const page = requestPageOf(item);
    links[item.id] = `${page}/${item.id}`;
    onItsPage ||= pathname === page || pathname === links[item.id];
  }

  const markSeen = useCallback(() => {
    const mark = seenMark(pending ?? []);
    if (!mark || mark === seenAt) return;
    writeSeenAt(accountId, mark);
  }, [accountId, pending, seenAt]);

  /* Open the bell, or stand on the requests page, and the queue has been looked at. */
  const looking = open || pathname === href || pathname.startsWith(`${href}/`) || onItsPage;
  useEffect(() => {
    if (looking) markSeen();
  }, [looking, markSeen]);

  if (!enabled) return null;

  const waiting = pending?.length ?? 0;
  const badge = unseen.length || waiting;
  const label = [
    unseen.length ? `${unseen.length} new` : null,
    waiting ? `${waiting} pending` : null,
  ].filter(Boolean);

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-label={`Publishing notifications${label.length ? ` (${label.join(", ")})` : ""}`}
        className={`relative grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink ${open ? "bg-sand-deep text-ink" : ""}`}
        onClick={onToggle}
        type="button"
      >
        <Bell aria-hidden className="size-4" strokeWidth={1.75} />
        {badge ? (
          <span
            className={`absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold ring-2 ring-paper ${
              unseen.length ? "bg-destructive text-white" : "bg-sand-deep text-ink-soft"
            }`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="glass absolute top-10 right-0 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-line shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <p className="text-sm font-semibold text-ink">{canReview ? "Awaiting your review" : "Awaiting a reviewer"}</p>
            {waiting ? <span className="text-xs text-muted tabular-nums">{waiting} pending</span> : null}
          </div>
          {query.isError ? (
            <div className="px-3 py-3 text-sm text-muted" role="alert">
              Publishing notifications are unavailable.{" "}
              <button className="font-medium text-teal-deep hover:underline" onClick={() => void query.refetch()} type="button">
                Retry
              </button>
            </div>
          ) : waiting && pending ? (
            <>
              <ul className="divide-y divide-line">
                {pending.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link
                      className="block px-3 py-2.5 transition-colors hover:bg-sand"
                      href={links[item.id] ?? href}
                      onClick={() => {
                        markSeen();
                        onClose();
                      }}
                    >
                      <span className="block truncate text-sm font-medium text-ink">{item.targetName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {item.requestedByName ?? "Unknown account"} · {DESK_LABELS[item.desk]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-3 py-2">
                <Link
                  className="text-sm font-medium text-teal-deep hover:underline"
                  href={href}
                  onClick={() => {
                    markSeen();
                    onClose();
                  }}
                >
                  View all requests
                </Link>
              </div>
            </>
          ) : (
            <p className="px-3 py-4 text-sm text-muted">{query.isLoading ? "Loading notifications…" : "You're all caught up."}</p>
          )}
        </div>
      ) : null}

      <div aria-atomic="true" aria-live="polite" role="status">
        {canReview && unseen.length > 0 && !open ? (
          <div className="glass fixed top-16 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-line p-3 shadow-pop">
            <div className="flex items-start gap-3">
              <Bell aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {unseen.length} publishing {unseen.length === 1 ? "request" : "requests"} awaiting review
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {unseen[0].requestedByName ?? "Somebody"} submitted {unseen[0].targetName}.
                </p>
                <Link
                  className="mt-2 inline-block text-sm font-medium text-teal-deep hover:underline"
                  href={links[unseen[0].id] ?? href}
                  onClick={() => {
                    markSeen();
                    onClose();
                  }}
                >
                  Review requests
                </Link>
              </div>
              <button
                aria-label="Dismiss publishing alert"
                className="grid size-6 place-items-center rounded-md text-muted hover:bg-sand-deep hover:text-ink"
                onClick={markSeen}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
